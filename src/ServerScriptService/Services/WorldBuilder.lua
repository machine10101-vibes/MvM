local Lighting = game:GetService("Lighting")
local Workspace = game:GetService("Workspace")

local Constants = require(game.ReplicatedStorage.Shared.Constants)
local Util = require(game.ReplicatedStorage.Shared.Util)
local CityKit = require(script.Parent.CityKit)

local WorldBuilder = {}

local function neon(parent, size, cframe, color)
	return Util.part({
		Name = "Neon",
		Size = size,
		CFrame = cframe,
		Color = color,
		Material = Enum.Material.Neon,
		CanCollide = false,
		Parent = parent,
	})
end

local function box(parent, name, size, cframe, color, material)
	return Util.part({
		Name = name,
		Size = size,
		CFrame = cframe,
		Color = color,
		Material = material or Enum.Material.Concrete,
		Parent = parent,
	})
end

local function setupLighting()
	-- Dusk over a burning city: long haze, warm decay, short readable fog.
	Lighting.ClockTime = 17.15
	Lighting.Brightness = 1.7
	Lighting.Ambient = Color3.fromRGB(42, 38, 40)
	Lighting.OutdoorAmbient = Color3.fromRGB(96, 82, 72)
	Lighting.FogColor = Color3.fromRGB(92, 78, 68)
	Lighting.FogStart = 220
	Lighting.FogEnd = 1600

	local at = Lighting:FindFirstChild("MVMAtmosphere") or Instance.new("Atmosphere")
	at.Name = "MVMAtmosphere"
	at.Density = 0.42
	at.Offset = 0.25
	at.Color = Color3.fromRGB(160, 140, 120)
	at.Decay = Color3.fromRGB(80, 48, 32)
	at.Glare = 0.15
	at.Haze = 2.1
	at.Parent = Lighting

	local cc = Lighting:FindFirstChild("MVMColor") or Instance.new("ColorCorrectionEffect")
	cc.Name = "MVMColor"
	cc.Saturation = 0.04
	cc.Contrast = 0.1
	cc.TintColor = Color3.fromRGB(255, 228, 210)
	cc.Parent = Lighting
end

