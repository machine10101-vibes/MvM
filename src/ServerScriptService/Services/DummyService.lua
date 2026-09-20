local Workspace = game:GetService("Workspace")

local MechConfig = require(game.ReplicatedStorage.Shared.MechConfig)
local Util = require(game.ReplicatedStorage.Shared.Util)

local CombatService = require(script.Parent.CombatService)
local MechFactory = require(script.Parent.MechFactory)

local DummyService = {}

local SPOTS = {
	{ id = "titan", pos = Vector3.new(-36, 20, 292), yaw = 0.5 },
	{ id = "assault", pos = Vector3.new(280, 20, 560), yaw = -2.2 },
	{ id = "sniper", pos = Vector3.new(18, 20, 640), yaw = 3.05 },
}

local live = {} -- spec -> owner token

local function spawnOne(spec)
	local cfg = MechConfig.get(spec.id)
	if not cfg then
		return
	end
	local cf = CFrame.new(spec.pos) * CFrame.Angles(0, spec.yaw, 0)
	local model = MechFactory.create(cfg, cf, nil)
	model.Name = "Range Dummy · " .. cfg.name
	local plate = model.PrimaryPart and model.PrimaryPart:FindFirstChild("MechPlate")
	if plate and plate:FindFirstChild("Pilot") then
		plate.Pilot.Text = "RANGE DUMMY  ·  MVM"
	end
	local enter = model.PrimaryPart and model.PrimaryPart:FindFirstChild("EnterCockpit")
	if enter then
		enter.Enabled = false
	end
	MechFactory.weldReady(model)
	MechFactory.setAnchored(model, true)

	local owner = {
		DisplayName = "Range Dummy",
		UserId = -(200 + math.abs(math.floor(spec.pos.X + spec.pos.Z))),
		dummy = true,
	}
	local st = CombatService.register(owner, model, spec.id)
	st.seated = true
	st.dummy = true
	model:SetAttribute("OwnerUserId", owner.UserId)
	live[spec] = owner
	return owner
end

local function seatedPlayerMechs()
	local found = {}
	local root = Workspace:FindFirstChild("MVMWorld") or Workspace
	for _, inst in ipairs(root:GetDescendants()) do
		if inst:IsA("Model") and inst:GetAttribute("MechId") and inst.PrimaryPart then
			local ost = CombatService.getByModel(inst)
			if ost and not ost.dummy and ost.seated then
				table.insert(found, ost)
			end
		end
	end
	return found
end

local function aimAtNearest(st)
	if not (st.model and st.model.PrimaryPart) then
		return
	end
	local origin = st.model.PrimaryPart.Position + Vector3.new(0, 5, 0) + st.model.PrimaryPart.CFrame.LookVector * 8
	local best, bestD
	for _, ost in ipairs(seatedPlayerMechs()) do
		local d = (ost.model.PrimaryPart.Position - origin).Magnitude
		if d < 340 and (not bestD or d < bestD) then
			best, bestD = ost, d
		end
	end
	if not best then
		return
	end
	local dir = Util.unit(best.model.PrimaryPart.Position - origin)
	CombatService.tryFire(st.owner, "primary", origin, dir)
end

function DummyService.start()
	for _, spec in ipairs(SPOTS) do
		spawnOne(spec)
	end

	task.spawn(function()
		while true do
			task.wait(1.7)
			for spec, owner in pairs(live) do
				local st = CombatService.getState(owner)
				if st and not st.dead then
					aimAtNearest(st)
				elseif not st then
					-- slot empty after wreck; respawn handled by wrapDestroyed
					live[spec] = live[spec]
				end
			end
		end
	end)
end

function DummyService.hookDestroyed()
	CombatService.onDestroyed(function(owner, st)
		if st and st.dummy then
			local spec
			for s, token in pairs(live) do
				if token == owner then
					spec = s
					break
				end
			end
			task.delay(4.5, function()
				if spec then
					spawnOne(spec)
				end
			end)
		end
	end)
end

return DummyService
