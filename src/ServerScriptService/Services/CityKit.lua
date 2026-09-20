--[[
	MVM city kitbasher. Builds Workspace.MVMWorld.WarTornCity from a seeded
	recipe: streets, ruined building types, debris, and district pockets.
	All units are mech-scale (streets ~56–72 studs, shells 36–96 tall).
]]

local Util = require(game.ReplicatedStorage.Shared.Util)

local CityKit = {}

local rng = Random.new(20260920)

local PAL = {
	asphalt = Color3.fromRGB(44, 46, 48),
	lane = Color3.fromRGB(196, 176, 70),
	concrete = Color3.fromRGB(96, 92, 86),
	concreteDark = Color3.fromRGB(60, 58, 54),
	burned = Color3.fromRGB(38, 32, 30),
	soot = Color3.fromRGB(24, 22, 22),
	brick = Color3.fromRGB(118, 68, 54),
	brickDark = Color3.fromRGB(78, 44, 36),
	plaster = Color3.fromRGB(140, 132, 118),
	glass = Color3.fromRGB(72, 96, 108),
	glassDead = Color3.fromRGB(36, 42, 46),
	rebar = Color3.fromRGB(86, 74, 66),
	rust = Color3.fromRGB(128, 64, 36),
	dirt = Color3.fromRGB(82, 66, 48),
	rubble = Color3.fromRGB(88, 80, 70),
	water = Color3.fromRGB(28, 52, 56),
	metal = Color3.fromRGB(52, 56, 60),
	shopA = Color3.fromRGB(148, 52, 44),
	shopB = Color3.fromRGB(44, 78, 118),
	shopC = Color3.fromRGB(48, 96, 72),
	sandbag = Color3.fromRGB(118, 104, 70),
}

local function box(parent, name, size, cf, color, material)
	return Util.part({
		Name = name,
		Size = size,
		CFrame = cf,
		Color = color or PAL.concrete,
		Material = material or Enum.Material.Concrete,
		Parent = parent,
	})
end

