local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Remotes = require(game.ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Remotes"))
local Theme = require(script.Parent.Theme)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local SelectionController = {}
local screen, selectedId, cards, detail

local function statBar(parent, y, name, value)
	local row = Instance.new("Frame")
	row.BackgroundTransparency = 1
	row.Size = UDim2.new(1, 0, 0, 22)
	row.Position = UDim2.new(0, 0, 0, y)
	row.Parent = parent
	Theme.label(row, { text = name, size = UDim2.new(0.34, 0, 1, 0), color = Theme.muted, scaled = true })
	local track = Instance.new("Frame")
	track.BackgroundColor3 = Color3.fromRGB(24, 32, 42)
	track.Size = UDim2.new(0.64, 0, 0.55, 0)
	track.Position = UDim2.new(0.36, 0, 0.22, 0)
	track.Parent = row
	Theme.corner(track, 3)
	local fill = Instance.new("Frame")
	fill.BackgroundColor3 = Theme.accent
	fill.Size = UDim2.new(value / 10, 0, 1, 0)
	fill.Parent = track
	Theme.corner(fill, 3)
end

local function showDetail(cfg)
	if not detail then
		return
	end
	detail:ClearAllChildren()
	Theme.pad(detail, 16)

	Theme.label(detail, {
		text = cfg.name,
		font = Enum.Font.GothamBlack,
		size = UDim2.new(1, 0, 0, 32),
		color = Theme.text,
	})
	Theme.label(detail, {
		text = string.upper(cfg.role) .. "  ·  MVM",
		font = Enum.Font.GothamBold,
		size = UDim2.new(1, 0, 0, 20),
		pos = UDim2.new(0, 0, 0, 34),
		color = cfg.accent,
	})
	Theme.label(detail, {
		text = cfg.blurb,
		size = UDim2.new(1, 0, 0, 52),
		pos = UDim2.new(0, 0, 0, 58),
		color = Theme.muted,
		wrap = true,
	})

	statBar(detail, 118, "ARMOR", cfg.armor)
	statBar(detail, 142, "SPEED", cfg.speed)
	Theme.label(detail, {
		text = "HULL  " .. tostring(cfg.maxHealth),
		size = UDim2.new(1, 0, 0, 20),
		pos = UDim2.new(0, 0, 0, 168),
		color = Theme.text,
	})

	local y = 196
	local order = { "primary", "secondary", "specialQ", "specialE" }
	for _, slot in ipairs(order) do
		local w = cfg.weapons[slot]
		if w then
			Theme.label(detail, {
				text = w.button .. "  " .. w.name,
				font = Enum.Font.GothamBold,
				size = UDim2.new(1, 0, 0, 20),
				pos = UDim2.new(0, 0, 0, y),
				color = Theme.amber,
			})
			y += 22
		end
	end

	local confirm = Theme.button(detail, {
		text = "CONFIRM  ·  CALL DROPSHIP",
		size = UDim2.new(1, 0, 0, 44),
		pos = UDim2.new(0, 0, 1, -52),
		bg = Color3.fromRGB(16, 70, 88),
		stroke = Theme.amber,
	})
	confirm.Activated:Connect(function()
		if selectedId then
			Remotes.fireServer("SelectMech", selectedId)
			SelectionController.close()
		end
	end)
end

local function makeCard(parent, cfg, index)
	local card = Theme.button(parent, {
		text = "",
		size = UDim2.new(0.48, -6, 0, 72),
		bg = Theme.panelAlt,
	})
	card.LayoutOrder = index
	card.AutomaticSize = Enum.AutomaticSize.None

	local swatch = Instance.new("Frame")
	swatch.Size = UDim2.new(0, 10, 1, -12)
	swatch.Position = UDim2.new(0, 8, 0, 6)
	swatch.BackgroundColor3 = cfg.color
	swatch.Parent = card
	Theme.corner(swatch, 3)

	Theme.label(card, {
		text = cfg.name,
		font = Enum.Font.GothamBold,
		size = UDim2.new(1, -28, 0, 28),
		pos = UDim2.new(0, 24, 0, 8),
	})
	Theme.label(card, {
		text = cfg.role,
		size = UDim2.new(1, -28, 0, 22),
		pos = UDim2.new(0, 24, 0, 36),
		color = Theme.muted,
	})

	card.Activated:Connect(function()
		selectedId = cfg.id
		for _, other in pairs(cards) do
			other.BackgroundColor3 = Theme.panelAlt
		end
		card.BackgroundColor3 = Color3.fromRGB(28, 56, 72)
		showDetail(cfg)
	end)
	return card
end

function SelectionController.close()
	if screen then
		screen.Enabled = false
	end
end

function SelectionController.open(payload)
	if not screen then
		return
	end
	local list = screen:FindFirstChild("Root") and screen.Root:FindFirstChild("List")
	if list then
		for _, c in ipairs(list:GetChildren()) do
			if c:IsA("TextButton") then
				c:Destroy()
			end
		end
	end
	cards = {}
	selectedId = nil
	if payload and payload.mechs then
		for i, cfg in ipairs(payload.mechs) do
			cards[cfg.id] = makeCard(list, cfg, i)
		end
		if payload.mechs[1] then
			selectedId = payload.mechs[1].id
			showDetail(payload.mechs[1])
			if cards[selectedId] then
				cards[selectedId].BackgroundColor3 = Color3.fromRGB(28, 56, 72)
			end
		end
	end
	screen.Enabled = true
	local root = screen:FindFirstChild("Root")
	if root then
		root.Position = UDim2.fromScale(0.5, 0.58)
		TweenService:Create(root, TweenInfo.new(0.22, Enum.EasingStyle.Quad), {
			Position = UDim2.fromScale(0.5, 0.5),
		}):Play()
	end
end

function SelectionController.start()
	screen = Instance.new("ScreenGui")
	screen.Name = "MVMSelection"
	screen.ResetOnSpawn = false
	screen.IgnoreGuiInset = true
	screen.Enabled = false
	screen.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	screen.Parent = playerGui

	local dim = Instance.new("TextButton")
	dim.Name = "Dim"
	dim.Text = ""
	dim.AutoButtonColor = false
	dim.BackgroundColor3 = Color3.new(0, 0, 0)
	dim.BackgroundTransparency = 0.35
	dim.Size = UDim2.fromScale(1, 1)
	dim.Parent = screen
	dim.Activated:Connect(SelectionController.close)

	local root = Instance.new("Frame")
	root.Name = "Root"
	root.AnchorPoint = Vector2.new(0.5, 0.5)
	root.Position = UDim2.fromScale(0.5, 0.5)
	root.Size = UDim2.new(0.86, 0, 0.8, 0)
	root.BackgroundColor3 = Theme.bg
	root.Parent = screen
	Theme.corner(root, 10)
	Theme.stroke(root, Theme.accent, 2)

	local header = Instance.new("Frame")
	header.BackgroundColor3 = Theme.panel
	header.Size = UDim2.new(1, 0, 0, 64)
	header.Parent = root
	Theme.corner(header, 10)
	Theme.label(header, {
		text = "MVM  /  MECH VS MECH",
		font = Enum.Font.GothamBlack,
		size = UDim2.new(0.7, 0, 0, 30),
		pos = UDim2.new(0, 18, 0, 6),
		color = Theme.text,
	})
	Theme.label(header, {
		text = "SELECT A CHASSIS  ·  DROPSHIP WILL DELIVER TO THE PAD",
		size = UDim2.new(0.7, 0, 0, 20),
		pos = UDim2.new(0, 18, 0, 36),
		color = Theme.muted,
	})
	local close = Theme.button(header, {
		text = "CLOSE",
		size = UDim2.new(0, 100, 0, 34),
		pos = UDim2.new(1, -116, 0.5, -17),
		bg = Color3.fromRGB(50, 24, 24),
		stroke = Theme.err,
	})
	close.Activated:Connect(SelectionController.close)

	local list = Instance.new("ScrollingFrame")
	list.Name = "List"
	list.BackgroundTransparency = 1
	list.Position = UDim2.new(0, 16, 0, 76)
	list.Size = UDim2.new(0.52, -12, 1, -92)
	list.CanvasSize = UDim2.new(0, 0, 0, 780)
	list.ScrollBarThickness = 6
	list.Parent = root
	local grid = Instance.new("UIGridLayout")
	grid.CellSize = UDim2.new(0.48, -6, 0, 72)
	grid.CellPadding = UDim2.fromOffset(8, 8)
	grid.SortOrder = Enum.SortOrder.LayoutOrder
	grid.Parent = list

	detail = Instance.new("Frame")
	detail.Name = "Detail"
	detail.BackgroundColor3 = Theme.panel
	detail.Position = UDim2.new(0.52, 8, 0, 76)
	detail.Size = UDim2.new(0.48, -24, 1, -92)
	detail.Parent = root
	Theme.corner(detail, 8)

	Remotes.client("OpenSelection", function(payload)
		SelectionController.open(payload)
	end)
end

return SelectionController
