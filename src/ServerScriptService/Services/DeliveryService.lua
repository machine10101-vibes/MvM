local Workspace = game:GetService("Workspace")

local Constants = require(game.ReplicatedStorage.Shared.Constants)
local MechConfig = require(game.ReplicatedStorage.Shared.MechConfig)
local Remotes = require(game.ReplicatedStorage.Shared.Remotes)
local Util = require(game.ReplicatedStorage.Shared.Util)

local CombatService = require(script.Parent.CombatService)
local MechFactory = require(script.Parent.MechFactory)

local DeliveryService = {}
local busy = {}
local onReady = nil

local function heliPart(model, name, size, cf, color)
	return Util.part({
		Name = name,
		Size = size,
		CFrame = cf,
		Color = color,
		Material = Enum.Material.Metal,
		Anchored = true,
		CanCollide = false,
		Parent = model,
	})
end

local function createHelicopter(cf)
	local heli = Instance.new("Model")
	heli.Name = "MVMDropship"
	local body = heliPart(heli, "Body", Vector3.new(18, 6, 32), cf, Color3.fromRGB(36, 42, 48))
	heli.PrimaryPart = body
	heliPart(heli, "Cabin", Vector3.new(10, 5, 10), cf * CFrame.new(0, 1, -12), Color3.fromRGB(28, 32, 36))
	heliPart(heli, "Nose", Vector3.new(6, 3, 8), cf * CFrame.new(0, 0, -20), Color3.fromRGB(24, 28, 32))
	heliPart(heli, "Tail", Vector3.new(3, 3, 18), cf * CFrame.new(0, 2, 20), Color3.fromRGB(40, 46, 52))
	heliPart(heli, "Fin", Vector3.new(1.2, 8, 4), cf * CFrame.new(0, 7, 26), Color3.fromRGB(200, 70, 40))
	local rotor = heliPart(heli, "Rotor", Vector3.new(34, 0.6, 2.4), cf * CFrame.new(0, 5.2, -2), Color3.fromRGB(20, 20, 22))
	heliPart(heli, "RotorCross", Vector3.new(2.4, 0.6, 34), cf * CFrame.new(0, 5.2, -2), Color3.fromRGB(20, 20, 22))
	heliPart(heli, "Stripe", Vector3.new(18.2, 0.8, 2), cf * CFrame.new(0, 1, 0), Color3.fromRGB(70, 200, 255))
	local hook = heliPart(heli, "Hook", Vector3.new(1, 18, 1), cf * CFrame.new(0, -12, 0), Color3.fromRGB(80, 80, 84))
	Util.billboard(body, "MVM DROPSHIP", UDim2.fromOffset(240, 32), Vector3.new(0, 8, 0))

	local spin = rotor
	task.spawn(function()
		while heli.Parent and spin.Parent do
			spin.CFrame = spin.CFrame * CFrame.Angles(0, math.rad(38), 0)
			task.wait()
		end
	end)

	heli.Parent = Workspace:FindFirstChild("MVMWorld") or Workspace
	return heli, hook
end

local function tweenModel(model, target, t)
	-- Heli parts are individually anchored; lerp the whole model via PivotTo.
	local start = model:GetPivot()
	local t0 = os.clock()
	while os.clock() - t0 < t do
		local a = math.clamp((os.clock() - t0) / t, 0, 1)
		a = a * a * (3 - 2 * a)
		model:PivotTo(start:Lerp(target, a))
		task.wait()
	end
	model:PivotTo(target)
end

function DeliveryService.onReadyCallback(fn)
	onReady = fn
end

function DeliveryService.isBusy(player)
	return busy[player] == true
end

function DeliveryService.deliver(player, mechId)
	if busy[player] then
		Remotes.fire("SelectionResult", player, { ok = false, reason = "A dropship is already inbound." })
		return
	end
	if CombatService.hasMech(player) then
		Remotes.fire("SelectionResult", player, { ok = false, reason = "You already have a mech. Eject or die to re-select." })
		return
	end
	local cfg = MechConfig.get(mechId)
	if not cfg then
		Remotes.fire("SelectionResult", player, { ok = false, reason = "Unknown mech." })
		return
	end

	busy[player] = true
	Remotes.fire("SelectionResult", player, { ok = true, mechId = mechId })
	Remotes.fire("DeliveryStatus", player, { phase = "inbound", name = cfg.name })
	Remotes.fireAll("Notify", { text = player.DisplayName .. " requested " .. cfg.name, kind = "info" })

	task.spawn(function()
		local heli
		local ok, err = pcall(function()
			local startCf = CFrame.new(Constants.HeliStart, Constants.HeliHover)
			local hoverCf = CFrame.new(Constants.HeliHover, Constants.HeliHover + Vector3.new(0, 0, 12))
			local exitCf = CFrame.new(Constants.HeliExit, Constants.HeliExit + Vector3.new(40, 0, 20))

			heli = createHelicopter(startCf)
			Util.play(heli.PrimaryPart, "rbxasset://sounds/impact_water.mp3", { Volume = 0.5, Name = "HeliIn" })

			tweenModel(heli, hoverCf, 3.6)
			Remotes.fire("DeliveryStatus", player, { phase = "hover", name = cfg.name })

			local dropCf = CFrame.new(Constants.DeliveryPad + Vector3.new(0, 70, 0))
			local mech = MechFactory.create(cfg, dropCf, player)
			MechFactory.weldReady(mech)
			mech:PivotTo(CFrame.new(Constants.DeliveryPad + Vector3.new(0, 48, 0)))

			-- lower
			Remotes.fire("DeliveryStatus", player, { phase = "lowering", name = cfg.name })
			local land = CFrame.new(Constants.DeliveryPad + Vector3.new(0, 14 * (cfg.scale or 1), 0))
			local t0 = os.clock()
			local start = mech:GetPivot()
			while os.clock() - t0 < 2.4 do
				local a = math.clamp((os.clock() - t0) / 2.4, 0, 1)
				mech:PivotTo(start:Lerp(land, a))
				if heli.PrimaryPart then
					heli:PivotTo(hoverCf)
				end
				task.wait()
			end
			mech:PivotTo(land)
			MechFactory.setAnchored(mech, true)
			Remotes.fireAll("VfxEvent", { kind = "land", position = land.Position })
			if mech.PrimaryPart then
				Util.play(mech.PrimaryPart, "rbxasset://sounds/impact_water.mp3", { Volume = 0.65, PlaybackSpeed = 0.5, Name = "DeliverOk" })
			end

			CombatService.register(player, mech, mechId)
			if onReady then
				onReady(player, mech, cfg)
			end

			Remotes.fire("DeliveryStatus", player, { phase = "ready", name = cfg.name })
			Remotes.fire("Notify", player, { text = cfg.name .. " on the pad. Enter the cockpit.", kind = "ok" })

			tweenModel(heli, exitCf, 3.2)
			heli:Destroy()
		end)

		busy[player] = nil
		if not ok then
			if heli and heli.Parent then
				heli:Destroy()
			end
			warn("[MVM] Delivery failed: ", err)
			Remotes.fire("DeliveryStatus", player, { phase = "failed" })
			Remotes.fire("Notify", player, { text = "Dropship aborted. Try the station again.", kind = "error" })
		end
	end)
end

return DeliveryService
