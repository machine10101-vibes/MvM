local Debris = game:GetService("Debris")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Remotes = require(game.ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Remotes"))
local Util = require(game.ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Util"))

local VfxController = {}

local function hitSpark(pos)
	for _ = 1, 7 do
		local dir = Vector3.new(math.random() - 0.5, math.random() * 0.9, math.random() - 0.5)
		if dir.Magnitude < 0.08 then
			dir = Vector3.yAxis
		end
		dir = dir.Unit
		local p = Util.part({
			Name = "HitSpark",
			Size = Vector3.new(0.22, 0.22, 1.5),
			CFrame = CFrame.lookAt(pos, pos + dir),
			Color = Color3.fromRGB(255, 220, 90),
			Material = Enum.Material.Neon,
			CanCollide = false,
			Parent = Workspace,
		})
		TweenService:Create(p, TweenInfo.new(0.22), {
			CFrame = CFrame.lookAt(pos + dir * 4.2, pos + dir * 8),
			Transparency = 1,
			Size = Vector3.new(0.08, 0.08, 0.35),
		}):Play()
		Debris:AddItem(p, 0.26)
	end
end

local function landDust(pos)
	Util.play(Workspace, "rbxasset://sounds/impact_water.mp3", { Volume = 0.55, PlaybackSpeed = 0.48 })
	for i = 1, 10 do
		local ang = (i / 10) * math.pi * 2
		local p = Util.part({
			Name = "PadDust",
			Size = Vector3.new(2.4, 0.35, 2.4),
			CFrame = CFrame.new(pos + Vector3.new(math.cos(ang) * 5, 0.35, math.sin(ang) * 5)),
			Color = Color3.fromRGB(156, 132, 88),
			Material = Enum.Material.Sand,
			CanCollide = false,
			Transparency = 0.12,
			Parent = Workspace,
		})
		TweenService:Create(p, TweenInfo.new(0.72, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
			CFrame = p.CFrame + Vector3.new(math.cos(ang) * 11, 3.2, math.sin(ang) * 11),
			Transparency = 1,
			Size = Vector3.new(5.5, 0.9, 5.5),
		}):Play()
		Debris:AddItem(p, 0.78)
	end
end

local function numberPopup(pos, amount)
	local part = Util.part({
		Name = "DmgNum",
		Size = Vector3.new(0.2, 0.2, 0.2),
		CFrame = CFrame.new(pos + Vector3.new(0, 6, 0)),
		Transparency = 1,
		Anchored = true,
		CanCollide = false,
		Parent = Workspace,
	})
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.fromOffset(80, 32)
	bb.AlwaysOnTop = true
	bb.Parent = part
	local t = Instance.new("TextLabel")
	t.BackgroundTransparency = 1
	t.Size = UDim2.fromScale(1, 1)
	t.Font = Enum.Font.GothamBlack
	t.TextScaled = true
	t.TextColor3 = Color3.fromRGB(255, 210, 80)
	t.TextStrokeTransparency = 0.4
	t.Text = "-" .. tostring(amount)
	t.Parent = bb
	TweenService:Create(part, TweenInfo.new(0.6), {
		CFrame = part.CFrame + Vector3.new(0, 4, 0),
	}):Play()
	Debris:AddItem(part, 0.65)
end

function VfxController.start()
	Remotes.client("VfxEvent", function(payload)
		if typeof(payload) ~= "table" then
			return
		end
		if payload.kind == "hit" and typeof(payload.position) == "Vector3" then
			numberPopup(payload.position, payload.amount or 0)
			hitSpark(payload.position)
			Util.play(Workspace, "rbxasset://sounds/impact_water.mp3", { Volume = 0.25, PlaybackSpeed = 1.4 })
		elseif payload.kind == "land" and typeof(payload.position) == "Vector3" then
			landDust(payload.position)
		elseif payload.kind == "fire" then
			Util.play(Workspace, "rbxasset://sounds/switch.wav", { Volume = 0.2, PlaybackSpeed = 0.7 })
		end
	end)
end

return VfxController
