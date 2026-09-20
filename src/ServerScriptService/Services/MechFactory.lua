local CollectionService = game:GetService("CollectionService")

local Constants = require(game.ReplicatedStorage.Shared.Constants)
local Util = require(game.ReplicatedStorage.Shared.Util)

local MechFactory = {}

local function addPart(model, name, size, offset, color, material, shape)
	local p = Util.part({
		Name = name,
		Size = size,
		Color = color,
		Material = material or Enum.Material.Metal,
		Anchored = true,
		CanCollide = name == "Torso" or name == "Hip" or name:find("Leg") ~= nil,
		Shape = shape,
		Parent = model,
	})
	p.CFrame = model.PrimaryPart.CFrame * offset
	return p
end

local function kitExtras(model, cfg)
	local id = cfg.id
	local accent = cfg.accent
	local color = cfg.color

	if id == "assault" then
		addPart(model, "GunL", Vector3.new(1.4, 1.1, 7), CFrame.new(-4.6, 1.4, -5.2), accent)
		addPart(model, "GunR", Vector3.new(1.4, 1.1, 7), CFrame.new(4.6, 1.4, -5.2), accent)
		addPart(model, "PodL", Vector3.new(2.2, 1.4, 3.2), CFrame.new(-3.2, 5.6, 1.4), color)
		addPart(model, "PodR", Vector3.new(2.2, 1.4, 3.2), CFrame.new(3.2, 5.6, 1.4), color)
	elseif id == "titan" then
		addPart(model, "Rail", Vector3.new(2.2, 2.2, 14), CFrame.new(5.4, 4.8, -4), accent)
		addPart(model, "PauldronL", Vector3.new(5, 2.4, 4), CFrame.new(-4.6, 5.4, 0.6), color)
		addPart(model, "PauldronR", Vector3.new(5, 2.4, 4), CFrame.new(4.6, 5.4, 0.6), color)
		addPart(model, "Skirt", Vector3.new(10, 2, 6), CFrame.new(0, -2.2, 0.4), Color3.fromRGB(30, 30, 34))
	elseif id == "scout" then
		addPart(model, "SMGL", Vector3.new(0.9, 0.8, 5), CFrame.new(-3.6, 1.2, -4.4), accent)
		addPart(model, "SMGR", Vector3.new(0.9, 0.8, 5), CFrame.new(3.6, 1.2, -4.4), accent)
		addPart(model, "Fin", Vector3.new(0.4, 3.4, 4), CFrame.new(0, 6.2, 1.6), accent)
	elseif id == "sniper" then
		addPart(model, "LongBarrel", Vector3.new(1.2, 1.2, 18), CFrame.new(3.8, 3.6, -8), accent)
		addPart(model, "Scope", Vector3.new(1.6, 1.4, 3), CFrame.new(3.8, 5.0, -2), Color3.fromRGB(20, 30, 48))
	elseif id == "flame" then
		addPart(model, "Nozzle", Vector3.new(2.4, 2.4, 8), CFrame.new(0, 0.6, -6.4), accent)
		addPart(model, "TankL", Vector3.new(2.6, 4.2, 2.6), CFrame.new(-3.4, 3.4, 2.2), Color3.fromRGB(40, 20, 16))
		addPart(model, "TankR", Vector3.new(2.6, 4.2, 2.6), CFrame.new(3.4, 3.4, 2.2), Color3.fromRGB(40, 20, 16))
	elseif id == "rocket" then
		for i = -2, 2 do
			addPart(model, "Tube" .. i, Vector3.new(1.1, 1.1, 6), CFrame.new(i * 1.3, 5.8, 0.2), accent)
		end
		addPart(model, "Rack", Vector3.new(8, 1.6, 4), CFrame.new(0, 5.6, 0.6), color)
	elseif id == "guardian" then
		addPart(model, "ShieldPlate", Vector3.new(8, 9, 1.2), CFrame.new(-5.6, 2.2, -3.4), accent)
		addPart(model, "Cannon", Vector3.new(1.8, 1.8, 9), CFrame.new(4.4, 2.2, -5), Color3.fromRGB(40, 80, 96))
	elseif id == "shadow" then
		addPart(model, "Shotgun", Vector3.new(1.2, 1.1, 6), CFrame.new(3.6, 1.4, -4.6), accent)
		addPart(model, "Dagger", Vector3.new(0.7, 0.5, 5), CFrame.new(-3.8, 1.2, -3.8), Color3.fromRGB(200, 120, 255))
		addPart(model, "Cowl", Vector3.new(5.4, 2, 4), CFrame.new(0, 5.4, 0.4), color)
	elseif id == "howitzer" then
		addPart(model, "Barrel", Vector3.new(2.6, 2.6, 16), CFrame.new(0, 5.6, -4) * CFrame.Angles(math.rad(-22), 0, 0), accent)
		addPart(model, "Breech", Vector3.new(4.4, 3.4, 5), CFrame.new(0, 4.6, 2.4), color)
	elseif id == "berserker" then
		addPart(model, "ClawL", Vector3.new(1.6, 1.2, 7), CFrame.new(-5.2, 1.0, -4.2), accent)
		addPart(model, "ClawR", Vector3.new(1.6, 1.2, 7), CFrame.new(5.2, 1.0, -4.2), accent)
		addPart(model, "Axe", Vector3.new(1.2, 6, 2.2), CFrame.new(6.2, 3.4, -1.2), Color3.fromRGB(220, 200, 80))
	end
