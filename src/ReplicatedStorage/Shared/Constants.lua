local Constants = {
	GameName = "MVM",
	GameFullName = "Mech vs Mech",
	BrandLine = "MVM  /  MECH VS MECH",

	RemotesFolderName = "MVMRemotes",

	-- World
	HangarSpawn = Vector3.new(0, 8, -70),
	DeliveryPad = Vector3.new(0, 3, 12),
	HeliStart = Vector3.new(-320, 160, -80),
	HeliHover = Vector3.new(0, 80, 12),
	HeliExit = Vector3.new(240, 170, 420),
	ArenaCenter = Vector3.new(0, 3, 300),

	-- Tags / attributes
	MechTag = "MVMMech",
	OwnerAttr = "OwnerUserId",
	MechIdAttr = "MechId",
	HealthAttr = "Health",
	MaxHealthAttr = "MaxHealth",

	-- Combat
	MaxFireRate = 20, -- server sanity: requests per second per slot
	FriendlyFire = true, -- FFA
	RespawnDelay = 2.4,
	PilotWalkSpeed = 16,

	-- Camera
	ChaseOffset = Vector3.new(0, 14, 28),
	CockpitEyeHeight = 2.2,
}

return Constants