local function buildHangar(world)
	local hangar = Instance.new("Folder")
	hangar.Name = "Hangar"
	hangar.Parent = world

	-- Fortified district slab at the south edge of the city.
	box(hangar, "Apron", Vector3.new(180, 3, 130), CFrame.new(0, 1.5, -44), Color3.fromRGB(58, 60, 64), Enum.Material.Concrete)
	box(hangar, "Floor", Vector3.new(88, 2, 64), CFrame.new(0, 2.1, -72), Color3.fromRGB(48, 50, 56), Enum.Material.DiamondPlate)

	box(hangar, "WallL", Vector3.new(3, 28, 64), CFrame.new(-44, 16, -72), Color3.fromRGB(40, 44, 50), Enum.Material.Metal)
	box(hangar, "WallR", Vector3.new(3, 28, 64), CFrame.new(44, 16, -72), Color3.fromRGB(40, 44, 50), Enum.Material.Metal)
	box(hangar, "WallBack", Vector3.new(91, 28, 3), CFrame.new(0, 16, -103), Color3.fromRGB(36, 40, 46), Enum.Material.Metal)
	box(hangar, "Roof", Vector3.new(94, 2, 70), CFrame.new(0, 31, -74), Color3.fromRGB(32, 34, 40), Enum.Material.Metal)

	box(hangar, "BayL", Vector3.new(4, 26, 4), CFrame.new(-42, 15, -40), Color3.fromRGB(28, 30, 34), Enum.Material.Metal)
	box(hangar, "BayR", Vector3.new(4, 26, 4), CFrame.new(42, 15, -40), Color3.fromRGB(28, 30, 34), Enum.Material.Metal)
	box(hangar, "BayBeam", Vector3.new(88, 3, 4), CFrame.new(0, 29, -40), Color3.fromRGB(24, 26, 30), Enum.Material.Metal)

	neon(hangar, Vector3.new(86, 0.4, 0.4), CFrame.new(0, 28, -39), Color3.fromRGB(70, 200, 255))
	neon(hangar, Vector3.new(0.4, 24, 0.4), CFrame.new(-42, 16, -39), Color3.fromRGB(70, 200, 255))
	neon(hangar, Vector3.new(0.4, 24, 0.4), CFrame.new(42, 16, -39), Color3.fromRGB(70, 200, 255))

	for i = -1, 1 do
		box(hangar, "Crate", Vector3.new(8, 6, 6), CFrame.new(-30 + i * 2, 6, -90), Color3.fromRGB(92, 70, 42), Enum.Material.Wood)
		box(hangar, "Crate", Vector3.new(6, 4, 8), CFrame.new(32, 5, -88 + i * 8), Color3.fromRGB(70, 76, 84), Enum.Material.Metal)
	end

	-- Curtain wall facing the warzone, gate on the boulevard.
	box(hangar, "BlastL", Vector3.new(70, 22, 6), CFrame.new(-70, 12, 8), Color3.fromRGB(48, 50, 54), Enum.Material.Concrete)
	box(hangar, "BlastR", Vector3.new(70, 22, 6), CFrame.new(70, 12, 8), Color3.fromRGB(48, 50, 54), Enum.Material.Concrete)
	box(hangar, "GateTowerL", Vector3.new(10, 34, 10), CFrame.new(-38, 18, 8), Color3.fromRGB(36, 38, 42), Enum.Material.Metal)
	box(hangar, "GateTowerR", Vector3.new(10, 34, 10), CFrame.new(38, 18, 8), Color3.fromRGB(36, 38, 42), Enum.Material.Metal)
	box(hangar, "GateBeam", Vector3.new(70, 4, 6), CFrame.new(0, 32, 8), Color3.fromRGB(28, 30, 34), Enum.Material.Metal)
	neon(hangar, Vector3.new(66, 0.5, 0.5), CFrame.new(0, 31, 11), Color3.fromRGB(255, 160, 40))

	for i = -3, 3 do
		if math.abs(i) > 1 then
			box(hangar, "Sandbag", Vector3.new(12, 4, 5), CFrame.new(i * 16, 5, -8), Color3.fromRGB(118, 104, 70), Enum.Material.Sandstone)
		end
	end

	local sign = box(hangar, "BrandWall", Vector3.new(40, 10, 1), CFrame.new(0, 18, -101.2), Color3.fromRGB(18, 20, 24), Enum.Material.SmoothPlastic)
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Front
	gui.Parent = sign
	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.Size = UDim2.fromScale(1, 0.62)
	title.Font = Enum.Font.GothamBlack
	title.TextScaled = true
	title.TextColor3 = Color3.fromRGB(240, 248, 255)
	title.Text = "MVM"
	title.Parent = gui
	local sub = Instance.new("TextLabel")
	sub.BackgroundTransparency = 1
	sub.Position = UDim2.fromScale(0, 0.62)
	sub.Size = UDim2.fromScale(1, 0.32)
	sub.Font = Enum.Font.GothamBold
	sub.TextScaled = true
	sub.TextColor3 = Color3.fromRGB(90, 210, 255)
	sub.Text = "MECH VS MECH"
	sub.Parent = gui

	local gateSign = box(hangar, "GateSign", Vector3.new(48, 8, 1.2), CFrame.new(0, 24, 11.2), Color3.fromRGB(14, 14, 16), Enum.Material.SmoothPlastic)
	local gsg = Instance.new("SurfaceGui")
	gsg.Face = Enum.NormalId.Front
	gsg.Parent = gateSign
	local gt = Instance.new("TextLabel")
	gt.BackgroundTransparency = 1
	gt.Size = UDim2.fromScale(1, 1)
	gt.Font = Enum.Font.GothamBlack
	gt.TextScaled = true
	gt.TextColor3 = Color3.fromRGB(255, 200, 90)
	gt.Text = "FORTIFIED DISTRICT  ·  CITY GATE"
	gt.Parent = gsg

	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "HangarSpawn"
	spawn.Size = Vector3.new(16, 1, 16)
	spawn.CFrame = CFrame.new(Constants.HangarSpawn.X, 3.6, Constants.HangarSpawn.Z)
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Duration = 0
	spawn.BrickColor = BrickColor.new("Bright blue")
	spawn.Material = Enum.Material.Neon
	spawn.Transparency = 0.35
	spawn.Parent = hangar
	Util.billboard(spawn, "PILOT SPAWN", UDim2.fromOffset(220, 36), Vector3.new(0, 4, 0))

	return hangar
end