end

function MechFactory.create(cfg, cframe, owner)
	local scale = cfg.scale or 1
	local model = Instance.new("Model")
	model.Name = cfg.name
	model:SetAttribute(Constants.MechIdAttr, cfg.id)
	model:SetAttribute(Constants.OwnerAttr, owner and owner.UserId or 0)
	model:SetAttribute(Constants.HealthAttr, cfg.maxHealth)
	model:SetAttribute(Constants.MaxHealthAttr, cfg.maxHealth)
	model:SetAttribute("DisplayName", cfg.name)

	local torsoSize = Vector3.new(8, 7, 6) * scale
	local torso = Util.part({
		Name = "Torso",
		Size = torsoSize,
		Color = cfg.color,
		Material = Enum.Material.Metal,
		Anchored = true,
		CFrame = cframe,
		Parent = model,
	})
	model.PrimaryPart = torso

	addPart(model, "Hip", Vector3.new(6.4, 2.2, 4.2) * scale, CFrame.new(0, -4.2 * scale, 0.2), cfg.color)
	addPart(model, "LegL", Vector3.new(2.4, 7.2, 2.8) * scale, CFrame.new(-2.2 * scale, -8.4 * scale, 0.2), Color3.fromRGB(30, 32, 36))
	addPart(model, "LegR", Vector3.new(2.4, 7.2, 2.8) * scale, CFrame.new(2.2 * scale, -8.4 * scale, 0.2), Color3.fromRGB(30, 32, 36))
	addPart(model, "FootL", Vector3.new(3.2, 1.2, 4.4) * scale, CFrame.new(-2.2 * scale, -12.2 * scale, -0.4), cfg.accent)
	addPart(model, "FootR", Vector3.new(3.2, 1.2, 4.4) * scale, CFrame.new(2.2 * scale, -12.2 * scale, -0.4), cfg.accent)
	addPart(model, "ArmL", Vector3.new(2.2, 5.4, 2.4) * scale, CFrame.new(-5.4 * scale, 0.2, 0), cfg.color)
	addPart(model, "ArmR", Vector3.new(2.2, 5.4, 2.4) * scale, CFrame.new(5.4 * scale, 0.2, 0), cfg.color)
	addPart(model, "Head", Vector3.new(3.6, 2.6, 3.2) * scale, CFrame.new(0, 4.8 * scale, 0.2), cfg.cockpit or Color3.fromRGB(20, 24, 28))
	local canopy = addPart(model, "Canopy", Vector3.new(3.2, 1.8, 2.4) * scale, CFrame.new(0, 5.2 * scale, -1.4 * scale), Color3.fromRGB(40, 180, 230), Enum.Material.Glass)
	canopy.Transparency = 0.45

	kitExtras(model, cfg)

	local cam = addPart(model, "CameraPart", Vector3.new(0.6, 0.6, 0.6), CFrame.new(0, 5.4 * scale, -2.2 * scale), Color3.fromRGB(10, 10, 10), Enum.Material.SmoothPlastic)
	cam.Transparency = 1
	cam.CanCollide = false
	cam.CanQuery = false

	local seat = Instance.new("VehicleSeat")
	seat.Name = "CockpitSeat"
	seat.Size = Vector3.new(2, 1, 2)
	seat.Transparency = 1
	seat.Anchored = true
	seat.CanCollide = false
	seat.HeadsUpDisplay = false
	seat.MaxSpeed = 0
	seat.Torque = 0
	seat.TurnSpeed = 0
	seat.CFrame = torso.CFrame * CFrame.new(0, 1.6 * scale, 0.4)
	seat.Parent = model

	local attach = Instance.new("Attachment")
	attach.Name = "Muzzle"
	attach.Position = Vector3.new(0, 1.2 * scale, -torsoSize.Z * 0.5 - 2)
	attach.Parent = torso

	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "EnterCockpit"
	prompt.ActionText = "Enter Cockpit"
	prompt.ObjectText = cfg.name
	prompt.HoldDuration = 0.4
	prompt.MaxActivationDistance = 18
	prompt.RequiresLineOfSight = false
	prompt.Parent = torso

	local exitPrompt = Instance.new("ProximityPrompt")
	exitPrompt.Name = "ExitCockpit"
	exitPrompt.ActionText = "Eject"
	exitPrompt.ObjectText = cfg.name
	exitPrompt.HoldDuration = 0.55
	exitPrompt.MaxActivationDistance = 10
	exitPrompt.RequiresLineOfSight = false
	exitPrompt.Enabled = false
	exitPrompt.Parent = seat

	local bb = Instance.new("BillboardGui")
	bb.Name = "MechPlate"
	bb.Size = UDim2.fromOffset(240, 52)
	bb.StudsOffset = Vector3.new(0, 14 * scale, 0)
	bb.AlwaysOnTop = false
	bb.MaxDistance = 400
	bb.Parent = torso
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Name = "Title"
	nameLabel.BackgroundTransparency = 1
	nameLabel.Size = UDim2.fromScale(1, 0.6)
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.TextScaled = true
	nameLabel.TextColor3 = Color3.fromRGB(240, 246, 255)
	nameLabel.TextStrokeTransparency = 0.5
	nameLabel.Text = cfg.name
	nameLabel.Parent = bb
	local ownerLabel = Instance.new("TextLabel")
	ownerLabel.Name = "Pilot"
	ownerLabel.BackgroundTransparency = 1
	ownerLabel.Position = UDim2.fromScale(0, 0.6)
	ownerLabel.Size = UDim2.fromScale(1, 0.4)
	ownerLabel.Font = Enum.Font.Gotham
	ownerLabel.TextScaled = true
	ownerLabel.TextColor3 = cfg.accent
	ownerLabel.Text = owner and (owner.DisplayName .. "  ·  MVM") or "UNASSIGNED"
	ownerLabel.Parent = bb

	CollectionService:AddTag(model, Constants.MechTag)
	model.Parent = workspace:FindFirstChild("MVMWorld") or workspace
	return model
end

function MechFactory.weldReady(model)
	local root = model.PrimaryPart
	for _, inst in ipairs(model:GetDescendants()) do
		if inst:IsA("BasePart") and inst ~= root then
			inst.Anchored = false
			inst.Massless = true
			Util.weld(root, inst)
		end
	end
	root.Anchored = true
	root.CustomPhysicalProperties = PhysicalProperties.new(2.4, 0.4, 0.2, 1, 1)
end

function MechFactory.setAnchored(model, anchored)
	if model.PrimaryPart then
		model.PrimaryPart.Anchored = anchored
	end
end

function MechFactory.setCloak(model, cloaked)
	for _, inst in ipairs(model:GetDescendants()) do
		if inst:IsA("BasePart") and inst.Name ~= "CameraPart" and inst.Name ~= "CockpitSeat" then
			inst.LocalTransparencyModifier = 0
			inst.Transparency = cloaked and 0.72 or (inst.Name == "Canopy" and 0.45 or 0)
		end
	end
	local plate = model.PrimaryPart and model.PrimaryPart:FindFirstChild("MechPlate")
	if plate then
		plate.Enabled = not cloaked
	end
end

return MechFactory
