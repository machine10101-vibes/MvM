local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Constants = require(script.Parent.Constants)

local NAMES = {
	"OpenSelection",
	"SelectMech",
	"SelectionResult",
	"DeliveryStatus",
	"EnterMech",
	"ExitMech",
	"PilotState",
	"FireWeapon",
	"ReloadWeapon",
	"MechState",
	"KillFeed",
	"Notify",
	"VfxEvent",
}

local Remotes = {}

local function folder()
	local existing = ReplicatedStorage:FindFirstChild(Constants.RemotesFolderName)
	if existing then
		return existing
	end
	if RunService:IsServer() then
		local f = Instance.new("Folder")
		f.Name = Constants.RemotesFolderName
		f.Parent = ReplicatedStorage
		return f
	end
	return ReplicatedStorage:WaitForChild(Constants.RemotesFolderName, 16)
end

function Remotes.init()
	local f = folder()
	if RunService:IsServer() then
		for _, name in ipairs(NAMES) do
			if not f:FindFirstChild(name) then
				local ev = Instance.new("RemoteEvent")
				ev.Name = name
				ev.Parent = f
			end
		end
	end
	return Remotes
end

function Remotes.get(name)
	local f = folder()
	local ev = f:FindFirstChild(name) or f:WaitForChild(name, 16)
	assert(ev, "Missing remote " .. tostring(name))
	return ev
end

function Remotes.on(name, fn)
	return Remotes.get(name).OnServerEvent:Connect(fn)
end

function Remotes.client(name, fn)
	return Remotes.get(name).OnClientEvent:Connect(fn)
end

function Remotes.fireAll(name, ...)
	Remotes.get(name):FireAllClients(...)
end

local function isPlayer(player)
	return typeof(player) == "Instance" and player:IsA("Player")
end

function Remotes.fire(name, player, ...)
	if not isPlayer(player) then
		return
	end
	Remotes.get(name):FireClient(player, ...)
end

function Remotes.fireServer(name, ...)
	Remotes.get(name):FireServer(...)
end

return Remotes
