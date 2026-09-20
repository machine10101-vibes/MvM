import { mulberry32 } from "@/lib/utils";
import type { Building } from "./types";

export const MAP_SIZE = 260;
export const HALF = MAP_SIZE / 2;

export interface CityData {
  buildings: Building[];
  spawns: { x: number; z: number }[];
  wrecks: { x: number; z: number; yaw: number; chassis: number }[];
  fires: { x: number; z: number }[];
  debris: { x: number; z: number; s: number; y: number }[];
  lamps: { x: number; z: number }[];
  cars: { x: number; z: number; yaw: number }[];
  seed: number;
}

export function generateCity(seed: number): CityData {
  const rng = mulberry32(seed);
  const buildings: Building[] = [];
  const cell = 18;
  const plaza = 28;

  for (let gx = -HALF + 10; gx < HALF - 10; gx += cell) {
    for (let gz = -HALF + 10; gz < HALF - 10; gz += cell) {
      if (Math.abs(gx) < plaza && Math.abs(gz) < plaza) continue;
      const road = Math.round((gx + HALF) / cell) % 4 === 0 || Math.round((gz + HALF) / cell) % 4 === 0;
      if (road) continue;
      if (rng() < 0.3) continue;
      const w = 6 + rng() * 10;
      const d = 6 + rng() * 10;
      const ruined = rng() < 0.42;
      const h = ruined ? 4 + rng() * 16 : 10 + rng() * 42;
      buildings.push({
        x: gx + (rng() - 0.5) * 6,
        z: gz + (rng() - 0.5) * 6,
        w,
        d,
        h,
        ruined,
        rot: (rng() - 0.5) * 0.12,
        tier: Math.floor(rng() * 4),
      });
    }
  }

  buildings.push(
    { x: 8.5, z: 6.5, w: 3.2, d: 1.1, h: 2.4, ruined: true, rot: 0.08, tier: 0 },
    { x: -7.5, z: -5.2, w: 2.8, d: 1.2, h: 2.1, ruined: true, rot: -0.12, tier: 0 },
    { x: 4.2, z: -9.4, w: 4.4, d: 1.3, h: 2.6, ruined: false, rot: 0.02, tier: 1 },
    { x: -10.2, z: 3.6, w: 1.4, d: 3.8, h: 2.2, ruined: true, rot: 0.2, tier: 0 },
  );

  const spawns = [
    { x: 0, z: 14 },
    { x: 14, z: 0 },
    { x: 0, z: -14 },
    { x: -14, z: 0 },
    { x: 22, z: 22 },
    { x: -22, z: 22 },
    { x: 22, z: -22 },
    { x: -22, z: -22 },
  ];

  const wrecks = Array.from({ length: 8 }, () => ({
    x: (rng() - 0.5) * MAP_SIZE * 0.65,
    z: (rng() - 0.5) * MAP_SIZE * 0.65,
    yaw: rng() * Math.PI * 2,
    chassis: Math.floor(rng() * 4),
  }));

  const fires = Array.from({ length: 12 }, () => ({
    x: (rng() - 0.5) * MAP_SIZE * 0.78,
    z: (rng() - 0.5) * MAP_SIZE * 0.78,
  }));

  const debris = Array.from({ length: 72 }, () => ({
    x: (rng() - 0.5) * MAP_SIZE,
    z: (rng() - 0.5) * MAP_SIZE,
    s: 0.4 + rng() * 1.9,
    y: 0.2 + rng() * 0.55,
  }));

  const lamps: { x: number; z: number }[] = [];
  for (let i = -2; i <= 2; i++) {
    for (let t = -HALF + 16; t < HALF - 16; t += 26) {
      lamps.push({ x: t, z: i * 36 + 5.4 });
      lamps.push({ x: i * 36 + 5.4, z: t });
    }
  }

  const cars = Array.from({ length: 12 }, () => ({
    x: (rng() - 0.5) * MAP_SIZE * 0.72,
    z: (rng() - 0.5) * MAP_SIZE * 0.72,
    yaw: rng() * Math.PI * 2,
  }));

  return { buildings, spawns, wrecks, fires, debris, lamps, cars, seed };
}

export function circleHitsBuilding(x: number, z: number, r: number, b: Building) {
  const hx = b.w * 0.5 + r;
  const hz = b.d * 0.5 + r;
  const dx = x - b.x;
  const dz = z - b.z;
  return Math.abs(dx) < hx && Math.abs(dz) < hz;
}

export function resolveBuildings(x: number, z: number, r: number, buildings: Building[]) {
  let px = x;
  let pz = z;
  for (const b of buildings) {
    const hx = b.w * 0.5 + r;
    const hz = b.d * 0.5 + r;
    const dx = px - b.x;
    const dz = pz - b.z;
    if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
      const ox = hx - Math.abs(dx);
      const oz = hz - Math.abs(dz);
      if (ox < oz) px += Math.sign(dx || 1) * ox;
      else pz += Math.sign(dz || 1) * oz;
    }
  }
  px = Math.max(-HALF + 4, Math.min(HALF - 4, px));
  pz = Math.max(-HALF + 4, Math.min(HALF - 4, pz));
  return { x: px, z: pz };
}

export function rayHitsBuilding(
  ox: number,
  oz: number,
  dx: number,
  dz: number,
  max: number,
  buildings: Building[],
) {
  const steps = Math.ceil(max / 2);
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * max;
    const x = ox + dx * t;
    const z = oz + dz * t;
    for (const b of buildings) {
      if (Math.abs(x - b.x) < b.w * 0.5 && Math.abs(z - b.z) < b.d * 0.5) return t;
    }
  }
  return max;
}
