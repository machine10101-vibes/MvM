import type { ChassisId, ItemDef, Loadout, Rarity, WeaponId } from "./types";

export interface ChassisDef {
  id: ChassisId;
  name: string;
  role: string;
  blurb: string;
  hp: number;
  armor: number;
  speed: number;
  turn: number;
  boostMul: number;
  heatCap: number;
  mass: number;
  scale: number;
  primary: WeaponId;
  secondary: WeaponId;
  special?: WeaponId;
  paint: number;
  accent: number;
  trim: number;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  dmg: number;
  rpm: number;
  spread: number;
  range: number;
  heat: number;
  speed: number;
  splash: number;
  hitscan: boolean;
  lock: boolean;
  pellets: number;
}

export const CHASSIS: Record<ChassisId, ChassisDef> = {
  titan: {
    id: "titan",
    name: "Titan",
    role: "Heavy Assault",
    blurb:
      "Hulking frontline brawler. Dual rotary autocannons, shoulder missile pods, a chest plasma lance, and a deployable shield dome.",
    hp: 1920,
    armor: 680,
    speed: 11.2,
    turn: 1.02,
    boostMul: 1.16,
    heatCap: 148,
    mass: 1.82,
    scale: 1.24,
    primary: "rotary",
    secondary: "missiles",
    special: "core",
    paint: 0x1a1c20,
    accent: 0x4a1418,
    trim: 0x2c3036,
  },
  reaper: {
    id: "reaper",
    name: "Reaper",
    role: "Scout",
    blurb: "Light reverse-joint hunter. Rail spike and close SMG.",
    hp: 740,
    armor: 90,
    speed: 26.5,
    turn: 2.45,
    boostMul: 1.72,
    heatCap: 82,
    mass: 0.72,
    scale: 0.92,
    primary: "rail",
    secondary: "smg",
    paint: 0x4a505c,
    accent: 0xc4a06a,
    trim: 0x6e7682,
  },
  colossus: {
    id: "colossus",
    name: "Colossus",
    role: "Heavy",
    blurb: "Siege chassis. Slow, brutal, built to walk through fire.",
    hp: 1680,
    armor: 520,
    speed: 12.2,
    turn: 1.12,
    boostMul: 1.22,
    heatCap: 128,
    mass: 1.55,
    scale: 1.18,
    primary: "cannon",
    secondary: "flak",
    paint: 0x6a5e50,
    accent: 0xc4b8a8,
    trim: 0x8a7c6c,
  },
  phantom: {
    id: "phantom",
    name: "Phantom",
    role: "Stealth Recon",
    blurb:
      "Slim angular hunter. A right-arm sniper rail, left-arm EMP and drone launcher, optical camouflage, and chaff to break locks.",
    hp: 780,
    armor: 190,
    speed: 24.8,
    turn: 2.38,
    boostMul: 1.7,
    heatCap: 90,
    mass: 0.74,
    scale: 0.95,
    primary: "sniper",
    secondary: "emp",
    special: "drones",
    paint: 0x2a2e34,
    accent: 0x4ad4e8,
    trim: 0x3a4248,
  },
  valkyrie: {
    id: "valkyrie",
    name: "Valkyrie",
    role: "Aerial Interceptor",
    blurb:
      "Fast aerial superiority fighter. Foldable wings, vectoring thrusters, wing pulse lasers, under-wing racks, a chin gatling, and a light deflection field.",
    hp: 820,
    armor: 140,
    speed: 28.5,
    turn: 2.55,
    boostMul: 1.85,
    heatCap: 88,
    mass: 0.68,
    scale: 0.98,
    primary: "pulse",
    secondary: "racks",
    special: "gatling",
    paint: 0xd8dee8,
    accent: 0x1a2744,
    trim: 0xc4b078,
  },
  berserker: {
    id: "berserker",
    name: "Berserker",
    role: "Close Combat",
    blurb:
      "Brutal melee specialist. Hydraulic fists with plasma cutters and chain blades, shoulder incendiary pods, a spine flamethrower, and gauntlet barriers.",
    hp: 1680,
    armor: 620,
    speed: 16.4,
    turn: 1.28,
    boostMul: 1.42,
    heatCap: 132,
    mass: 1.62,
    scale: 1.16,
    primary: "cutters",
    secondary: "incendiary",
    special: "flamer",
    paint: 0xc45a1e,
    accent: 0xff6a18,
    trim: 0x2a2c30,
  },
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  rotary: {
    id: "rotary",
    name: "Twin Helix Rotary",
    dmg: 7,
    rpm: 1040,
    spread: 0.03,
    range: 82,
    heat: 0.16,
    speed: 0,
    splash: 0,
    hitscan: true,
    lock: false,
    pellets: 2,
  },
  assault: {
    id: "assault",
    name: "Kestrel Rifle",
    dmg: 19,
    rpm: 520,
    spread: 0.016,
    range: 150,
    heat: 0.55,
    speed: 0,
    splash: 0,
    hitscan: true,
    lock: false,
    pellets: 1,
  },
  rail: {
    id: "rail",
    name: "Spindle Rail",
    dmg: 155,
    rpm: 46,
    spread: 0.002,
    range: 240,
    heat: 18,
    speed: 0,
    splash: 0,
    hitscan: true,
    lock: false,
    pellets: 1,
  },
  missiles: {
    id: "missiles",
    name: "Hydra Racks",
    dmg: 92,
    rpm: 70,
    spread: 0.02,
    range: 180,
    heat: 14,
    speed: 62,
    splash: 7,
    hitscan: false,
    lock: true,
    pellets: 1,
  },
  smg: {
    id: "smg",
    name: "Needler",
    dmg: 9,
    rpm: 920,
    spread: 0.04,
    range: 70,
    heat: 0.28,
    speed: 0,
    splash: 0,
    hitscan: true,
    lock: false,
    pellets: 1,
  },
  cannon: {
    id: "cannon",
    name: "Forge Cannon",
    dmg: 170,
    rpm: 52,
    spread: 0.01,
    range: 130,
    heat: 16,
    speed: 70,
    splash: 9,
    hitscan: false,
    lock: false,
    pellets: 1,
  },
  flak: {
    id: "flak",
    name: "Shrapnel Gate",
    dmg: 11,
    rpm: 140,
    spread: 0.12,
    range: 48,
    heat: 8,
    speed: 90,
    splash: 2,
    hitscan: false,
    lock: false,
    pellets: 8,
  },
  core: {
    id: "core",
    name: "Sternum Lance",
    dmg: 96,
    rpm: 42,
    spread: 0.006,
    range: 120,
    heat: 18,
    speed: 58,
    splash: 5.5,
    hitscan: false,
    lock: false,
    pellets: 1,
  },
  plasma: {
    id: "plasma",
    name: "Ion Lance",
    dmg: 36,
    rpm: 210,
    spread: 0.012,
    range: 120,
    heat: 2.4,
    speed: 48,
    splash: 3.2,
    hitscan: false,
    lock: false,
    pellets: 1,
  },
  blade: {
    id: "blade",
    name: "Cinder Edge",
    dmg: 210,
    rpm: 75,
    spread: 0.08,
    range: 14,
    heat: 12,
    speed: 0,
    splash: 4,
    hitscan: true,
    lock: false,
    pellets: 1,
  },
  pulse: {
    id: "pulse",
    name: "Wing Pulse Lasers",
    dmg: 11,
    rpm: 780,
    spread: 0.012,
    range: 140,
    heat: 0.22,
    speed: 0,
    splash: 0,
    hitscan: true,
    lock: false,
    pellets: 2,
  },
  racks: {
    id: "racks",
    name: "Underwing Racks",
    dmg: 78,
    rpm: 88,
    spread: 0.018,
    range: 170,
    heat: 11,
    speed: 78,
    splash: 5.5,
    hitscan: false,
    lock: true,
    pellets: 1,
  },
  gatling: {
    id: "gatling",
    name: "Chin Gatling",
    dmg: 5,
    rpm: 1400,
    spread: 0.028,
    range: 90,
    heat: 0.12,
    speed: 0,
    splash: 0,
    hitscan: true,
    lock: false,
    pellets: 1,
  },
  sniper: {
    id: "sniper",
    name: "Wraith Rail",
    dmg: 230,
    rpm: 26,
    spread: 0.001,
    range: 280,
    heat: 22,
    speed: 0,
    splash: 0,
    hitscan: true,
    lock: false,
    pellets: 1,
  },
  emp: {
    id: "emp",
    name: "EMP Pulse",
    dmg: 34,
    rpm: 68,
    spread: 0.02,
    range: 58,
    heat: 10,
    speed: 0,
    splash: 7,
    hitscan: true,
    lock: false,
    pellets: 1,
  },
  drones: {
    id: "drones",
    name: "Shade Drones",
    dmg: 38,
    rpm: 96,
    spread: 0.03,
    range: 150,
    heat: 8,
    speed: 52,
    splash: 3.4,
    hitscan: false,
    lock: true,
    pellets: 2,
  },
  cutters: {
    id: "cutters",
    name: "Plasma Cutters",
    dmg: 88,
    rpm: 105,
    spread: 0.05,
    range: 16,
    heat: 7,
    speed: 0,
    splash: 2.4,
    hitscan: true,
    lock: false,
    pellets: 2,
  },
  incendiary: {
    id: "incendiary",
    name: "Incendiary Pods",
    dmg: 52,
    rpm: 48,
    spread: 0.05,
    range: 72,
    heat: 11,
    speed: 36,
    splash: 8.5,
    hitscan: false,
    lock: false,
    pellets: 2,
  },
  flamer: {
    id: "flamer",
    name: "Spine Flamer",
    dmg: 7,
    rpm: 860,
    spread: 0.1,
    range: 24,
    heat: 0.2,
    speed: 0,
    splash: 1.2,
    hitscan: true,
    lock: false,
    pellets: 3,
  },
};

