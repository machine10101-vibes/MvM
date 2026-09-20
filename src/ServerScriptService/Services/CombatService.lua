local Debris = game:GetService("Debris")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Constants = require(game.ReplicatedStorage.Shared.Constants)
local MechConfig = require(game.ReplicatedStorage.Shared.MechConfig)
local Remotes = require(game.ReplicatedStorage.Shared.Remotes)
local Util = require(game.ReplicatedStorage.Shared.Util)

local CombatService = {}

local states = {} -- [player] = state
local partToState = {}
local lingerZones = {}
local destroyedListeners = {}

local speedMul

local function isPlayerOwner(owner)
	return typeof(owner) == "Instance" and owner:IsA("Player")
end

local function notify(player, text, kind)
	Remotes.fire("Notify", player, { text = text, kind = kind or "info" })
end

local function pushState(player)
	local st = states[player]
	if not st then
		Remotes.fire("MechState", player, { active = false })
		return
	end
	Remotes.fire("MechState", player, {
		active = true,
		seated = st.seated,
		mechId = st.mechId,
		name = st.config.name,
		health = st.health,
		maxHealth = st.maxHealth,
		ammo = st.ammo,
		reloading = st.reloading,
		cooldowns = st.cooldowns,
		buffs = st.buffs,
		selected = st.selected,
		cloaked = st.cloaked,
		speedMul = speedMul(st),
	})
end

local function readyAt(st, key)
	return (st.cooldowns[key] or 0) <= Util.now()
end

local function setCooldown(st, key, seconds)
	st.cooldowns[key] = Util.now() + seconds
end

local function rpmDelay(weapon)
	if weapon.cooldown then
		return weapon.cooldown
	end
	local rpm = weapon.rpm or 60
	return 60 / math.max(rpm, 1)
end

local function ignoreList(st)
	local list = { st.model }
	if isPlayerOwner(st.owner) and st.owner.Character then
		table.insert(list, st.owner.Character)
	end
	return list
end

local function spawnFlash(cf, color, size)
	local p = Util.part({
		Name = "MuzzleFlash",
		Size = size or Vector3.new(1.4, 1.4, 3),
		CFrame = cf,
		Color = color or Color3.fromRGB(255, 200, 80),
		Material = Enum.Material.Neon,
		Anchored = true,
		CanCollide = false,
		Parent = Workspace,
	})
	Debris:AddItem(p, 0.12)
end

local function spawnBoom(pos, radius, color)
	local p = Util.part({
		Name = "Boom",
		Shape = Enum.PartType.Ball,
		Size = Vector3.new(radius, radius, radius) * 1.4,
		CFrame = CFrame.new(pos),
		Color = color or Color3.fromRGB(255, 140, 40),
		Material = Enum.Material.Neon,
		Anchored = true,
		CanCollide = false,
		Transparency = 0.25,
		Parent = Workspace,
	})
	Debris:AddItem(p, 0.35)
end

local function tracer(origin, hit, color)
	local delta = hit - origin
	local len = math.max(delta.Magnitude, 0.5)
	local p = Util.part({
		Name = "Tracer",
		Size = Vector3.new(0.18, 0.18, len),
		CFrame = CFrame.lookAt(origin + delta.Unit * (len / 2), hit),
		Color = color or Color3.fromRGB(255, 220, 90),
		Material = Enum.Material.Neon,
		Anchored = true,
		CanCollide = false,
		Parent = Workspace,
	})
	Debris:AddItem(p, 0.08)
end

local function damageMul(st)
	local m = 1
	for _, b in pairs(st.buffs) do
		if b.damageMul then
			m *= b.damageMul
		end
	end
	return m
end

local function takenMul(st, incomingDir)
	local m = 1
	for _, b in pairs(st.buffs) do
		if b.damageTakenMul then
			if b.frontal and incomingDir then
				local look = st.model.PrimaryPart.CFrame.LookVector
				if look:Dot(-incomingDir) > 0.25 then
					m *= b.damageTakenMul
				end
			else
				m *= b.damageTakenMul
			end
		end
	end
	return m
end

speedMul = function(st)
	local m = 1
	for _, b in pairs(st.buffs) do
		if b.speedMul then
			m *= b.speedMul
		end
	end
	if st.firingSlowUntil and Util.now() < st.firingSlowUntil then
		m *= st.firingSlowMul or 0.2
	end
	return m
end

function CombatService.speedMultiplier(player)
	local st = states[player]
	return st and speedMul(st) or 1
end

function CombatService.getState(player)
	return states[player]
end

