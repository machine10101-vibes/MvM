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
  vanguard: {
    id: "vanguard",
    name: "Vanguard",
    role: "Assault",
    blurb: "Frontline frame. Balanced plating, rifle, and shoulder racks.",
    hp: 1080,
    armor: 240,
    speed: 18,
    turn: 1.85,
    boostMul: 1.48,
    heatCap: 100,
    mass: 1,
    scale: 1,
    primary: "assault",
    secondary: "missiles",
    paint: 0x6e7682,
    accent: 0xd0d6de,
    trim: 0x8a93a0,
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
    role: "Striker",
    blurb: "Angular interceptor. Plasma lances and a short-range cutter.",
    hp: 860,
    armor: 150,
    speed: 22.4,
    turn: 2.15,
    boostMul: 1.6,
    heatCap: 94,
    mass: 0.84,
    scale: 0.96,
    primary: "plasma",
    secondary: "blade",
    paint: 0x3e4654,
    accent: 0xb8e4f2,
    trim: 0x6a7888,
  },
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
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
};

export const CHASSIS_LIST = Object.values(CHASSIS);

const LOOT_POOL: ItemDef[] = [
  { id: "w-assault", kind: "weapon", name: "Kestrel Rifle", rarity: "common", weaponId: "assault" },
  { id: "w-smg", kind: "weapon", name: "Needler", rarity: "common", weaponId: "smg" },
  { id: "w-plasma", kind: "weapon", name: "Ion Lance", rarity: "rare", weaponId: "plasma", damage: 0.08 },
  { id: "w-rail", kind: "weapon", name: "Spindle Rail", rarity: "epic", weaponId: "rail" },
  { id: "w-cannon", kind: "weapon", name: "Forge Cannon", rarity: "epic", weaponId: "cannon" },
  { id: "w-missiles", kind: "weapon", name: "Hydra Racks", rarity: "rare", weaponId: "missiles" },
  { id: "w-flak", kind: "weapon", name: "Shrapnel Gate", rarity: "rare", weaponId: "flak" },
  { id: "w-blade", kind: "weapon", name: "Cinder Edge", rarity: "legend", weaponId: "blade" },
  { id: "a-plate", kind: "armor", name: "Ablative Plate", rarity: "common", hp: 80, armor: 40 },
  { id: "a-reactive", kind: "armor", name: "Reactive Weave", rarity: "rare", hp: 140, armor: 90 },
  { id: "a-aegis", kind: "armor", name: "Aegis Shell", rarity: "epic", hp: 220, armor: 160 },
  { id: "m-heatsink", kind: "mod", name: "Cryo Sink", rarity: "rare", heat: 24 },
  { id: "m-thruster", kind: "mod", name: "Afterburn Vanes", rarity: "rare", speed: 2.4 },
  { id: "m-core", kind: "mod", name: "Overclock Core", rarity: "epic", damage: 0.12, heat: 10 },
  { id: "m-servo", kind: "mod", name: "Gyro Servos", rarity: "common", speed: 1.2 },
];

export function defaultLoadout(chassis: ChassisId = "vanguard"): Loadout {
  const c = CHASSIS[chassis];
  return { chassis, primary: c.primary, secondary: c.secondary, items: [] };
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