export function hasEnergyField(id: ChassisId) {
  return id === "titan" || id === "valkyrie" || id === "phantom" || id === "berserker";
}

export function fieldPool(id: ChassisId) {
  return id === "valkyrie" ? 420 : id === "phantom" ? 380 : id === "berserker" ? 640 : 760;
}

export function fieldToast(id: ChassisId) {
  return id === "phantom"
    ? "CLOAK DOWN"
    : id === "valkyrie"
      ? "FIELD DOWN"
      : id === "berserker"
        ? "BARRIER DOWN"
        : "SHIELD DOWN";
}

export const CHASSIS_LIST = Object.values(CHASSIS);
export const WEAPON_LIST = Object.values(WEAPONS);

export function resolveChassis(id: unknown): ChassisId {
  if (
    id === "titan" ||
    id === "reaper" ||
    id === "colossus" ||
    id === "phantom" ||
    id === "valkyrie" ||
    id === "berserker"
  )
    return id;
  return "titan";
}

const LOOT_POOL: ItemDef[] = [
  { id: "w-rotary", kind: "weapon", name: "Twin Helix Rotary", rarity: "rare", weaponId: "rotary" },
  { id: "w-core", kind: "weapon", name: "Sternum Lance", rarity: "epic", weaponId: "core" },
  { id: "w-assault", kind: "weapon", name: "Kestrel Rifle", rarity: "common", weaponId: "assault" },
  { id: "w-smg", kind: "weapon", name: "Needler", rarity: "common", weaponId: "smg" },
  { id: "w-plasma", kind: "weapon", name: "Ion Lance", rarity: "rare", weaponId: "plasma", damage: 0.08 },
  { id: "w-rail", kind: "weapon", name: "Spindle Rail", rarity: "epic", weaponId: "rail" },
  { id: "w-cannon", kind: "weapon", name: "Forge Cannon", rarity: "epic", weaponId: "cannon" },
  { id: "w-missiles", kind: "weapon", name: "Hydra Racks", rarity: "rare", weaponId: "missiles" },
  { id: "w-flak", kind: "weapon", name: "Shrapnel Gate", rarity: "rare", weaponId: "flak" },
  { id: "w-blade", kind: "weapon", name: "Cinder Edge", rarity: "legend", weaponId: "blade" },
  { id: "w-pulse", kind: "weapon", name: "Wing Pulse Lasers", rarity: "rare", weaponId: "pulse" },
  { id: "w-racks", kind: "weapon", name: "Underwing Racks", rarity: "rare", weaponId: "racks" },
  { id: "w-gatling", kind: "weapon", name: "Chin Gatling", rarity: "epic", weaponId: "gatling" },
  { id: "w-sniper", kind: "weapon", name: "Wraith Rail", rarity: "epic", weaponId: "sniper" },
  { id: "w-emp", kind: "weapon", name: "EMP Pulse", rarity: "rare", weaponId: "emp" },
  { id: "w-drones", kind: "weapon", name: "Shade Drones", rarity: "rare", weaponId: "drones" },
  { id: "w-cutters", kind: "weapon", name: "Plasma Cutters", rarity: "epic", weaponId: "cutters" },
  { id: "w-incendiary", kind: "weapon", name: "Incendiary Pods", rarity: "rare", weaponId: "incendiary" },
  { id: "w-flamer", kind: "weapon", name: "Spine Flamer", rarity: "rare", weaponId: "flamer" },
  { id: "a-plate", kind: "armor", name: "Ablative Plate", rarity: "common", hp: 80, armor: 40 },
  { id: "a-reactive", kind: "armor", name: "Reactive Weave", rarity: "rare", hp: 140, armor: 90 },
  { id: "a-aegis", kind: "armor", name: "Aegis Shell", rarity: "epic", hp: 220, armor: 160 },
  { id: "m-heatsink", kind: "mod", name: "Cryo Sink", rarity: "rare", heat: 24 },
  { id: "m-thruster", kind: "mod", name: "Afterburn Vanes", rarity: "rare", speed: 2.4 },
  { id: "m-core", kind: "mod", name: "Overclock Core", rarity: "epic", damage: 0.12, heat: 10 },
  { id: "m-servo", kind: "mod", name: "Gyro Servos", rarity: "common", speed: 1.2 },
];