function CombatService.getByModel(model)
	for _, st in pairs(states) do
		if st.model == model then
			return st
		end
	end
	return nil
end

local function lifesteal(st, amount)
	local steal = 0
	for _, b in pairs(st.buffs) do
		if b.lifesteal then
			steal += amount * b.lifesteal
		end
	end
	if steal > 0 then
		st.health = math.min(st.maxHealth, st.health + steal)
		st.model:SetAttribute(Constants.HealthAttr, st.health)
	end
end

function CombatService.dealDamage(attackerState, victimState, amount, weaponId, hitPos)
	if not victimState or victimState.dead then
		return
	end
	if attackerState and attackerState.owner == victimState.owner then
		return
	end

	local dir
	if hitPos and victimState.model.PrimaryPart then
		dir = Util.unit(hitPos - victimState.model.PrimaryPart.Position)
	end
	local dealt = math.max(1, math.floor(amount * takenMul(victimState, dir)))
	victimState.health = math.max(0, victimState.health - dealt)
	victimState.model:SetAttribute(Constants.HealthAttr, victimState.health)

	if attackerState then
		lifesteal(attackerState, dealt)
		pushState(attackerState.owner)
	end
	pushState(victimState.owner)

	Remotes.fireAll("VfxEvent", {
		kind = "hit",
		position = hitPos or victimState.model.PrimaryPart.Position,
		amount = dealt,
	})

	if victimState.health <= 0 then
		CombatService.destroyMech(victimState.owner, attackerState and attackerState.owner, weaponId)
	end
end

local function aoeAt(attacker, pos, radius, damage, weaponId)
	for _, st in pairs(states) do
		if st.model and st.model.PrimaryPart and not st.dead then
			if (st.model.PrimaryPart.Position - pos).Magnitude <= radius then
				CombatService.dealDamage(attacker, st, damage, weaponId, pos)
				if attacker and attacker.model == st.model then
					-- self splash reduced already by same-owner check
				end
			end
		end
	end
end

local function addLinger(attacker, pos, radius, dps, life, color)
	table.insert(lingerZones, {
		owner = attacker,
		pos = pos,
		radius = radius,
		dps = dps,
		untilTime = Util.now() + life,
		color = color,
	})
	local p = Util.part({
		Name = "Linger",
		Size = Vector3.new(radius * 2, 1.2, radius * 2),
		CFrame = CFrame.new(pos),
		Color = color or Color3.fromRGB(255, 90, 20),
		Material = Enum.Material.Neon,
		Anchored = true,
		CanCollide = false,
		Transparency = 0.45,
		Parent = Workspace,
	})
	Debris:AddItem(p, life)
end

local function hitscan(st, weapon, origin, direction)
	local range = weapon.range or 200
	local pellets = weapon.pellets or 1
	local spread = math.rad(weapon.spread or 0)
	local params = Util.rayParams(ignoreList(st))
	local dmg = (weapon.damage or 10) * damageMul(st)
	local color = st.config.accent

	for _ = 1, pellets do
		local dir = direction
		if spread > 0 then
			dir = (CFrame.lookAt(origin, origin + direction) * CFrame.Angles(
				(math.random() - 0.5) * spread,
				(math.random() - 0.5) * spread,
				0
			)).LookVector
		end
		local result = Workspace:Raycast(origin, dir * range, params)
		local hitPos = result and result.Position or (origin + dir * range)
		tracer(origin, hitPos, color)
		if result then
			local mech = Util.findMechFromPart(result.Instance)
			local vst = mech and CombatService.getByModel(mech)
			if vst then
				CombatService.dealDamage(st, vst, dmg, weapon.id, hitPos)
			end
		end
	end
end