local function buildSelectionStation(world)
	local station = Instance.new("Model")
	station.Name = "SelectionStation"
	station.Parent = world

	local base = box(station, "Base", Vector3.new(18, 1.2, 18), CFrame.new(0, 3.4, -62), Color3.fromRGB(28, 32, 40), Enum.Material.Metal)
	station.PrimaryPart = base
	box(station, "Ring", Vector3.new(16, 0.4, 16), CFrame.new(0, 4.1, -62), Color3.fromRGB(40, 160, 220), Enum.Material.Neon)
	local console = box(station, "Console", Vector3.new(6, 4, 4), CFrame.new(0, 6.2, -62), Color3.fromRGB(22, 26, 32), Enum.Material.SmoothPlastic)
	box(station, "Holo", Vector3.new(3.4, 2.2, 0.3), CFrame.new(0, 8.6, -62), Color3.fromRGB(70, 220, 255), Enum.Material.Neon)

	local screen = Instance.new("SurfaceGui")
	screen.Face = Enum.NormalId.Front
	screen.Parent = console
	local label = Instance.new("TextLabel")
	label.BackgroundColor3 = Color3.fromRGB(8, 12, 18)
	label.Size = UDim2.fromScale(1, 1)
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextColor3 = Color3.fromRGB(200, 240, 255)
	label.Text = "MVM\nSELECT MECH"
	label.Parent = screen

	Util.billboard(console, "SELECTION STATION  ·  HOLD TO OPEN CATALOG", UDim2.fromOffset(420, 48), Vector3.new(0, 6, 0))

	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "OpenCatalog"
	prompt.ActionText = "Open Mech Catalog"
	prompt.ObjectText = "MVM Selection Station"
	prompt.HoldDuration = 0.35
	prompt.MaxActivationDistance = 14
	prompt.RequiresLineOfSight = false
	prompt.Parent = console

	return station
end

local function buildDeliveryPad(world)
	local pad = Instance.new("Model")
	pad.Name = "DeliveryPad"
	pad.Parent = world

	local deck = box(pad, "Deck", Vector3.new(36, 1, 36), CFrame.new(Constants.DeliveryPad), Color3.fromRGB(36, 40, 48), Enum.Material.DiamondPlate)
	pad.PrimaryPart = deck
	box(pad, "Paint", Vector3.new(28, 0.2, 28), CFrame.new(0, 3.55, 12), Color3.fromRGB(40, 180, 220), Enum.Material.Neon)
	box(pad, "CrossA", Vector3.new(22, 0.25, 1.4), CFrame.new(0, 3.65, 12), Color3.fromRGB(255, 220, 80), Enum.Material.Neon)
	box(pad, "CrossB", Vector3.new(1.4, 0.25, 22), CFrame.new(0, 3.65, 12), Color3.fromRGB(255, 220, 80), Enum.Material.Neon)

	for i = 0, 3 do
		local a = i * math.pi / 2
		box(pad, "Beacon", Vector3.new(1.5, 6, 1.5), CFrame.new(math.cos(a) * 16, 6.5, 12 + math.sin(a) * 16), Color3.fromRGB(255, 180, 40), Enum.Material.Neon)
	end

	Util.billboard(deck, "HELICOPTER DROP PAD", UDim2.fromOffset(320, 40), Vector3.new(0, 10, 0))
	return pad
end

function WorldBuilder.build()
	setupLighting()

	local existing = Workspace:FindFirstChild("MVMWorld")
	if existing then
		existing:Destroy()
	end

	for _, name in ipairs({ "Baseplate", "SpawnLocation" }) do
		local inst = Workspace:FindFirstChild(name)
		if inst and inst:IsA("BasePart") then
			inst:Destroy()
		end
	end

	local world = Instance.new("Folder")
	world.Name = "MVMWorld"
	world.Parent = Workspace

	buildHangar(world)
	buildSelectionStation(world)
	buildDeliveryPad(world)
	CityKit.build(world)

	local kill = Util.part({
		Name = "KillPlane",
		Size = Vector3.new(1600, 4, 1800),
		CFrame = CFrame.new(0, -40, 420),
		Transparency = 1,
		CanCollide = false,
		Parent = world,
	})
	kill.Touched:Connect(function(hit)
		local model = hit:FindFirstAncestorOfClass("Model")
		local hum = model and model:FindFirstChildOfClass("Humanoid")
		if hum and hum.Health > 0 then
			hum.Health = 0
		end
	end)

	return world
end

function WorldBuilder.selectionPrompt()
	local world = Workspace:FindFirstChild("MVMWorld")
	local station = world and world:FindFirstChild("SelectionStation")
	local console = station and station:FindFirstChild("Console")
	return console and console:FindFirstChild("OpenCatalog")
end

function WorldBuilder.padCFrame()
	return CFrame.new(Constants.DeliveryPad + Vector3.new(0, 8, 0))
end

return WorldBuilder
