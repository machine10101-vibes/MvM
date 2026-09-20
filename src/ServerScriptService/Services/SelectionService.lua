local Players = game:GetService("Players")

local MechConfig = require(game.ReplicatedStorage.Shared.MechConfig)
local Remotes = require(game.ReplicatedStorage.Shared.Remotes)

local CombatService = require(script.Parent.CombatService)
local DeliveryService = require(script.Parent.DeliveryService)
local WorldBuilder = require(script.Parent.WorldBuilder)

local SelectionService = {}

function SelectionService.start()
	local function bindPrompt()
		local prompt = WorldBuilder.selectionPrompt()
		if not prompt then
			return
		end
		prompt.Triggered:Connect(function(player)
			if CombatService.hasMech(player) then
				Remotes.fire("Notify", player, {
					text = "Eject or lose your current mech before choosing another.",
					kind = "warn",
				})
				return
			end
			if DeliveryService.isBusy(player) then
				Remotes.fire("Notify", player, { text = "Dropship already inbound.", kind = "warn" })
				return
			end
			Remotes.fire("OpenSelection", player, {
				mechs = MechConfig.list(),
			})
		end)
	end

	bindPrompt()

	Remotes.on("SelectMech", function(player, mechId)
		if typeof(mechId) ~= "string" then
			return
		end
		if not MechConfig.get(mechId) then
			Remotes.fire("SelectionResult", player, { ok = false, reason = "Unknown mech." })
			return
		end
		if CombatService.hasMech(player) then
			Remotes.fire("SelectionResult", player, { ok = false, reason = "You already own a mech." })
			return
		end
		DeliveryService.deliver(player, mechId)
	end)

	local function greet(player)
		task.delay(1, function()
			Remotes.fire("Notify", player, {
				text = "MVM — walk to the Selection Station in the hangar.",
				kind = "info",
			})
		end)
	end
	Players.PlayerAdded:Connect(greet)
	for _, player in ipairs(Players:GetPlayers()) do
		greet(player)
	end
end

return SelectionService