local function launchProjectile(st, weapon, origin, direction, extra)
	extra = extra or {}
	local count = extra.count or weapon.count or 1
	local spread = math.rad(extra.spread or weapon.spread or 0)
	local speed = weapon.speed or 140
	local life = weapon.lifetime or 3
	local radius = weapon.radius or 8
	local dmg = (weapon.damage or 40) * damageMul(st)
	local gravity = weapon.gravity or (weapon.kind == "mortar" and 80 or 0)
	local arc = weapon.arc or 0

	for i = 1, count do
		local dir = direction
		if spread > 0 then
			dir = (CFrame.lookAt(origin, origin + direction) * CFrame.Angles(
				(math.random() - 0.5) * spread,
				(math.random() - 0.5) * 2 * spread / math.max(count, 1) + (i - (count + 1) / 2) * spread / count,
				0
			)).LookVector
		end
		if arc > 0 then
			dir = (dir + Vector3.new(0, arc, 0)).Unit
		end

		local ball = Util.part({
			Name = "MVMProjectile",
			Shape = Enum.PartType.Ball,
			Size = Vector3.new(1.6, 1.6, 1.6),
			CFrame = CFrame.new(origin),
			Color = st.config.accent,
			Material = Enum.Material.Neon,
			Anchored = true,
			CanCollide = false,
			Parent = Workspace,
		})

		local vel = dir * speed
		local t0 = Util.now()
		local last = origin
		local conn
		conn = RunService.Heartbeat:Connect(function(dt)
			if not ball.Parent then
				conn:Disconnect()
				return
			end
			vel += Vector3.new(0, -gravity, 0) * dt
			local nxt = ball.Position + vel * dt
			local params = Util.rayParams(ignoreList(st))
			local result = Workspace:Raycast(last, nxt - last, params)
			if result or Util.now() - t0 >= life then
				local pos = result and result.Position or nxt
				spawnBoom(pos, radius, st.config.accent)
				aoeAt(st, pos, radius, dmg, weapon.id)
				if weapon.linger and weapon.lingerDps then
					addLinger(st, pos, radius, weapon.lingerDps, weapon.linger, Color3.fromRGB(255, 90, 20))
				end
				ball:Destroy()
				conn:Disconnect()
				return
			end
			ball.CFrame = CFrame.new(nxt, nxt + vel)
			last = nxt
		end)
		Debris:AddItem(ball, life + 0.5)
	end
end

local function coneHit(st, weapon, origin, direction)
	local range = weapon.range or 40
	local ang = math.rad(weapon.angle or 25)
	local dmg = (weapon.damage or 10) * damageMul(st)
	for _, vst in pairs(states) do
		if vst ~= st and vst.model and vst.model.PrimaryPart and not vst.dead then
			local delta = vst.model.PrimaryPart.Position - origin
			if delta.Magnitude <= range then
				local u = Util.unit(delta)
				if u:Dot(direction) >= math.cos(ang) then
					CombatService.dealDamage(st, vst, dmg, weapon.id, vst.model.PrimaryPart.Position)
				end
			end
		end
	end
	spawnFlash(CFrame.lookAt(origin, origin + direction), Color3.fromRGB(255, 120, 30), Vector3.new(4, 4, range * 0.35))
end

local function meleeHit(st, weapon, origin, direction)
	local range = weapon.range or 16
	local dmg = (weapon.damage or 50) * damageMul(st)
	local best, bestDist
	for _, vst in pairs(states) do
		if vst ~= st and vst.model and vst.model.PrimaryPart and not vst.dead then
			local delta = vst.model.PrimaryPart.Position - origin
			local dist = delta.Magnitude
			if dist <= range + 8 and Util.unit(delta):Dot(direction) > 0.15 then
				if not bestDist or dist < bestDist then
					best, bestDist = vst, dist
				end
			end
		end
	end
	if best then
		CombatService.dealDamage(st, best, dmg, weapon.id, best.model.PrimaryPart.Position)
		spawnFlash(best.model.PrimaryPart.CFrame, st.config.accent, Vector3.new(6, 6, 6))
	else
		spawnFlash(CFrame.lookAt(origin, origin + direction) + direction * (range * 0.5), st.config.accent)
	end
end

