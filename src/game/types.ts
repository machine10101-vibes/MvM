export type ChassisId = "vanguard" | "reaper" | "colossus" | "phantom";
export type WeaponId =
  | "assault"
  | "rail"
  | "missiles"
  | "smg"
  | "cannon"
  | "flak"
  | "plasma"
  | "blade";
export type ItemKind = "weapon" | "armor" | "mod";
export type GameMode = "demo" | "survival" | "ffa" | "tdm";
export type ViewMode = "title" | "hangar" | "play";
export type MatchMode = "ffa" | "tdm";
export type Screen =
  | "title"
  | "hangar"
  | "friends"
  | "lobby"
  | "play"
  | "results"
  | "paused";

export type Rarity = "common" | "rare" | "epic" | "legend";

export interface ItemDef {
  id: string;
  kind: ItemKind;
  name: string;
  rarity: Rarity;
  weaponId?: WeaponId;
  hp?: number;
  armor?: number;
  speed?: number;
  heat?: number;
  damage?: number;
}

export interface Loadout {
  chassis: ChassisId;
  primary: WeaponId;
  secondary: WeaponId;
  items: ItemDef[];
}

export interface Mech {
  id: string;
  name: string;
  chassis: ChassisId;
  isLocal: boolean;
  isAi: boolean;
  team: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  torso: number;
  pitch: number;
  speed: number;
  topSpeed: number;
  vx: number;
  vz: number;
  vy: number;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  heat: number;
  heatCap: number;
  boost: number;
  jump: number;
  alive: boolean;
  primary: WeaponId;
  secondary: WeaponId;
  cdPrimary: number;
  cdSecondary: number;
  lock: number;
  lockId: string | null;
  lastHitAt: number;
  fireFlash: number;
  altFlash: number;
  walk: number;
  sidestep: number;
  venting: number;
  kills: number;
  deaths: number;
  aimX: number;
  aimZ: number;
  aimY: number;
  respawnIn: number;
}

export interface Projectile {
  id: number;
  owner: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  dmg: number;
  splash: number;
  kind: "missile" | "plasma" | "cannon" | "flak";
  targetId: string | null;
  fresh?: boolean;
}

export interface LootOrb {
  id: number;
  x: number;
  z: number;
  y: number;
  item: ItemDef;
  life: number;
}

export interface Building {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  ruined: boolean;
  rot: number;
  tier: number;
}

export interface Spark {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  kind: "hit" | "muzzle" | "explode" | "boost" | "ember";
}

export interface Tracer {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  life: number;
  maxLife: number;
  kind: "bullet" | "rail" | "plasma" | "blade";
  owner: string;
  alt: boolean;
}

export interface Actions {
  throttle: number;
  steer: number;
  aimX: number;
  aimY: number;
  fire: boolean;
  alt: boolean;
  boost: boolean;
  jump: boolean;
  vent: boolean;
  strafe: number;
  pause: boolean;
}

export interface RadarContact {
  x: number;
  z: number;
  foe: boolean;
}

export interface HudSnap {
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  heat: number;
  heatCap: number;
  boost: number;
  jump: number;
  speed: number;
  yaw: number;
  chassis: ChassisId;
  primary: WeaponId;
  secondary: WeaponId;
  lock: number;
  lockName: string | null;
  wave: number;
  kills: number;
  aliveEnemies: number;
  overheat: boolean;
  toast: string | null;
  mode: GameMode;
  alive: boolean;
  pickupName: string | null;
  hitFlash: number;
  contacts: RadarContact[];
  cdPrimary: number;
  cdSecondary: number;
}

export interface ControlsProbe {
  getYaw: () => number;
  getSpeed: () => number;
  setSteer?: (v: number) => void;
  setKeys?: (codes: string[]) => void;
}

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}
