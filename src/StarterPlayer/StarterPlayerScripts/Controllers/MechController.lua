local ContextActionService = game:GetService("ContextActionService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local Constants = require(game.ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Constants"))
local MechConfig = require(game.ReplicatedStorage:WaitForChild("Shared"):WaitForChild("MechConfig"))
local Remotes = require(game.ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Remotes"))
local Util = require(game.ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Util"))

local player = Players.LocalPlayer
local camera = Workspace.CurrentCamera

local MechController = {}

local seated = false
local mechId
local chassis
local chase = true
local move = Vector3.zero
local lookYaw = 0
local lookPitch = 0
local holding = { primary = false, secondary = false }
local connections = {}
local lastState
local nextClientFire = {}

local function disconnectAll()
	for _, c in ipairs(connections) do
		c:Disconnect()
	end
	table.clear(connections)
end

local function findOwnMech()
	local world = Workspace:FindFirstChild("MVMWorld")
	local root = world or Workspace
	for _, inst in ipairs(root:GetDescendants()) do
		if inst:IsA("Model") and inst:GetAttribute(Constants.MechIdAttr) == mechId then
			if inst:GetAttribute(Constants.OwnerAttr) == player.UserId then
				return inst
			end
		end
	end
	for _, inst in ipairs(Workspace:GetDescendants()) do
		if inst:IsA("Model") and inst:GetAttribute(Constants.OwnerAttr) == player.UserId and inst:GetAttribute(Constants.MechIdAttr) then
			return inst
		end
	end
	return nil
end

local function cfg()
	return mechId and MechConfig.get(mechId)
end

local function aim()
	local origin
	if chassis and chassis.PrimaryPart then
		local muzzle = chassis.PrimaryPart:FindFirstChild("Muzzle")
		origin = muzzle and muzzle.WorldPosition or (chassis.PrimaryPart.Position + chassis.PrimaryPart.CFrame.LookVector * 8 + Vector3.new(0, 4, 0))
	else
		origin = camera.CFrame.Position
	end
	local dir = camera.CFrame.LookVector
	local params = Util.rayParams({ chassis, player.Character })
	local result = Workspace:Raycast(camera.CFrame.Position, dir * 900, params)
	if result then
		dir = Util.unit(result.Position - origin)
	end
	return origin, dir
end

local function fire(slot)
	if not seated then
		return
	end
	local c = cfg()
	local weapon = c and c.weapons[slot]
	local delay = 0.08
	if weapon then
		if weapon.cooldown then
			delay = weapon.cooldown
		elseif weapon.rpm then
			delay = 60 / math.max(weapon.rpm, 1)
		end
	end
	local now = os.clock()
	if (nextClientFire[slot] or 0) > now then
		return
	end
	nextClientFire[slot] = now + delay * 0.92
	local origin, dir = aim()
	Remotes.fireServer("FireWeapon", { slot = slot, origin = origin, direction = dir })
	if chassis and chassis.PrimaryPart then
		Util.play(chassis.PrimaryPart, "rbxasset://sounds/electronicpingshort.wav", {
			Volume = 0.35,
			PlaybackSpeed = 0.85 + math.random() * 0.3,
		})
	end
end

local function bindMove(name, _state, input)
	local on = input.UserInputState == Enum.UserInputState.Begin
	if name == "MVM_Fwd" then
		move = Vector3.new(move.X, 0, on and -1 or (move.Z == -1 and 0 or move.Z))
	elseif name == "MVM_Back" then
		move = Vector3.new(move.X, 0, on and 1 or (move.Z == 1 and 0 or move.Z))
	elseif name == "MVM_Left" then
		move = Vector3.new(on and -1 or (move.X == -1 and 0 or move.X), 0, move.Z)
	elseif name == "MVM_Right" then
		move = Vector3.new(on and 1 or (move.X == 1 and 0 or move.X), 0, move.Z)
	end
	return Enum.ContextActionResult.Sink
end

local function bindFire(name, state)
	local slot = (name == "MVM_Pri") and "primary" or "secondary"
	holding[slot] = state == Enum.UserInputState.Begin
	if holding[slot] then
		fire(slot)
	end
	return Enum.ContextActionResult.Sink
end

local function bindSpecial(name, state)
	if state ~= Enum.UserInputState.Begin then
		return Enum.ContextActionResult.Sink
	end
	fire(name == "MVM_Q" and "specialQ" or "specialE")
	return Enum.ContextActionResult.Sink
end

local function bindCam(_, state)
	if state == Enum.UserInputState.Begin then
		chase = not chase
	end
	return Enum.ContextActionResult.Sink
end

local function bindEject(_, state)
	if state == Enum.UserInputState.Begin then
		Remotes.fireServer("ExitMech")
	end
	return Enum.ContextActionResult.Sink
end

local function bindReload(_, state)
	if state == Enum.UserInputState.Begin then
		-- client asks server by firing empty primary when ammo 0; explicit reload via FireWeapon on depleted slot
			Remotes.fireServer("ReloadWeapon", lastState and lastState.selected or "primary")
	end
	return Enum.ContextActionResult.Sink
end

local function bindInput()
	ContextActionService:BindAction("MVM_Fwd", bindMove, false, Enum.KeyCode.W)
	ContextActionService:BindAction("MVM_Back", bindMove, false, Enum.KeyCode.S)
	ContextActionService:BindAction("MVM_Left", bindMove, false, Enum.KeyCode.A)
	ContextActionService:BindAction("MVM_Right", bindMove, false, Enum.KeyCode.D)
	ContextActionService:BindAction("MVM_Pri", bindFire, false, Enum.UserInputType.MouseButton1)
	ContextActionService:BindAction("MVM_Sec", bindFire, false, Enum.UserInputType.MouseButton2)
	ContextActionService:BindAction("MVM_Q", bindSpecial, false, Enum.KeyCode.Q)
	ContextActionService:BindAction("MVM_E", bindSpecial, false, Enum.KeyCode.E)
	ContextActionService:BindAction("MVM_Cam", bindCam, false, Enum.KeyCode.V)
	ContextActionService:BindAction("MVM_Eject", bindEject, false, Enum.KeyCode.X)
	ContextActionService:BindAction("MVM_Reload", bindReload, false, Enum.KeyCode.R)
end

local function unbindInput()
	for _, n in ipairs({
		"MVM_Fwd",
		"MVM_Back",
		"MVM_Left",
		"MVM_Right",
		"MVM_Pri",
		"MVM_Sec",
		"MVM_Q",
		"MVM_E",
		"MVM_Cam",
		"MVM_Eject",
		"MVM_Reload",
	}) do
		ContextActionService:UnbindAction(n)
	end
	holding.primary = false
	holding.secondary = false
	move = Vector3.zero
end

local function standHeight(model, c)
	local s = (c and c.scale) or 1
	return 13.2 * s
end

local function stepMovement(dt)
	if not (seated and chassis and chassis.PrimaryPart) then
		return
	end
	local root = chassis.PrimaryPart
	local c = cfg()
	if not c then
		return
	end

	local speed = c.walkSpeed
	if lastState and lastState.speedMul then
		speed *= lastState.speedMul
	elseif lastState and lastState.buffs then
		for _, b in pairs(lastState.buffs) do
			if b.speedMul then
				speed *= b.speedMul
			end
		end
	end

	lookYaw -= UserInputService:GetMouseDelta().X * 0.004
	lookPitch = math.clamp(lookPitch - UserInputService:GetMouseDelta().Y * 0.0035, math.rad(-50), math.rad(35))

	local yawCf = CFrame.Angles(0, lookYaw, 0)
	local look = yawCf.LookVector
	local right = yawCf.RightVector
	local wish = (look * -move.Z + right * move.X)
	if wish.Magnitude > 1 then
		wish = wish.Unit
	end

	local params = Util.rayParams({ chassis, player.Character })
	local hover = standHeight(chassis, c)
	local floor = Workspace:Raycast(root.Position + Vector3.new(0, 6, 0), Vector3.new(0, -80, 0), params)
	local targetY = floor and (floor.Position.Y + hover) or root.Position.Y
	local yVel = (targetY - root.Position.Y) * 8

	local horiz = wish * speed
	root.AssemblyLinearVelocity = Vector3.new(horiz.X, yVel, horiz.Z)
	root.AssemblyAngularVelocity = Vector3.zero

	local dest = CFrame.new(root.Position) * yawCf
	root.CFrame = root.CFrame:Lerp(dest, math.clamp(dt * c.turnRate * 4, 0, 1))
end

local function stepCamera()
	if not (seated and chassis and chassis.PrimaryPart) then
		return
	end
	camera.CameraType = Enum.CameraType.Scriptable
	local root = chassis.PrimaryPart
	local yawCf = CFrame.Angles(0, lookYaw, 0) * CFrame.Angles(lookPitch, 0, 0)
	if chase then
		local off = Constants.ChaseOffset
		local pivot = root.Position + Vector3.new(0, 6, 0)
		local desired = CFrame.new(pivot) * yawCf * CFrame.new(off.X, off.Y * 0.15, off.Z)
		camera.CFrame = camera.CFrame:Lerp(desired, 0.28)
	else
		local camPart = chassis:FindFirstChild("CameraPart")
		local eye = camPart and camPart.CFrame.Position or (root.Position + Vector3.new(0, 6, -2))
		camera.CFrame = CFrame.new(eye) * yawCf
	end
end

local function enterSeat(id)
	mechId = id
	chassis = findOwnMech()
	seated = true
	chase = true
	if chassis and chassis.PrimaryPart then
		local look = chassis.PrimaryPart.CFrame.LookVector
		lookYaw = math.atan2(-look.X, -look.Z)
	end
	UserInputService.MouseBehavior = Enum.MouseBehavior.LockCenter
	UserInputService.MouseIconEnabled = false
	bindInput()
end

local function leaveSeat()
	seated = false
	chassis = nil
	mechId = nil
	unbindInput()
	UserInputService.MouseBehavior = Enum.MouseBehavior.Default
	UserInputService.MouseIconEnabled = true
	camera.CameraType = Enum.CameraType.Custom
	if player.Character then
		camera.CameraSubject = player.Character:FindFirstChildOfClass("Humanoid")
	end
end

function MechController.start()
	Remotes.client("PilotState", function(payload)
		if typeof(payload) ~= "table" then
			return
		end
		if payload.seated then
			enterSeat(payload.mechId)
		else
			leaveSeat()
		end
	end)

	Remotes.client("MechState", function(st)
		lastState = st
		if st and st.active and st.seated and not seated then
			enterSeat(st.mechId)
		elseif st and (not st.active or not st.seated) and seated then
			leaveSeat()
		end
	end)

	table.insert(connections, RunService.RenderStepped:Connect(function(dt)
		if not seated then
			return
		end
		if not chassis or not chassis.Parent then
			chassis = findOwnMech()
		end
		stepMovement(dt)
		stepCamera()
		if holding.primary then
			fire("primary")
		end
		if holding.secondary then
			fire("secondary")
		end
	end))

	player.CharacterAdded:Connect(function()
		if not seated then
			task.wait(0.1)
			camera.CameraType = Enum.CameraType.Custom
		end
	end)
end

return MechController