export function defaultLoadout(chassis: ChassisId = "titan"): Loadout {
  const c = CHASSIS[chassis];
  return { chassis, primary: c.primary, secondary: c.secondary, items: [] };
}

export function hydrateLoadout(raw: Partial<Loadout> | null | undefined): Loadout {
  const chassis = resolveChassis(raw?.chassis);
  const base = defaultLoadout(chassis);
  if (raw?.chassis !== chassis) return base;
  const primary = raw?.primary && raw.primary in WEAPONS ? raw.primary : base.primary;
  const secondary = raw?.secondary && raw.secondary in WEAPONS ? raw.secondary : base.secondary;
  return { chassis, primary, secondary, items: Array.isArray(raw?.items) ? raw.items : [] };
}

export function rollLoot(rng: () => number, wave = 1): ItemDef {
  const weights: Record<Rarity, number> = {
    common: Math.max(8 - wave, 2),
    rare: 4 + wave * 0.4,
    epic: wave * 0.35,
    legend: wave > 5 ? wave * 0.12 : 0.05,
  };
  const bag = LOOT_POOL.flatMap((it) => Array.from({ length: Math.ceil(weights[it.rarity]) }, () => it));
  const pick = bag[Math.floor(rng() * bag.length)] ?? LOOT_POOL[0];
  return { ...pick };
}

export function applyItems(base: { hp: number; armor: number; speed: number; heatCap: number; dmgMul: number }, items: ItemDef[]) {
  const out = { ...base };
  for (const it of items) {
    out.hp += it.hp ?? 0;
    out.armor += it.armor ?? 0;
    out.speed += it.speed ?? 0;
    out.heatCap += it.heat ?? 0;
    out.dmgMul += it.damage ?? 0;
  }
  return out;
}
