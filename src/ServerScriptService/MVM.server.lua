--[[
	MVM (Mech vs Mech) — server bootstrap.
	Play Solo / local Play safe. Builds the hangar, wires remotes, starts services.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Remotes = require(Shared:WaitForChild("Remotes"))
Remotes.init()

local Services = script.Parent:WaitForChild("Services")
local WorldBuilder = require(Services:WaitForChild("WorldBuilder"))
local CombatService = require(Services:WaitForChild("CombatService"))
local DeliveryService = require(Services:WaitForChild("DeliveryService"))
local SelectionService = require(Services:WaitForChild("SelectionService"))
local PilotService = require(Services:WaitForChild("PilotService"))
local DummyService = require(Services:WaitForChild("DummyService"))

assert(DeliveryService.deliver)

WorldBuilder.build()
CombatService.start()
PilotService.start()
DummyService.start()
DummyService.hookDestroyed()
SelectionService.start()

print("[MVM] Mech vs Mech server online. Hangar live. 10 chassis in catalog.")