local function lockTargets(st, weapon, origin)
	local maxLocks = (weapon.maxLocks or 3) + (st.buffs.paint and st.buffs.paint.lockBonus or 0)
	local range = weapon.lockRange or 320
	local found = {}
	for _, vst in pairs(states) do
		if vst ~= st and vst.model and vst.model.PrimaryPart and not vst.dead then
			local d = (vst.model.PrimaryPart.Position - origin).Magnitude
			if d <= range then
				table.insert(found, { st = vst, d = d })
			end
		end
	end
	table.sort(found, function(a, b)
		return a.d < b.d
	end)
	local n = math.min(#found, maxLocks)
	return found, n
end

local function tryAmmo(st, weapon)
	if not weapon.ammo then
		return true
	end
	local slot = weapon.slot
	if st.reloading[slot] then
		return false
	end
	local cur = st.ammo[slot] or 0
	if cur <= 0 then
		CombatService.reload(st.owner, slot)
		return false
	end
	st.ammo[slot] = cur - 1
	return true
end

function CombatService.reload(player, slot)
	local st = states[player]
	if not st then
		return
	end
	local weapon = st.config.weapons[slot]
	if not weapon or not weapon.ammo or st.reloading[slot] then
		return
	end
	st.reloading[slot] = true
	pushState(player)
	task.delay(weapon.reload or 2, function()
		if states[player] ~= st then
			return
		end
		st.ammo[slot] = weapon.ammo
		st.reloading[slot] = nil
		pushState(player)
	end)
end

function CombatService.applyBuff(st, weapon)
	st.buffs[weapon.id] = {
		untilTime = Util.now() + (weapon.duration or 4),
		damageMul = weapon.damageMul,
		damageTakenMul = weapon.damageTakenMul,
		speedMul = weapon.speedMul,
		fireRateMul = weapon.fireRateMul,
		lifesteal = weapon.lifesteal,
		lockBonus = weapon.lockBonus,
		frontal = weapon.frontal,
	}
	if weapon.kind == "cloak" then
		st.cloaked = true
		local MechFactory = require(script.Parent.MechFactory)
		MechFactory.setCloak(st.model, true)
	end
	setCooldown(st, weapon.slot, weapon.cooldown or 10)
end

function CombatService.tickBuffs()
	local now = Util.now()
	for player, st in pairs(states) do
		local dirty = false
		for id, b in pairs(st.buffs) do
			if b.untilTime <= now then
				st.buffs[id] = nil
				dirty = true
				if id == "cloak" or id == "ghost" then
					st.cloaked = false
					local MechFactory = require(script.Parent.MechFactory)
					MechFactory.setCloak(st.model, false)
				end
			end
		end
		if dirty then
			pushState(player)
		end
	end

	for i = #lingerZones, 1, -1 do
		local z = lingerZones[i]
		if now >= z.untilTime then
			table.remove(lingerZones, i)
		else
			for _, st in pairs(states) do
				if st.model and st.model.PrimaryPart and not st.dead then
					if (st.model.PrimaryPart.Position - z.pos).Magnitude <= z.radius then
						CombatService.dealDamage(z.owner, st, z.dps * 0.25, "linger", z.pos)
					end
				end
			end
		end
	end
end

function CombatService.register(player, model, mechId)
	local cfg = MechConfig.get(mechId)
	assert(cfg, "unknown mech")
	local ammo = {}
	for slot, w in pairs(cfg.weapons) do
		if w.ammo then
			ammo[slot] = w.ammo
		end
	end
	local st = {
		owner = player,
		model = model,
		mechId = mechId,
		config = cfg,
		health = cfg.maxHealth,
		maxHealth = cfg.maxHealth,
		ammo = ammo,
		reloading = {},
		cooldowns = {},
		buffs = {},
		seated = false,
		selected = "primary",
		cloaked = false,
		dead = false,
		lastFire = {},
	}
	states[player] = st
	partToState[model] = st
	pushState(player)
	return st
end

function CombatService.setSeated(player, seated)
	local st = states[player]
	if not st then
		return
	end
	st.seated = seated
	pushState(player)
	Remotes.fire("PilotState", player, { seated = seated, mechId = st.mechId })
end

function CombatService.tryFire(player, slot, origin, direction)
	local st = states[player]
	if not st or not st.seated or st.dead then
		return
	end
	if typeof(origin) ~= "Vector3" or typeof(direction) ~= "Vector3" then
		return
	end
	direction = Util.unit(direction)
	if direction.Magnitude < 0.5 then
		return
	end

	local weapon = st.config.weapons[slot]
	if not weapon then
		return
	end

	-- muzzle sanity: origin must be near the mech
	local root = st.model.PrimaryPart
	if not root or (origin - root.Position).Magnitude > 40 then
		origin = root.Position + root.CFrame.LookVector * 8 + Vector3.new(0, 4, 0)
	end

	if not readyAt(st, slot) then
		return
	end
	if not tryAmmo(st, weapon) then
		pushState(player)
		return
	end

	if weapon.decloak and st.cloaked then
		st.cloaked = false
		st.buffs.cloak = nil
		st.buffs.ghost = nil
		local MechFactory = require(script.Parent.MechFactory)
		MechFactory.setCloak(st.model, false)
	end

	local delay = rpmDelay(weapon)
	if st.buffs.overclock and st.buffs.overclock.fireRateMul then
		delay /= st.buffs.overclock.fireRateMul
	end
	setCooldown(st, slot, delay)

	if weapon.firingSlow then
		st.firingSlowUntil = Util.now() + (weapon.slowHold or 0.6)
		st.firingSlowMul = weapon.firingSlow
	end

	st.selected = slot
	spawnFlash(CFrame.lookAt(origin, origin + direction), st.config.accent)

	if weapon.kind == "hitscan" then
		hitscan(st, weapon, origin, direction)
	elseif weapon.kind == "projectile" or weapon.kind == "mortar" then
		launchProjectile(st, weapon, origin, direction)
	elseif weapon.kind == "cone" then
		coneHit(st, weapon, origin, direction)
	elseif weapon.kind == "melee" then
		meleeHit(st, weapon, origin, direction)
		if weapon.lunge and root then
			root.AssemblyLinearVelocity = direction * 60 + Vector3.new(0, 8, 0)
		end
	elseif weapon.kind == "aoe" then
		local pos = root.Position
		aoeAt(st, pos, weapon.radius or 20, (weapon.damage or 50) * damageMul(st), weapon.id)
		spawnBoom(pos, weapon.radius or 20, st.config.accent)
		if weapon.linger and weapon.lingerDps then
			addLinger(st, pos, weapon.radius or 20, weapon.lingerDps, weapon.linger, Color3.fromRGB(255, 80, 20))
		end
	elseif weapon.kind == "lockon" then
		local found, n = lockTargets(st, weapon, origin)
		if n == 0 then
			launchProjectile(st, weapon, origin, direction)
		else
			for i = 1, n do
				local tgt = found[i].st.model.PrimaryPart.Position
				launchProjectile(st, weapon, origin, Util.unit(tgt - origin))
			end
		end
	elseif weapon.kind == "buff" or weapon.kind == "shield" or weapon.kind == "cloak" then
		CombatService.applyBuff(st, weapon)
	elseif weapon.kind == "reload" then
		for s, w in pairs(st.config.weapons) do
			if w.ammo then
				st.ammo[s] = w.ammo
				st.reloading[s] = nil
			end
		end
		setCooldown(st, slot, weapon.cooldown or 16)
	elseif weapon.kind == "dash" then
		local dist = weapon.distance or 40
		root.AssemblyLinearVelocity = direction * dist * 2.2 + Vector3.new(0, 10, 0)
		if weapon.damage then
			aoeAt(st, root.Position + direction * 10, weapon.radius or 12, weapon.damage * damageMul(st), weapon.id)
		end
		setCooldown(st, slot, weapon.cooldown or 6)
	end

	pushState(player)
	Remotes.fireAll("VfxEvent", { kind = "fire", slot = slot, mechId = st.mechId, origin = origin })
end

function CombatService.destroyMech(player, killer, weaponId, silent)
	local st = states[player]
	if not st or st.dead then
		return
	end
	st.dead = true
	st.seated = false

	local pos = st.model.PrimaryPart and st.model.PrimaryPart.Position or Constants.DeliveryPad
	if not silent then
		spawnBoom(pos, 22, Color3.fromRGB(255, 160, 40))
		local killerName = (killer and killer.DisplayName) or "the hangar"
		local victimName = (typeof(player) == "Instance" and player.DisplayName) or (player and player.DisplayName) or "Unknown"
		local mechName = st.config.name
		Remotes.fireAll("KillFeed", {
			text = string.format("%s wrecked %s [%s]", killerName, victimName, mechName),
			weapon = weaponId,
		})
	end

	if not silent then
		for _, fn in ipairs(destroyedListeners) do
			local ok, err = pcall(fn, player, st)
			if not ok then
				warn("[MVM] destroy listener: ", err)
			end
		end
	end

	if st.model then
		st.model:Destroy()
	end
	states[player] = nil
	pushState(player)
	Remotes.fire("PilotState", player, { seated = false, destroyed = not silent, ejected = silent == true })
end

function CombatService.unregister(player, reason)
	if states[player] then
		local silent = reason == "eject"
		CombatService.destroyMech(player, nil, reason or "eject", silent)
	end
end

function CombatService.hasMech(player)
	return states[player] ~= nil
end

function CombatService.onDestroyed(fn)
	table.insert(destroyedListeners, fn)
end

function CombatService.start()
	task.spawn(function()
		while true do
			CombatService.tickBuffs()
			task.wait(0.25)
		end
	end)

	Remotes.on("FireWeapon", function(player, payload)
		if typeof(payload) ~= "table" then
			return
		end
		CombatService.tryFire(player, payload.slot, payload.origin, payload.direction)
	end)

	Remotes.on("ReloadWeapon", function(player, slot)
		if typeof(slot) ~= "string" then
			slot = "primary"
		end
		CombatService.reload(player, slot)
	end)

	Players.PlayerRemoving:Connect(function(player)
		if states[player] and states[player].model then
			states[player].model:Destroy()
		end
		states[player] = nil
	end)
end

return CombatService
