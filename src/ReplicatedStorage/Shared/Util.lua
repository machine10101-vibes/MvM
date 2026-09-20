local TweenService = game:GetService("TweenService")

local Util = {}

function Util.color(r, g, b)
	return Color3.fromRGB(r, g, b)
end

function Util.part(props)
	local p = Instance.new("Part")
	p.Anchored = props.Anchored ~= false
	p.CanCollide = props.CanCollide ~= false
	p.CastShadow = props.CastShadow ~= false
	p.Material = props.Material or Enum.Material.SmoothPlastic
	p.Color = props.Color or Color3.fromRGB(80, 80, 80)
	p.Size = props.Size or Vector3.new(1, 1, 1)
	p.CFrame = props.CFrame or CFrame.new()
	p.Name = props.Name or "Part"
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Transparency = props.Transparency or 0
	if props.Shape then
		p.Shape = props.Shape
	end
	if props.Parent then
		p.Parent = props.Parent
	end
	return p
end

function Util.weld(a, b, c0, c1)
	local w = Instance.new("Weld")
	w.Name = "MVMWeld"
	w.Part0 = a
	w.Part1 = b
	w.C0 = c0 or a.CFrame:ToObjectSpace(b.CFrame)
	w.C1 = c1 or CFrame.new()
	w.Parent = a
	return w
end

function Util.weldModel(model, root)
	root = root or model.PrimaryPart
	assert(root, "weldModel requires a PrimaryPart")
	for _, inst in ipairs(model:GetDescendants()) do
		if inst:IsA("BasePart") and inst ~= root then
			inst.Anchored = false
			inst.Massless = inst.Massless or false
			Util.weld(root, inst)
		end
	end
	root.Anchored = false
end

function Util.anchorModel(model, anchored)
	for _, inst in ipairs(model:GetDescendants()) do
		if inst:IsA("BasePart") then
			inst.Anchored = anchored
		end
	end
end

function Util.tween(inst, info, props)
	local tw = TweenService:Create(inst, info, props)
	tw:Play()
	return tw
end

function Util.waitTween(inst, info, props)
	local tw = Util.tween(inst, info, props)
	tw.Completed:Wait()
	return tw
end

function Util.billboard(adornee, text, size, offset)
	local bb = Instance.new("BillboardGui")
	bb.Name = "MVMBillboard"
	bb.Adornee = adornee
	bb.AlwaysOnTop = true
	bb.Size = size or UDim2.fromOffset(280, 60)
	bb.StudsOffset = offset or Vector3.new(0, 6, 0)
	bb.MaxDistance = 220
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Size = UDim2.fromScale(1, 1)
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextColor3 = Color3.fromRGB(235, 242, 255)
	label.TextStrokeTransparency = 0.4
	label.Text = text
	label.Parent = bb
	bb.Parent = adornee
	return bb
end

function Util.sound(parent, soundId, props)
	local s = Instance.new("Sound")
	s.Name = props and props.Name or "MVMSound"
	s.SoundId = soundId
	s.Volume = props and props.Volume or 0.6
	s.PlaybackSpeed = props and props.PlaybackSpeed or 1
	s.RollOffMaxDistance = props and props.MaxDistance or 260
	s.RollOffMinDistance = 12
	s.Looped = props and props.Looped or false
	s.Parent = parent
	return s
end

function Util.play(parent, soundId, props)
	local s = Util.sound(parent, soundId, props)
	s.Ended:Connect(function()
		s:Destroy()
	end)
	s:Play()
	return s
end

function Util.rayParams(ignore)
	local p = RaycastParams.new()
	p.FilterType = Enum.RaycastFilterType.Exclude
	p.FilterDescendantsInstances = ignore or {}
	p.IgnoreWater = true
	return p
end

function Util.unit(v)
	if v.Magnitude < 1e-4 then
		return Vector3.zero
	end
	return v.Unit
end

function Util.flat(v)
	return Vector3.new(v.X, 0, v.Z)
end

function Util.clampMag(v, maxM)
	if v.Magnitude <= maxM then
		return v
	end
	return v.Unit * maxM
end

function Util.now()
	return os.clock()
end

function Util.deepCopy(t)
	if typeof(t) ~= "table" then
		return t
	end
	local n = {}
	for k, v in pairs(t) do
		n[k] = Util.deepCopy(v)
	end
	return n
end

function Util.findMechFromPart(part)
	local model = part:FindFirstAncestorOfClass("Model")
	while model do
		if model:GetAttribute("MechId") and model:GetAttribute("OwnerUserId") then
			return model
		end
		model = model.Parent and model.Parent:FindFirstAncestorOfClass("Model")
	end
	return nil
end

return Util
