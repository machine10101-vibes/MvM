local Players = game:GetService("Players")

local Constants = require(game.ReplicatedStorage.Shared.Constants)
local Remotes = require(game.ReplicatedStorage.Shared.Remotes)
local CombatService = require(script.Parent.CombatService)
local MechFactory = require(script.Parent.MechFactory)

local PilotService = {}
local bindings = {} -- [model] = { enter, exit }

local function restorePilot(player)
	local char = player.Character
	if not char then
		return
	end
	local hum = char:FindFirstChildOfClass("Humanoid")
	local root = char:FindFirstChild("HumanoidRootPart")
	if hum then
		hum.WalkSpeed = Constants.PilotWalkSpeed
		hum.JumpPower = 50
		hum.AutoRotate = true
		if hum.Sit then
			hum.Sit = false
		end
	end
	for _, p in ipairs(char:GetDescendants()) do
		if p:IsA("BasePart") then
			p.LocalTransparencyModifier = 0
			p.Transparency = 0
		end
	end
	if root then
		root.CFrame = CFrame.new(Constants.HangarSpawn + Vector3.new(math.random(-4, 4), 4, math.random(-4, 4)))
		root.AssemblyLinearVelocity = Vector3.zero
	end
end

local function hidePilot(char)
	for _, p in ipairs(char:GetDescendants()) do
		if p:IsA("BasePart") and p.Name ~= "HumanoidRootPart" then
			p.Transparency = 1
		elseif p:IsA("Decal") or p:IsA("Texture") then
			p.Transparency = 1
		end
		if p:IsA("Accessory") then
			local h = p:FindFirstChildWhichIsA("BasePart")
			if h then
				h.Transparency = 1
			end
		end
	end
end

local function bindMech(player, mech)
	if bindings[mech] then
		return
	end
	local seat = mech:FindFirstChild("CockpitSeat")
	local enter = mech.PrimaryPart and mech.PrimaryPart:FindFirstChild("EnterCockpit")
	local exitPrompt = seat and seat:FindFirstChild("ExitCockpit")
	if not (seat and enter) then
		return
	end

	local enterConn = enter.Triggered:Connect(function(who)
		if who ~= player then
			Remotes.fire("Notify", who, { text = "This chassis is assigned to " .. player.DisplayName, kind = "warn" })
			return
		end
		PilotService.enter(player)
	end)

	local exitConn
	if exitPrompt then
		exitConn = exitPrompt.Triggered:Connect(function(who)
			if who == player then
				PilotService.eject(player, false)
			end
		end)
	end

	bindings[mech] = { enterConn, exitConn }
end

function PilotService.enter(player)
	local st = CombatService.getState(player)
	if not st or st.dead or st.seated then
		return
	end
	local char = player.Character
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	local root = char and char:FindFirstChild("HumanoidRootPart")
	local seat = st.model:FindFirstChild("CockpitSeat")
	if not (hum and root and seat) then
		return
	end

	hidePilot(char)
	seat:Sit(hum)
	hum.WalkSpeed = 0
	hum.JumpPower = 0

	if st.model.PrimaryPart then
		pcall(function()
			st.model.PrimaryPart:SetNetworkOwner(player)
		end)
		MechFactory.setAnchored(st.model, false)
	end

	local enter = st.model.PrimaryPart and st.model.PrimaryPart:FindFirstChild("EnterCockpit")
	if enter then
		enter.Enabled = false
	end
	local exitPrompt = seat:FindFirstChild("ExitCockpit")
	if exitPrompt then
		exitPrompt.Enabled = true
	end

	CombatService.setSeated(player, true)
	Remotes.fire("Notify", player, { text = "Cockpit sealed. WASD move · mouse aim · LMB/RMB fire · Q/E specials · V camera · X eject", kind = "ok" })
end

function PilotService.eject(player, destroyed)
	local st = CombatService.getState(player)
	local char = player.Character
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	if hum then
		hum.Sit = false
	end

	if st and st.model then
		local enter = st.model.PrimaryPart and st.model.PrimaryPart:FindFirstChild("EnterCockpit")
		if enter then
			enter.Enabled = true
		end
		local seat = st.model:FindFirstChild("CockpitSeat")
		local exitPrompt = seat and seat:FindFirstChild("ExitCockpit")
		if exitPrompt then
			exitPrompt.Enabled = false
		end
		if st.model.PrimaryPart then
			pcall(function()
				st.model.PrimaryPart:SetNetworkOwnershipAuto()
			end)
			MechFactory.setAnchored(st.model, true)
		end
	end

	if not destroyed and st then
		-- abandon chassis
		CombatService.unregister(player, "eject")
		Remotes.fire("Notify", player, { text = "RETURN TO STATION", kind = "info" })
	end

	task.delay(0.15, function()
		restorePilot(player)
	end)
end

function PilotService.start()
	Remotes.on("EnterMech", function(player)
		PilotService.enter(player)
	end)

	Remotes.on("ExitMech", function(player)
		PilotService.eject(player, false)
	end)

	local DeliveryService = require(script.Parent.DeliveryService)
	DeliveryService.onReadyCallback(function(player, mech)
		bindMech(player, mech)
	end)

	CombatService.onDestroyed(function(player, st)
		if typeof(player) ~= "Instance" or not player:IsA("Player") then
			return
		end
		if st and st.model and bindings[st.model] then
			for _, c in ipairs(bindings[st.model]) do
				if c then
					c:Disconnect()
				end
			end
			bindings[st.model] = nil
		end
		PilotService.eject(player, true)
		Remotes.fire("Notify", player, { text = "Chassis destroyed. Returning to hangar.", kind = "error" })
	end)

	local function hookChar(player, char)
		local hum = char:WaitForChild("Humanoid", 8)
		if hum then
			hum.Died:Connect(function()
				if CombatService.hasMech(player) then
					CombatService.unregister(player, "pilot_down")
				end
			end)
		end
	end

	local function watch(player)
		player.CharacterAdded:Connect(function(char)
			hookChar(player, char)
			task.wait(0.2)
			if not CombatService.hasMech(player) then
				restorePilot(player)
			end
		end)
		if player.Character then
			hookChar(player, player.Character)
		end
	end
	Players.PlayerAdded:Connect(watch)
	for _, player in ipairs(Players:GetPlayers()) do
		watch(player)
	end
end

return PilotService
