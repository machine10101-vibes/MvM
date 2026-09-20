local Theme = {
	bg = Color3.fromRGB(8, 12, 18),
	panel = Color3.fromRGB(14, 20, 28),
	panelAlt = Color3.fromRGB(20, 28, 38),
	accent = Color3.fromRGB(70, 190, 230),
	amber = Color3.fromRGB(232, 176, 64),
	text = Color3.fromRGB(236, 242, 248),
	muted = Color3.fromRGB(160, 176, 190),
	ok = Color3.fromRGB(90, 210, 140),
	warn = Color3.fromRGB(232, 176, 64),
	err = Color3.fromRGB(230, 80, 80),
	hp = Color3.fromRGB(70, 210, 120),
	hpLow = Color3.fromRGB(230, 70, 70),
}

function Theme.pad(gui, px)
	local u = Instance.new("UIPadding")
	u.PaddingTop = UDim.new(0, px)
	u.PaddingBottom = UDim.new(0, px)
	u.PaddingLeft = UDim.new(0, px)
	u.PaddingRight = UDim.new(0, px)
	u.Parent = gui
	return u
end

function Theme.corner(gui, px)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, px or 6)
	c.Parent = gui
	return c
end

function Theme.stroke(gui, color, t)
	local s = Instance.new("UIStroke")
	s.Color = color or Theme.accent
	s.Thickness = t or 1.4
	s.Transparency = 0.15
	s.Parent = gui
	return s
end

function Theme.label(parent, props)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = props.bgT or 1
	l.BackgroundColor3 = props.bg or Theme.panel
	l.Font = props.font or Enum.Font.Gotham
	l.Text = props.text or ""
	l.TextColor3 = props.color or Theme.text
	l.TextScaled = props.scaled ~= false
	l.TextXAlignment = props.align or Enum.TextXAlignment.Left
	l.TextYAlignment = props.valign or Enum.TextYAlignment.Center
	l.Size = props.size or UDim2.fromScale(1, 1)
	l.Position = props.pos or UDim2.new()
	l.TextWrapped = props.wrap == true
	l.ZIndex = props.z or 1
	l.Parent = parent
	if props.stroke then
		l.TextStrokeTransparency = 0.5
	end
	return l
end

function Theme.button(parent, props)
	local b = Instance.new("TextButton")
	b.AutoButtonColor = true
	b.BackgroundColor3 = props.bg or Theme.panelAlt
	b.Font = Enum.Font.GothamBold
	b.Text = props.text or "OK"
	b.TextColor3 = props.color or Theme.text
	b.TextScaled = true
	b.Size = props.size or UDim2.fromOffset(140, 36)
	b.Position = props.pos or UDim2.new()
	b.Parent = parent
	Theme.corner(b, 5)
	Theme.stroke(b, props.stroke or Theme.accent, 1.2)
	return b
end

return Theme
