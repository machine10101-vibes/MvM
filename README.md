# MVM — Mech vs Mech

Free-for-all mech combat. Spawn in the hangar, pick one of **10 chassis** at the selection station, wait for the dropship to lower it onto the pad, climb into the cockpit, and fight.

No pay-to-win multipliers. Damage, ammo, and deaths are server-authoritative.

## Open in Roblox Studio

### Option A — Rojo (preferred)

1. Install [Rojo](https://rojo.space/) (`aftman add rojo-rbx/rojo` or the Studio plugin).
2. From this repo:

```bash
rojo serve
```

3. In Studio: install the Rojo plugin if needed, then **Connect** to the running serve.
4. Press **Play** (Play Solo is enough).

`default.project.json` maps:

| Place tree | Source |
|---|---|
| `ReplicatedStorage.Shared` | `src/ReplicatedStorage/Shared` |
| `ServerScriptService` | `src/ServerScriptService` |
| `StarterPlayer.StarterPlayerScripts` | `src/StarterPlayer/StarterPlayerScripts` |

### Option B — Place file

```bash
python3 scripts/build_rbxlx.py
```

Open `MVM.rbxlx` in Studio (File → Open). Press **Play**. The first run builds the fortified hangar and the war-torn city from `WorldBuilder` + `CityKit`.

## How to test the loop

1. You spawn on the **PILOT SPAWN** pad inside the hangar.
2. Walk to the glowing **SELECTION STATION** (center of the hangar). Hold the proximity prompt.
3. Pick any of the 10 mechs. **Confirm** — a dropship flies in, lowers that chassis onto the yellow pad, and leaves.
4. Walk to the mech. Hold **Enter Cockpit**.
5. **WASD** move, **mouse** aim, **LMB / RMB** weapons, **Q / E** specials, **R** reload, **V** camera (chase / cockpit), **X** eject.
6. Drive out the city gate into the ruined streets. Cover is buildings, overpasses, rubble — not a flat field.
7. Three **Range Dummies** hold Liberty Plaza, the canal bridge approach, and the industrial yard so Play Solo can take fire and wreck.
8. On wreck: you eject to the hangar and can pick again.

## The ten chassis

| Mech | Role | LMB | RMB | Q | E |
|---|---|---|---|---|---|
| Assault Striker | Frontline hybrid | 20mm Vulcan | SRM-6 | Overclock | Chaff Burst |
| Heavy Titan | Siege armor | 120mm Rail | Shoulder Howl | Fortress Stance | Seismic Stomp |
| Scout Runner | Harasser | Twin Kestrel | Scatter Burst | Vector Dash | Afterburner |
| Sniper Longshot | Overwatch | Longrail IX | Spotter Pulse | Stabilize | Ghost Shroud |
| Flame Siege | Area denial | Napalm Throat | Gel Canister | Inferno Surge | Firewall |
| Rocket Barrage | Saturation | MLRS Pods | Dumbfire Salvo | Target Paint | Hot-Swap Racks |
| Shield Guardian | Anchor | Pulse Cannon | Aegis Face | Barrier Dome | Pulse Nova |
| Stealth Shadow | Assassin | Burst Shroud | Plasma Dagger | Optical Cloak | Blink |
| Artillery Howitzer | Indirect fire | 210mm Mortar | Cluster Shell | Deploy Braces | Smoke Screen |
| Berserker Claw | Brawler | Twin Rippers | Sever Axe | Bloodlust | Charge Rush |

Kits live in `src/ReplicatedStorage/Shared/MechConfig.lua`. Combat reads that table; do not stub a chassis.

## Systems

- **WorldBuilder** — fortified hangar district, branding, selection station, drop pad, lighting, kill plane. Calls `CityKit`.
- **CityKit** — scripted war-torn city under `Workspace.MVMWorld.WarTornCity` (see below).
- **SelectionService** — proximity catalog; rejects a second chassis until eject/death.
- **DeliveryService** — tweened dropship over the city, cable lower, ownership.
- **PilotService** — VehicleSeat cockpit, network ownership, eject / wreck return.
- **CombatService** — hitscan, projectiles, cones, melee, lock-on, AOE, buffs, cloak, linger fire. Server HP.
- **DummyService** — plaza / industrial / north-side targets that fire so Solo Play can die and re-select.

Remotes are created at runtime under `ReplicatedStorage.MVMRemotes`.

## War-torn city (`WarTornCity`)

The combat space is a **contiguous ruined city**, not a flat arena. Nothing is uploaded: `CityKit.lua` kitbashes parts at Play time into `Workspace.MVMWorld.WarTornCity`.

Seed is fixed (`Random.new(20260920)`), so the layout is stable across sessions.

### How it is built

`WorldBuilder.build()` creates the hangar, station, and pad, then calls `CityKit.build(world)`. The kit:

1. Lays two asphalt **plates** (south of the canal, north of the canal) plus dirt berms.
2. Stamps **mech-wide streets** (~56–72 studs) on a N/S + E/W grid with lane paint and cratered intersections.
3. Drops **ruin shells** from typed recipes: apartment, office, shop, parking garage, warehouse. Each shell can lose a floor, blow a wall, cave the roof, lean, burn, sprout rebar, and dump rubble.
4. Mixes **district pockets** on the same grid so you never leave one map.

| Folder | What you should see |
|---|---|
| `Ground` | South / north plates, berms |
| `Streets` | Boulevards at x = −210 / 0 / 210 and arteries at z = 140 / 260 / 380 / 660 / 820 |
| `Boulevard` | Gate road from the hangar into downtown |
| `Downtown` | Tall office / apartment ruins |
| `Plaza` | Liberty Plaza — fountain wreck, statue chunks, open fight floor |
| `Market` | Short shop row, awnings, burned signs |
| `Parking` | Multi-deck garages with ramps and missing slabs |
| `Residential` | Tenement blocks north and west |
| `Industrial` | Yard, warehouses, silo, crane, containers (east) |
| `Freeway` | Overpass 7 — elevated deck, missing span, fight-on-top / walk-under |
| `Canal` | River gap at z ≈ 500; walkable center bridge; west span in the water; east span gone |
| `Subway` | Metro crater + tunnel mouth |
| `Skyline` | Perimeter stubs so the horizon reads as a city |
| `StreetDebris` | Extra rubble and wrecks in the lanes |

Scale is for **giant mechs**: streets you can walk two-abreast, buildings as tall cover, rubble as waist/knee cover. Cars and buses are low obstacles, not the main hide.

### Hangar

The hangar sits on the **south edge** as a fortified district: blast wall, gate towers, sandbags. The dropship inbound/outbound path (`Constants.HeliStart` → pad → `HeliExit`) crosses the warzone after delivery.

To change the city, edit recipes in `src/ServerScriptService/Services/CityKit.lua`. Do not hand-place a Studio copy unless you also stop `WorldBuilder` from wiping `MVMWorld` on Play.

## Controls (cockpit)

| Input | Action |
|---|---|
| WASD | Walk / strafe |
| Mouse | Aim (yaw + pitch) |
| LMB / RMB | Primary / secondary |
| Q / E | Specials |
| R | Reload |
| V | Chase ↔ cockpit camera |
| X | Eject (abandons the chassis) |

## v1.2

- Seated HUD now has a named `AmmoHUD` label whose text always includes `AMMO` (`AMMO 30/30`, `AMMO READY`, `AMMO COOL 1.2s`, `AMMO RELOAD`) and refreshes on MechState plus the cooldown tick.
- Pad dust + whoosh on successful drop. Hit spark + floating damage on weapon connect. Eject toasts `RETURN TO STATION`.

## v1.1

- Dropship no longer dies on `TweenService:Create` (DeliveryService now only PivotTo-lerps the heli). A failed delivery destroys the orphan dropship and toasts the client.
- HUD / catalog stroke color is `Theme.accent` so it no longer clashes with `function Theme.stroke`.

## Notes

- FFA. Friendly fire is on. Score is not multiplied by anything purchasable.
- Sounds use built-in `rbxasset://` hooks so the place does not depend on uploaded audio.
- Models are built from parts (no MeshIds) so the file opens on a clean Studio install.
