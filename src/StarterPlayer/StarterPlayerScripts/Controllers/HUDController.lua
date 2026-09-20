local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Remotes = require(game.ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Remotes"))
local MechConfig = require(game.ReplicatedStorage:WaitForChild("Shared"):WaitForChild("MechConfig"))
local Theme = require(script.Parent.Theme)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local HUD = {}
local gui, hpFill, hpText, nameText, roleText
local ammoText, plateAmmo, weaponText, cdText, cross, toast, feed, delivery
local lastState

local function setAmmo(text)
	ammoText.Text = text
	plateAmmo.Text = text
end

local function selectedWeapon(st)
	if not st or not st.active then
		return nil, nil
	end
	local cfg = MechConfig.get(st.mechId)
	local slot = st.selected or "primary"
	return cfg and cfg.weapons[slot], slot
end

local function ammoLine(st)
	-- QA / pilots match the token AMMO. Always include it while seated.
	if not st or not st.active or not st.seated then
		return ""
	end
	local w, slot = selectedWeapon(st)
	local now = os.clock()
	local coolLeft = 0
	if slot and st.cooldowns then
		coolLeft = math.max(0, (st.cooldowns[slot] or 0) - now)
	end
	if slot and st.reloading and st.reloading[slot] then
		return "AMMO RELOAD"
	end
	if w and w.ammo then
		local left = st.ammo and st.ammo[slot]
		local mag = string.format("AMMO %s/%s", tostring(left or 0), tostring(w.ammo))
		if coolLeft > 0.05 then
			return string.format("%s  COOL %.1fs", mag, coolLeft)
		end
		return mag
	end
	if coolLeft > 0.05 then
		return string.format("AMMO COOL %.1fs", coolLeft)
	end
	return "AMMO READY"
end

local function weaponLine(st)
	if not st or not st.active then
		return "No chassis"
	end
	local w = selectedWeapon(st)
	if not w then
		return st.selected or "—"
	end
	return w.button .. "  " .. w.name
end

local function cooldownLine(st)
	if not st or not st.cooldowns then
		return ""
	end
	local now = os.clock()
	local bits = {}
	for _, slot in ipairs({ "primary", "secondary", "specialQ", "specialE" }) do
		local ready = st.cooldowns[slot] or 0
		local left = math.max(0, ready - now)
		local cfg = MechConfig.get(st.mechId)
		local w = cfg and cfg.weapons[slot]
		if w then
			if left > 0.05 then
				table.insert(bits, string.format("%s %.1fs", w.button, left))
			else
				table.insert(bits, w.button .. " RDY")
			end
		end
	end
	return table.concat(bits, "   ")
end

function HUD.apply(st)
	lastState = st
	local seated = st and st.seated
	cross.Visible = seated == true
	if not st or not st.active then
		nameText.Text = "NO CHASSIS"
		roleText.Text = "Report to the Selection Station"
		hpText.Text = "HULL  —"
		hpFill.Size = UDim2.fromScale(0, 1)
		setAmmo("")
		weaponText.Text = ""
		cdText.Text = ""
		return
	end
	nameText.Text = st.name
	local cfg = MechConfig.get(st.mechId)
	roleText.Text = (cfg and cfg.role or "Pilot") .. (st.cloaked and "  ·  CLOAKED" or "")
	local frac = math.clamp(st.health / math.max(st.maxHealth, 1), 0, 1)
	hpFill.Size = UDim2.fromScale(frac, 1)
	hpFill.BackgroundColor3 = frac < 0.28 and Theme.hpLow or Theme.hp
	hpText.Text = string.format("HULL  %d / %d", math.floor(st.health), st.maxHealth)
	weaponText.Text = weaponLine(st)
	setAmmo(ammoLine(st))
	cdText.Text = cooldownLine(st)
end

function HUD.toast(payload)
	if typeof(payload) ~= "table" then
		return
	end
	toast.Text = payload.text or ""
	local kind = payload.kind or "info"
	toast.TextColor3 = kind == "error" and Theme.err or kind == "ok" and Theme.ok or kind == "warn" and Theme.warn or Theme.text
	toast.TextTransparency = 0
	task.delay(3.2, function()
		if toast.Text == (payload.text or "") then
			TweenService:Create(toast, TweenInfo.new(0.4), { TextTransparency = 1 }):Play()
		end
	end)
end

function HUD.kill(payload)
	if typeof(payload) ~= "table" then
		return
	end
	local row = Theme.label(feed, {
		text = payload.text or "",
		size = UDim2.new(1, 0, 0, 18),
		color = Theme.amber,
		align = Enum.TextXAlignment.Right,
	})
	row.LayoutOrder = os.clock() * 1000
	task.delay(5.5, function()
		row:Destroy()
	end)
end

function HUD.delivery(payload)
	if typeof(payload) ~= "table" then
		return
	end
	local phase = payload.phase
	if phase == "inbound" then
		delivery.Text = "DROPSHIP INBOUND  ·  " .. (payload.name or "")
	elseif phase == "hover" then
		delivery.Text = "ON STATION  ·  LOWERING " .. (payload.name or "")
	elseif phase == "lowering" then
		delivery.Text = "MECH ON CABLE  ·  CLEAR THE PAD"
	elseif phase == "ready" then
		delivery.Text = (payload.name or "MECH") .. " READY  ·  ENTER COCKPIT"
		task.delay(4, function()
			if string.find(delivery.Text, "READY", 1, true) then
				delivery.Text = ""
			end
		end)
	elseif phase == "failed" then
		delivery.Text = "DROPSHIP ABORTED"
		task.delay(3.2, function()
			if delivery.Text == "DROPSHIP ABORTED" then
				delivery.Text = ""
			end
		end)
	else
		delivery.Text = ""
	end
end

function HUD.start()
	gui = Instance.new("ScreenGui")
	gui.Name = "MVMHUD"
	gui.ResetOnSpawn = false
	gui.IgnoreGuiInset = true
	gui.Parent = playerGui

	local brand = Theme.label(gui, {
		text = "MVM  /  MECH VS MECH",
		font = Enum.Font.GothamBlack,
		size = UDim2.new(0, 320, 0, 28),
		pos = UDim2.new(0, 20, 0, 14),
		color = Theme.text,
		stroke = true,
	})
	brand.TextXAlignment = Enum.TextXAlignment.Left

	local plate = Instance.new("Frame")
	plate.BackgroundColor3 = Theme.bg
	plate.BackgroundTransparency = 0.18
	plate.Position = UDim2.new(0, 20, 1, -148)
	plate.Size = UDim2.new(0, 360, 0, 128)
	plate.Parent = gui
	Theme.corner(plate, 8)
	Theme.stroke(plate, Theme.accent, 1.2)
	Theme.pad(plate, 10)

	nameText = Theme.label(plate, {
		text = "NO CHASSIS",
		font = Enum.Font.GothamBlack,
		size = UDim2.new(1, 0, 0, 22),
	})
	roleText = Theme.label(plate, {
		text = "Report to the Selection Station",
		size = UDim2.new(1, 0, 0, 16),
		pos = UDim2.new(0, 0, 0, 22),
		color = Theme.muted,
	})

	local track = Instance.new("Frame")
	track.BackgroundColor3 = Color3.fromRGB(28, 34, 42)
	track.Position = UDim2.new(0, 0, 0, 44)
	track.Size = UDim2.new(1, 0, 0, 12)
	track.Parent = plate
	Theme.corner(track, 3)
	hpFill = Instance.new("Frame")
	hpFill.BackgroundColor3 = Theme.hp
	hpFill.Size = UDim2.fromScale(0, 1)
	hpFill.Parent = track
	Theme.corner(hpFill, 3)

	hpText = Theme.label(plate, {
		text = "HULL  —",
		size = UDim2.new(1, 0, 0, 16),
		pos = UDim2.new(0, 0, 0, 58),
	})
	weaponText = Theme.label(plate, {
		text = "",
		size = UDim2.new(1, 0, 0, 16),
		pos = UDim2.new(0, 0, 0, 74),
		color = Theme.amber,
	})
	plateAmmo = Theme.label(plate, {
		text = "",
		font = Enum.Font.GothamBold,
		size = UDim2.new(1, 0, 0, 18),
		pos = UDim2.new(0, 0, 0, 90),
		color = Theme.text,
	})
	plateAmmo.Name = "AmmoHUD"

	ammoText = Theme.label(gui, {
		text = "",
		font = Enum.Font.GothamBold,
		size = UDim2.new(0, 420, 0, 24),
		pos = UDim2.new(0.5, -210, 1, -78),
		color = Theme.text,
		align = Enum.TextXAlignment.Center,
		stroke = true,
	})
	ammoText.Name = "AmmoReadout"
	cdText = Theme.label(gui, {
		text = "",
		size = UDim2.new(0, 520, 0, 18),
		pos = UDim2.new(0.5, -260, 1, -54),
		color = Theme.muted,
		align = Enum.TextXAlignment.Center,
	})

	cross = Instance.new("Frame")
	cross.Name = "Crosshair"
	cross.AnchorPoint = Vector2.new(0.5, 0.5)
	cross.Position = UDim2.fromScale(0.5, 0.5)
	cross.Size = UDim2.fromOffset(18, 18)
	cross.BackgroundTransparency = 1
	cross.Visible = false
	cross.Parent = gui
	for _, d in ipairs({
		{ UDim2.fromOffset(8, 2), UDim2.fromOffset(5, -9) },
		{ UDim2.fromOffset(8, 2), UDim2.fromOffset(5, 7) },
		{ UDim2.fromOffset(2, 8), UDim2.fromOffset(-9, 5) },
		{ UDim2.fromOffset(2, 8), UDim2.fromOffset(7, 5) },
	}) do
		local p = Instance.new("Frame")
		p.BackgroundColor3 = Theme.accent
		p.Size = d[1]
		p.Position = d[2]
		p.BorderSizePixel = 0
		p.Parent = cross
	end

	toast = Theme.label(gui, {
		text = "",
		font = Enum.Font.GothamBold,
		size = UDim2.new(0.6, 0, 0, 28),
		pos = UDim2.new(0.2, 0, 0.18, 0),
		align = Enum.TextXAlignment.Center,
		stroke = true,
	})
	toast.TextTransparency = 1

	delivery = Theme.label(gui, {
		text = "",
		font = Enum.Font.GothamBold,
		size = UDim2.new(0.7, 0, 0, 24),
		pos = UDim2.new(0.15, 0, 0.12, 0),
		align = Enum.TextXAlignment.Center,
		color = Theme.amber,
		stroke = true,
	})

	feed = Instance.new("Frame")
	feed.BackgroundTransparency = 1
	feed.Position = UDim2.new(1, -360, 0, 16)
	feed.Size = UDim2.new(0, 340, 0, 160)
	feed.Parent = gui
	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, 2)
	layout.Parent = feed

	local hint = Theme.label(gui, {
		text = "Station → dropship → cockpit   ·   drive the ruined city   ·   LMB/RMB  Q/E  V camera  X eject",
		size = UDim2.new(1, -40, 0, 16),
		pos = UDim2.new(0, 20, 1, -22),
		color = Theme.muted,
		align = Enum.TextXAlignment.Left,
	})
	hint.TextScaled = true

	Remotes.client("MechState", HUD.apply)
	Remotes.client("Notify", HUD.toast)
	Remotes.client("KillFeed", HUD.kill)
	Remotes.client("DeliveryStatus", HUD.delivery)

	task.spawn(function()
		while gui.Parent do
			if lastState and lastState.active then
				setAmmo(ammoLine(lastState))
				cdText.Text = cooldownLine(lastState)
			end
			task.wait(0.15)
		end
	end)
end

return HUD