local function pick(list)
	return list[rng:NextInteger(1, #list)]
end

local function jitter(n)
	return (rng:NextNumber() - 0.5) * n
end

local function facadeColor(kind, burned)
	if burned then
		return PAL.burned
	end
	if kind == "apartment" then
		return pick({ PAL.brick, PAL.brickDark, PAL.plaster, PAL.concrete })
	elseif kind == "office" then
		return pick({ PAL.concrete, PAL.concreteDark, PAL.glassDead })
	elseif kind == "shop" then
		return pick({ PAL.shopA, PAL.shopB, PAL.shopC, PAL.plaster })
	elseif kind == "parking" then
		return PAL.concreteDark
	elseif kind == "warehouse" then
		return pick({ PAL.metal, PAL.concreteDark, PAL.rust })
	end
	return PAL.concrete
end

function CityKit.rubble(parent, pos, radius, count)
	count = count or rng:NextInteger(4, 8)
	for i = 1, count do
		local s = rng:NextNumber(3.5, math.max(6, radius * 0.7))
		local cf = CFrame.new(pos + Vector3.new(jitter(radius), s * 0.35, jitter(radius)))
			* CFrame.Angles(jitter(0.8), jitter(3), jitter(0.8))
		box(parent, "Rubble", Vector3.new(s, s * rng:NextNumber(0.4, 0.9), s * rng:NextNumber(0.6, 1.1)), cf, PAL.rubble, Enum.Material.Slate)
	end
end

function CityKit.rebar(parent, pos, height)
	height = height or rng:NextNumber(8, 16)
	for i = 1, rng:NextInteger(2, 4) do
		box(
			parent,
			"Rebar",
			Vector3.new(0.45, height, 0.45),
			CFrame.new(pos + Vector3.new(jitter(3), height * 0.5, jitter(3))) * CFrame.Angles(jitter(0.25), 0, jitter(0.25)),
			PAL.rebar,
			Enum.Material.CorrodedMetal
		)
	end
end

function CityKit.crater(parent, pos, radius)
	box(parent, "CraterBowl", Vector3.new(radius * 2, 1.2, radius * 2), CFrame.new(pos + Vector3.new(0, 2.2, 0)), PAL.soot, Enum.Material.Asphalt)
	box(parent, "CraterRing", Vector3.new(radius * 2.4, 1.6, radius * 2.4), CFrame.new(pos + Vector3.new(0, 2.6, 0)), PAL.dirt, Enum.Material.Ground)
	CityKit.rubble(parent, pos + Vector3.new(0, 3, 0), radius * 0.7, 5)
end

function CityKit.wreck(parent, pos, kind)
	if kind == "truck" then
		box(parent, "WreckCab", Vector3.new(10, 10, 12), CFrame.new(pos + Vector3.new(0, 6, -8)) * CFrame.Angles(0, jitter(0.4), jitter(0.15)), PAL.rust, Enum.Material.Metal)
		box(parent, "WreckBed", Vector3.new(10, 6, 20), CFrame.new(pos + Vector3.new(0, 4, 8)) * CFrame.Angles(jitter(0.1), jitter(0.2), 0), PAL.metal, Enum.Material.Metal)
	elseif kind == "bus" then
		box(parent, "WreckBus", Vector3.new(12, 12, 30), CFrame.new(pos + Vector3.new(0, 6, 0)) * CFrame.Angles(0, jitter(0.5), jitter(0.12)), PAL.shopB, Enum.Material.Metal)
	else
		box(parent, "WreckCar", Vector3.new(8, 5, 16), CFrame.new(pos + Vector3.new(0, 3, 0)) * CFrame.Angles(jitter(0.4), jitter(2), jitter(0.3)), pick({ PAL.shopA, PAL.metal, PAL.burned }), Enum.Material.Metal)
	end
end

local function windows(parent, origin, width, height, stories, alongX)
	for s = 0, stories - 1 do
		if rng:NextNumber() > 0.18 then
			local broken = rng:NextNumber() < 0.45
			local strip = alongX and Vector3.new(width * 0.82, 4.2, 0.6) or Vector3.new(0.6, 4.2, width * 0.82)
			local off = Vector3.new(0, 8 + s * (height / stories), alongX and -0.2 or 0)
			if not alongX then
				off = Vector3.new(-0.2, 8 + s * (height / stories), 0)
			end
			box(
				parent,
				broken and "WindowDead" or "Window",
				strip,
				origin * CFrame.new(off),
				broken and PAL.glassDead or PAL.glass,
				broken and Enum.Material.Concrete or Enum.Material.Glass
			)
		end
	end
end

local function floors(parent, cf, sx, sz, height, stories, missing)
	local storyH = height / stories
	for s = 1, stories - 1 do
		if missing and s == missing then
			-- collapsed floor: leftover slab + hanging chunk
			box(parent, "FloorRemnant", Vector3.new(sx * 0.45, 1.4, sz * 0.55), cf * CFrame.new(-sx * 0.2, s * storyH, sz * 0.1) * CFrame.Angles(0, 0, 0.18), PAL.concreteDark)
			CityKit.rebar(parent, (cf * CFrame.new(0, s * storyH, 0)).Position, 10)
		else
			box(parent, "Floor", Vector3.new(sx - 3, 1.5, sz - 3), cf * CFrame.new(0, s * storyH, 0), PAL.concreteDark, Enum.Material.Concrete)
		end
	end
end

function CityKit.building(parent, spec)
	local kind = spec.kind
	local pos = spec.pos
	local sx, sz = spec.sx, spec.sz
	local height = spec.height
	local yaw = spec.yaw or 0
	local burned = spec.burned
	local lean = spec.lean or 0
	local stories = spec.stories or math.max(2, math.floor(height / 12))
	local missing = spec.collapsedStory
	local color = facadeColor(kind, burned)

	local model = Instance.new("Model")
	model.Name = (spec.name or kind) .. "_Ruin"
	model.Parent = parent

	local cf = CFrame.new(pos) * CFrame.Angles(0, yaw, lean)
	local wallT = 3.2

	-- three standing walls; open or blown face for readability
	local faces = {
		{ Vector3.new(sx, height, wallT), CFrame.new(0, height * 0.5, -sz * 0.5) },
		{ Vector3.new(wallT, height, sz), CFrame.new(-sx * 0.5, height * 0.5, 0) },
		{ Vector3.new(wallT, height, sz), CFrame.new(sx * 0.5, height * 0.5, 0) },
	}
	if not spec.openSouth then
		table.insert(faces, { Vector3.new(sx, height * rng:NextNumber(0.45, 1), wallT), CFrame.new(0, height * 0.28, sz * 0.5) })
	end
	for i, f in ipairs(faces) do
		local h = f[1]
		if spec.blown == i then
			h = Vector3.new(f[1].X, f[1].Y * 0.4, f[1].Z)
			box(model, "BlownWall", h, cf * f[2] * CFrame.new(0, -f[1].Y * 0.3, 0), color)
			CityKit.rebar(model, (cf * f[2]).Position + Vector3.new(0, 4, 0), 14)
		else
			box(model, "Wall", f[1], cf * f[2], color, burned and Enum.Material.Slate or Enum.Material.Concrete)
		end
	end

	-- interior slab / collapsed decks
	floors(model, cf, sx, sz, height, stories, missing)

	-- roof: intact, caved, or gone
	local roofRoll = spec.roof or pick({ "gone", "caved", "flat", "flat" })
	if roofRoll == "flat" then
		box(model, "Roof", Vector3.new(sx + 2, 2, sz + 2), cf * CFrame.new(0, height + 1, 0), PAL.concreteDark, Enum.Material.Concrete)
	elseif roofRoll == "caved" then
		box(model, "RoofSlab", Vector3.new(sx * 0.6, 2, sz * 0.7), cf * CFrame.new(sx * 0.12, height - 2, 0) * CFrame.Angles(0.2, 0, 0.08), PAL.concreteDark)
		CityKit.rubble(model, (cf * CFrame.new(0, 4, 0)).Position, math.min(sx, sz) * 0.25, 4)
	end

	-- soot streak
	if burned then
		box(model, "Soot", Vector3.new(sx * 0.4, height * 0.7, 1.2), cf * CFrame.new(jitter(sx * 0.2), height * 0.35, -sz * 0.5 - 0.4), PAL.soot, Enum.Material.SmoothPlastic)
	end

	windows(model, cf * CFrame.new(0, 0, -sz * 0.5 - 0.4), sx, height, stories, true)
	windows(model, cf * CFrame.new(-sx * 0.5 - 0.4, 0, 0), sz, height, stories, false)

	if kind == "shop" then
		box(model, "Awning", Vector3.new(sx * 0.7, 1.2, 8), cf * CFrame.new(0, 14, -sz * 0.5 - 5) * CFrame.Angles(-0.15, 0, 0), color, Enum.Material.Metal)
		box(model, "Signband", Vector3.new(sx * 0.8, 6, 1.4), cf * CFrame.new(0, 18, -sz * 0.5 - 1.2), pick({ PAL.shopA, PAL.shopB, PAL.lane }), Enum.Material.SmoothPlastic)
	elseif kind == "parking" then
		for d = 1, math.min(stories, 4) do
			box(model, "Deck", Vector3.new(sx - 4, 1.6, sz - 4), cf * CFrame.new(0, d * 12, 0), PAL.concrete, Enum.Material.Concrete)
		end
		box(model, "Ramp", Vector3.new(14, 1.8, sz * 0.8), cf * CFrame.new(sx * 0.15, 8, 0) * CFrame.Angles(-0.28, 0, 0), PAL.concrete)
		for i = -1, 1 do
			box(model, "Column", Vector3.new(3, height, 3), cf * CFrame.new(i * (sx * 0.28), height * 0.5, 0), PAL.concreteDark)
		end
	elseif kind == "apartment" then
		for i = 0, 2 do
			box(model, "Balcony", Vector3.new(10, 1.2, 5), cf * CFrame.new(-sx * 0.35 + i * 8, 16 + i * 12, -sz * 0.5 - 3), PAL.concreteDark)
		end
	elseif kind == "warehouse" then
		box(model, "BayDoor", Vector3.new(sx * 0.4, height * 0.45, 1.2), cf * CFrame.new(0, height * 0.22, -sz * 0.5 - 0.4), PAL.metal, Enum.Material.Metal)
		box(model, "Tank", Vector3.new(10, 16, 10), cf * CFrame.new(sx * 0.4, 10, sz * 0.3), PAL.rust, Enum.Material.Metal)
	end

	CityKit.rubble(model, (cf * CFrame.new(jitter(sx * 0.3), 2, sz * 0.45)).Position, 10, 5)
	return model
end

function CityKit.leaningWall(parent, pos, size, yaw)
	box(
		parent,
		"LeaningWall",
		size,
		CFrame.new(pos) * CFrame.Angles(0, yaw or 0, rng:NextNumber(0.18, 0.42)),
		PAL.concreteDark,
		Enum.Material.Concrete
	)
	CityKit.rebar(parent, pos + Vector3.new(0, size.Y * 0.3, 0), size.Y * 0.35)
end

local function streetSlab(parent, pos, sx, sz)
	box(parent, "Street", Vector3.new(sx, 2.2, sz), CFrame.new(pos + Vector3.new(0, 2.05, 0)), PAL.asphalt, Enum.Material.Asphalt)
end

local function laneMarks(parent, pos, length, alongZ)
	if alongZ then
		box(parent, "Lane", Vector3.new(1.4, 0.3, length), CFrame.new(pos + Vector3.new(0, 3.05, 0)), PAL.lane, Enum.Material.Neon)
	else
		box(parent, "Lane", Vector3.new(length, 0.3, 1.4), CFrame.new(pos + Vector3.new(0, 3.05, 0)), PAL.lane, Enum.Material.Neon)
	end
end

local function labelDistrict(parent, pos, text)
	local p = box(parent, "DistrictSign", Vector3.new(36, 10, 1.4), CFrame.new(pos), Color3.fromRGB(16, 16, 18), Enum.Material.SmoothPlastic)
	local sg = Instance.new("SurfaceGui")
	sg.Face = Enum.NormalId.Front
	sg.Parent = p
	local t = Instance.new("TextLabel")
	t.BackgroundTransparency = 1
	t.Size = UDim2.fromScale(1, 1)
	t.Font = Enum.Font.GothamBlack
	t.TextScaled = true
	t.TextColor3 = Color3.fromRGB(230, 210, 150)
	t.Text = text
	t.Parent = sg
end

local function buildGround(city)
	local ground = Instance.new("Folder")
	ground.Name = "Ground"
	ground.Parent = city

	-- South city plate (hangar edge → canal lip at z≈468)
	box(ground, "SouthPlate", Vector3.new(920, 3, 448), CFrame.new(0, 1.5, 244), PAL.asphalt, Enum.Material.Asphalt)
	-- North city plate (beyond canal lip at z≈532)
	box(ground, "NorthPlate", Vector3.new(920, 3, 400), CFrame.new(0, 1.5, 732), PAL.asphalt, Enum.Material.Asphalt)
	-- East / west berms so the map does not drop into void at the sides
	box(ground, "WestBerm", Vector3.new(40, 18, 920), CFrame.new(-470, 9, 460), PAL.dirt, Enum.Material.Slate)
	box(ground, "EastBerm", Vector3.new(40, 18, 920), CFrame.new(470, 9, 460), PAL.dirt, Enum.Material.Slate)
	box(ground, "NorthBerm", Vector3.new(960, 22, 28), CFrame.new(0, 11, 940), PAL.dirt, Enum.Material.Slate)
end

local function buildStreets(city)
	local streets = Instance.new("Folder")
	streets.Name = "Streets"
	streets.Parent = city

	-- North–south boulevards (mech-wide)
	for _, x in ipairs({ -210, 0, 210 }) do
		streetSlab(streets, Vector3.new(x, 0, 270), 64, 500)
		laneMarks(streets, Vector3.new(x, 0, 260), 420, true)
	end
	streetSlab(streets, Vector3.new(0, 0, 740), 64, 360)
	laneMarks(streets, Vector3.new(0, 0, 740), 300, true)

	-- East–west arteries
	for _, z in ipairs({ 140, 260, 380 }) do
		streetSlab(streets, Vector3.new(0, 0, z), 820, 60)
		laneMarks(streets, Vector3.new(0, 0, z), 700, false)
	end
	streetSlab(streets, Vector3.new(0, 0, 660), 820, 56)
	streetSlab(streets, Vector3.new(0, 0, 820), 700, 56)

	-- cratered intersections
	CityKit.crater(streets, Vector3.new(-8, 0, 262), 22)
	CityKit.crater(streets, Vector3.new(200, 0, 378), 16)
	CityKit.crater(streets, Vector3.new(-190, 0, 148), 14)
	CityKit.crater(streets, Vector3.new(40, 0, 668), 18)
end

local function downtown(city)
	local folder = Instance.new("Folder")
	folder.Name = "Downtown"
	folder.Parent = city
	labelDistrict(folder, Vector3.new(-40, 28, 118), "DOWNTOWN  ·  RUINS")

	local plots = {
		{ kind = "office", pos = Vector3.new(-120, 3, 190), sx = 70, sz = 50, height = 84, stories = 7, collapsedStory = 4, blown = 1 },
		{ kind = "office", pos = Vector3.new(-120, 3, 320), sx = 64, sz = 56, height = 72, stories = 6, burned = true, roof = "caved" },
		{ kind = "office", pos = Vector3.new(120, 3, 190), sx = 60, sz = 48, height = 96, stories = 8, openSouth = true },
		{ kind = "office", pos = Vector3.new(128, 3, 330), sx = 72, sz = 52, height = 66, stories = 5, lean = 0.06, roof = "gone" },
		{ kind = "apartment", pos = Vector3.new(-320, 3, 200), sx = 56, sz = 48, height = 70, stories = 6, burned = true },
		{ kind = "apartment", pos = Vector3.new(320, 3, 200), sx = 52, sz = 50, height = 58, stories = 5, collapsedStory = 3 },
		{ kind = "office", pos = Vector3.new(-320, 3, 330), sx = 58, sz = 46, height = 80, stories = 7, roof = "caved" },
		{ kind = "apartment", pos = Vector3.new(318, 3, 330), sx = 60, sz = 48, height = 64, stories = 5, blown = 2 },
	}
	for _, spec in ipairs(plots) do
		CityKit.building(folder, spec)
	end
	CityKit.leaningWall(folder, Vector3.new(40, 22, 210), Vector3.new(40, 36, 4), 0.4)
	CityKit.wreck(folder, Vector3.new(-30, 3, 200), "bus")
	CityKit.wreck(folder, Vector3.new(36, 3, 318), "truck")
end

local function residential(city)
	local folder = Instance.new("Folder")
	folder.Name = "Residential"
	folder.Parent = city
	labelDistrict(folder, Vector3.new(-300, 22, 430), "TENEMENTS")

	local plots = {
		{ kind = "apartment", pos = Vector3.new(-320, 3, 430), sx = 48, sz = 40, height = 54, stories = 5, burned = true },
		{ kind = "apartment", pos = Vector3.new(-230, 3, 430), sx = 44, sz = 42, height = 48, stories = 4, collapsedStory = 2, roof = "gone" },
		{ kind = "apartment", pos = Vector3.new(230, 3, 430), sx = 50, sz = 40, height = 60, stories = 5, lean = -0.05 },
		{ kind = "apartment", pos = Vector3.new(320, 3, 430), sx = 46, sz = 44, height = 42, stories = 4, blown = 1 },
		{ kind = "apartment", pos = Vector3.new(-320, 3, 700), sx = 52, sz = 46, height = 66, stories = 6, burned = true, roof = "caved" },
		{ kind = "apartment", pos = Vector3.new(300, 3, 700), sx = 48, sz = 44, height = 50, stories = 4, openSouth = true },
		{ kind = "apartment", pos = Vector3.new(-210, 3, 820), sx = 56, sz = 40, height = 58, stories = 5 },
		{ kind = "apartment", pos = Vector3.new(200, 3, 820), sx = 50, sz = 42, height = 46, stories = 4, collapsedStory = 3 },
	}
	for _, spec in ipairs(plots) do
		CityKit.building(folder, spec)
	end
	for _, p in ipairs({ Vector3.new(-260, 3, 390), Vector3.new(260, 3, 470), Vector3.new(-80, 3, 780) }) do
		CityKit.rubble(folder, p, 16, 7)
	end
end

local function market(city)
	local folder = Instance.new("Folder")
	folder.Name = "Market"
	folder.Parent = city
	labelDistrict(folder, Vector3.new(40, 18, 430), "MARKET ROW")

	local shops = {
		{ kind = "shop", pos = Vector3.new(-90, 3, 430), sx = 36, sz = 28, height = 28, stories = 2, burned = true },
		{ kind = "shop", pos = Vector3.new(-40, 3, 430), sx = 32, sz = 26, height = 24, stories = 2, roof = "caved" },
		{ kind = "shop", pos = Vector3.new(50, 3, 430), sx = 34, sz = 28, height = 30, stories = 2 },
		{ kind = "shop", pos = Vector3.new(100, 3, 430), sx = 30, sz = 26, height = 22, stories = 2, blown = 1 },
		{ kind = "shop", pos = Vector3.new(-90, 3, 200), sx = 34, sz = 24, height = 26, stories = 2 },
		{ kind = "shop", pos = Vector3.new(90, 3, 200), sx = 36, sz = 24, height = 24, stories = 2, burned = true },
	}
	for _, spec in ipairs(shops) do
		CityKit.building(folder, spec)
	end
	CityKit.wreck(folder, Vector3.new(8, 3, 430), "car")
	CityKit.wreck(folder, Vector3.new(-12, 3, 448), "car")
end

local function parking(city)
	local folder = Instance.new("Folder")
	folder.Name = "Parking"
	folder.Parent = city
	CityKit.building(folder, {
		kind = "parking",
		name = "GarageWest",
		pos = Vector3.new(-210, 3, 190),
		sx = 70,
		sz = 60,
		height = 44,
		stories = 4,
		roof = "gone",
		openSouth = true,
	})
	CityKit.building(folder, {
		kind = "parking",
		name = "GarageEast",
		pos = Vector3.new(220, 3, 320),
		sx = 66,
		sz = 58,
		height = 40,
		stories = 3,
		collapsedStory = 2,
	})
	CityKit.wreck(folder, Vector3.new(-180, 3, 160), "car")
	CityKit.wreck(folder, Vector3.new(190, 3, 300), "truck")
end

local function plaza(city)
	local folder = Instance.new("Folder")
	folder.Name = "Plaza"
	folder.Parent = city
	labelDistrict(folder, Vector3.new(0, 26, 248), "LIBERTY PLAZA  ·  FFA")

	box(folder, "PlazaSlab", Vector3.new(140, 1.2, 110), CFrame.new(0, 2.9, 300), Color3.fromRGB(72, 70, 66), Enum.Material.Concrete)
	box(folder, "FountainRing", Vector3.new(28, 4, 28), CFrame.new(0, 5, 300), PAL.concreteDark)
	box(folder, "FountainWater", Vector3.new(18, 1, 18), CFrame.new(0, 4.2, 300), PAL.water, Enum.Material.Glass)
	CityKit.rubble(folder, Vector3.new(0, 4, 300), 12, 8)
	CityKit.leaningWall(folder, Vector3.new(-48, 16, 268), Vector3.new(8, 28, 36), 1.1)
	box(folder, "StatueBase", Vector3.new(14, 6, 14), CFrame.new(46, 6, 268), PAL.concrete)
	box(folder, "StatueChunk", Vector3.new(8, 16, 8), CFrame.new(50, 14, 262) * CFrame.Angles(0.6, 0.4, 0.2), PAL.plaster)
	CityKit.crater(folder, Vector3.new(20, 0, 330), 18)
end

local function industrial(city)
	local folder = Instance.new("Folder")
	folder.Name = "Industrial"
	folder.Parent = city
	labelDistrict(folder, Vector3.new(300, 22, 560), "INDUSTRIAL YARD")

	box(folder, "Yard", Vector3.new(200, 1.4, 160), CFrame.new(300, 3, 560), Color3.fromRGB(70, 64, 52), Enum.Material.Ground)
	CityKit.building(folder, {
		kind = "warehouse",
		pos = Vector3.new(280, 3, 530),
		sx = 80,
		sz = 48,
		height = 36,
		stories = 2,
		burned = true,
		roof = "caved",
	})
	CityKit.building(folder, {
		kind = "warehouse",
		pos = Vector3.new(360, 3, 600),
		sx = 64,
		sz = 44,
		height = 32,
		stories = 2,
		blown = 1,
	})
	for i = 0, 3 do
		box(folder, "Container", Vector3.new(10, 10, 24), CFrame.new(240 + (i % 2) * 14, 8, 600 + i * 16), (i % 2 == 0) and PAL.shopA or PAL.shopB, Enum.Material.Metal)
	end
	box(folder, "Silo", Vector3.new(16, 36, 16), CFrame.new(380, 20, 520), PAL.metal, Enum.Material.Metal)
	box(folder, "CraneArm", Vector3.new(60, 3, 4), CFrame.new(320, 34, 560), PAL.rust, Enum.Material.Metal)
	box(folder, "CraneMast", Vector3.new(4, 40, 4), CFrame.new(292, 22, 560), PAL.metal, Enum.Material.Metal)
	CityKit.wreck(folder, Vector3.new(250, 3, 540), "truck")
	CityKit.rubble(folder, Vector3.new(330, 3, 580), 18, 8)
end

local function freeway(city)
	local folder = Instance.new("Folder")
	folder.Name = "Freeway"
	folder.Parent = city
	labelDistrict(folder, Vector3.new(-300, 40, 258), "OVERPASS  7")

	-- elevated deck across midtown, missing span near center-east
	for i = -4, 4 do
		local x = i * 88
		if i == 1 then
			-- collapsed span on the street
			box(folder, "FallenDeck", Vector3.new(70, 4, 28), CFrame.new(x + 10, 10, 260) * CFrame.Angles(0, 0, 0.32), PAL.concreteDark)
			CityKit.rubble(folder, Vector3.new(x, 3, 260), 16, 6)
		else
			box(folder, "Deck", Vector3.new(84, 3.4, 30), CFrame.new(x, 28, 260), PAL.concrete, Enum.Material.Concrete)
			box(folder, "RailN", Vector3.new(84, 3, 1.2), CFrame.new(x, 31, 246), PAL.metal, Enum.Material.Metal)
			box(folder, "RailS", Vector3.new(84, 3, 1.2), CFrame.new(x, 31, 274), PAL.metal, Enum.Material.Metal)
		end
		if i ~= 1 then
			box(folder, "Pier", Vector3.new(8, 26, 8), CFrame.new(x, 14, 248), PAL.concreteDark)
			box(folder, "Pier", Vector3.new(8, 26, 8), CFrame.new(x, 14, 272), PAL.concreteDark)
		end
	end
	CityKit.wreck(folder, Vector3.new(-120, 29, 260), "car")
	CityKit.wreck(folder, Vector3.new(200, 3, 248), "bus")
end

local function canal(city)
	local folder = Instance.new("Folder")
	folder.Name = "Canal"
	folder.Parent = city
	labelDistrict(folder, Vector3.new(-80, 24, 500), "CANAL  ·  BRIDGES DOWN")

	box(folder, "Water", Vector3.new(900, 8, 56), CFrame.new(0, -4, 500), PAL.water, Enum.Material.Glass)
	box(folder, "WallS", Vector3.new(900, 16, 6), CFrame.new(0, 4, 470), PAL.concreteDark)
	box(folder, "WallN", Vector3.new(900, 16, 6), CFrame.new(0, 4, 530), PAL.concreteDark)

	-- Main boulevard bridge — walkable but scarred
	box(folder, "BridgeDeck", Vector3.new(56, 3, 72), CFrame.new(0, 12, 500), PAL.concrete)
	box(folder, "BridgeRailL", Vector3.new(2, 5, 72), CFrame.new(-26, 15, 500), PAL.metal, Enum.Material.Metal)
	box(folder, "BridgeRailR", Vector3.new(2, 5, 72), CFrame.new(26, 15, 500), PAL.metal, Enum.Material.Metal)
	box(folder, "ApproachS", Vector3.new(56, 3, 28), CFrame.new(0, 8, 458) * CFrame.Angles(-0.22, 0, 0), PAL.concrete)
	box(folder, "ApproachN", Vector3.new(56, 3, 28), CFrame.new(0, 8, 542) * CFrame.Angles(0.22, 0, 0), PAL.concrete)
	CityKit.crater(folder, Vector3.new(8, 8, 500), 8)

	-- West bridge collapsed into the water
	box(folder, "WreckSpan", Vector3.new(40, 3, 50), CFrame.new(-210, 2, 496) * CFrame.Angles(0.35, 0.1, 0.2), PAL.concreteDark)
	box(folder, "WreckPier", Vector3.new(8, 22, 8), CFrame.new(-210, 6, 472), PAL.concrete)
	CityKit.rebar(folder, Vector3.new(-200, 6, 500), 18)

	-- East bridge missing mid-span (gap) with one remaining pier
	box(folder, "EastApproachS", Vector3.new(40, 3, 22), CFrame.new(210, 10, 466), PAL.concrete)
	box(folder, "EastApproachN", Vector3.new(40, 3, 22), CFrame.new(210, 10, 534), PAL.concrete)
	box(folder, "EastPier", Vector3.new(7, 20, 7), CFrame.new(210, 6, 500), PAL.concreteDark)
	box(folder, "HangingSlab", Vector3.new(18, 2.4, 16), CFrame.new(218, 9, 488) * CFrame.Angles(0.5, 0, 0.1), PAL.concreteDark)

	-- stepping wreckage under the west span
	for i = -1, 1 do
		box(folder, "Stepping", Vector3.new(16, 6, 14), CFrame.new(-210 + i * 4, 1, 500 + i * 8) * CFrame.Angles(0.1, 0, 0.05), PAL.rubble, Enum.Material.Slate)
	end
end

local function subway(city)
	local folder = Instance.new("Folder")
	folder.Name = "Subway"
	folder.Parent = city
	labelDistrict(folder, Vector3.new(-200, 16, 660), "METRO  ·  CRATER")

	CityKit.crater(folder, Vector3.new(-200, 0, 660), 36)
	box(folder, "Pit", Vector3.new(48, 18, 48), CFrame.new(-200, -6, 660), PAL.soot, Enum.Material.Slate)
	box(folder, "Tunnel", Vector3.new(70, 14, 18), CFrame.new(-200, -4, 700), PAL.concreteDark)
	box(folder, "Kiosk", Vector3.new(16, 12, 16), CFrame.new(-168, 8, 640), PAL.metal, Enum.Material.Metal)
	box(folder, "Escalator", Vector3.new(10, 2, 24), CFrame.new(-188, 4, 640) * CFrame.Angles(-0.4, 0.6, 0), PAL.metal, Enum.Material.Metal)
	CityKit.rebar(folder, Vector3.new(-200, 4, 660), 16)
	CityKit.rubble(folder, Vector3.new(-176, 3, 670), 14, 6)
	CityKit.wreck(folder, Vector3.new(-150, 3, 680), "bus")
end

local function approach(city)
	local folder = Instance.new("Folder")
	folder.Name = "Boulevard"
	folder.Parent = city

	streetSlab(folder, Vector3.new(0, 0, 70), 72, 90)
	laneMarks(folder, Vector3.new(0, 0, 70), 80, true)
	box(folder, "MedianWreck", Vector3.new(8, 4, 24), CFrame.new(0, 5, 88), PAL.concreteDark)
	CityKit.wreck(folder, Vector3.new(-22, 3, 70), "car")
	CityKit.wreck(folder, Vector3.new(24, 3, 96), "truck")
	CityKit.building(folder, { kind = "shop", pos = Vector3.new(-70, 3, 90), sx = 32, sz = 24, height = 26, stories = 2, burned = true })
	CityKit.building(folder, { kind = "shop", pos = Vector3.new(72, 3, 90), sx = 30, sz = 24, height = 22, stories = 2, roof = "caved" })
	CityKit.leaningWall(folder, Vector3.new(-48, 14, 50), Vector3.new(6, 24, 22), 0.2)
end

local function skylineStubs(city)
	local folder = Instance.new("Folder")
	folder.Name = "Skyline"
	folder.Parent = city
	local stubs = {
		Vector3.new(-400, 3, 260),
		Vector3.new(400, 3, 380),
		Vector3.new(-380, 3, 820),
		Vector3.new(390, 3, 820),
		Vector3.new(-400, 3, 600),
		Vector3.new(400, 3, 180),
	}
	for i, p in ipairs(stubs) do
		CityKit.building(folder, {
			kind = (i % 2 == 0) and "office" or "apartment",
			pos = p,
			sx = 40 + (i % 3) * 8,
			sz = 36,
			height = 40 + i * 6,
			stories = 4 + i % 3,
			roof = "gone",
			blown = 1,
			burned = i % 2 == 1,
		})
	end
end

function CityKit.build(world)
	local city = Instance.new("Folder")
	city.Name = "WarTornCity"
	city.Parent = world

	buildGround(city)
	buildStreets(city)
	approach(city)
	downtown(city)
	plaza(city)
	market(city)
	parking(city)
	residential(city)
	industrial(city)
	freeway(city)
	canal(city)
	subway(city)
	skylineStubs(city)

	-- scattered street debris so lanes are not empty
	local debris = Instance.new("Folder")
	debris.Name = "StreetDebris"
	debris.Parent = city
	local spots = {
		Vector3.new(-40, 3, 150),
		Vector3.new(60, 3, 150),
		Vector3.new(-80, 3, 380),
		Vector3.new(90, 3, 380),
		Vector3.new(-40, 3, 660),
		Vector3.new(70, 3, 820),
		Vector3.new(180, 3, 140),
		Vector3.new(-180, 3, 380),
	}
	for i, p in ipairs(spots) do
		CityKit.rubble(debris, p, 12, 5)
		if i % 2 == 0 then
			CityKit.wreck(debris, p + Vector3.new(16, 0, 4), pick({ "car", "truck", "bus" }))
		end
	end

	return city
end

return CityKit
