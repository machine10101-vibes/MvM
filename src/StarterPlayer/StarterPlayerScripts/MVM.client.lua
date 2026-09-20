--[[
	MVM (Mech vs Mech) — client bootstrap.
]]

local Shared = game.ReplicatedStorage:WaitForChild("Shared")
local Remotes = require(Shared:WaitForChild("Remotes"))
Remotes.init()

local Controllers = script.Parent:WaitForChild("Controllers")
require(Controllers:WaitForChild("SelectionController")).start()
require(Controllers:WaitForChild("HUDController")).start()
require(Controllers:WaitForChild("MechController")).start()
require(Controllers:WaitForChild("VfxController")).start()

print("[MVM] Client ready. Walk to the Selection Station.")
