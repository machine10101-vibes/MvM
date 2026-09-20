import { angleDiff, clamp, mulberry32, uid } from "@/lib/utils";
import { applyItems, CHASSIS, defaultLoadout, rollLoot, WEAPONS } from "./catalog";
import { generateCity, rayHitsBuilding, resolveBuildings, type CityData } from "./city";
import { audio } from "./audio";
import type {
  Actions,
  ChassisId,
  GameMode,
  HudSnap,
  ItemDef,
  Loadout,
  LootOrb,
  Mech,
  Projectile,
  Spark,
  Tracer,
} from "./types";

const RADIUS = 2.15;
let nextProj = 1;
let nextLoot = 1;

function makeMech(
  id: string,
  name: string,
  chassis: ChassisId,
  x: number,
  z: number,
  yaw: number,
  opts: { isLocal?: boolean; isAi?: boolean; team?: number; loadout?: Loadout },
): Mech {
  const c = CHASSIS[chassis];
  const loadout = opts.loadout ?? defaultLoadout(chassis);
  const stats = applyItems(
    { hp: c.hp, armor: c.armor, speed: c.speed, heatCap: c.heatCap, dmgMul: 1 },
    loadout.items,
  );
  return {
    id,
    name,
    chassis,
    isLocal: !!opts.isLocal,
    isAi: !!opts.isAi,
    team: opts.team ?? 0,
    x,
    y: 0,
    z,
    yaw,
    torso: 0,
    pitch: -0.12,
    speed: 0,
    topSpeed: stats.speed,
    vx: 0,
    vz: 0,
    vy: 0,
    hp: stats.hp,
    maxHp: stats.hp,
    armor: stats.armor,
    maxArmor: stats.armor,
    heat: 0,
    heatCap: stats.heatCap,
    boost: 1,
    jump: 1,
    alive: true,
    primary: loadout.primary,
    secondary: loadout.secondary,
    cdPrimary: 0,
    cdSecondary: 0,
    lock: 0,
    lockId: null,
    lastHitAt: -99,
    fireFlash: 0,
    altFlash: 0,
    walk: 0,
    sidestep: 0,
    venting: 0,
    special: c.special ?? null,
    cdSpecial: 0,
    specialFlash: 0,
    shield: c.special === "core" ? 1 : 0,
    shieldUp: false,
    kills: 0,
    deaths: 0,
    aimX: -Math.sin(yaw),
    aimZ: -Math.cos(yaw),
    aimY: 0,
    respawnIn: 0,
  };
}

export class Sim {
  mode: GameMode = "demo";
  city: CityData;
  mechs: Mech[] = [];
  projectiles: Projectile[] = [];
  loot: LootOrb[] = [];
  sparks: Spark[] = [];
  tracers: Tracer[] = [];
  time = 0;
  wave = 0;
  waveSpawnAt = 0;
  intermission = 0;
  toast: string | null = null;
  toastT = 0;
  pickupName: string | null = null;
  pickupT = 0;
  localId = "local";
  rng: () => number;
  loadout: Loadout;
  dmgMul = 1;
  over = false;
  result = { wave: 0, kills: 0 };
  paused = false;
  hitFlash = 0;
  remoteIds = new Set<string>();
  onKill: ((killer: string, victim: string) => void) | null = null;
  onFire: ((owner: string, weapon: string) => void) | null = null;

  constructor(seed = 0x51a7) {
    this.rng = mulberry32(seed);
    this.city = generateCity(seed);
    this.loadout = defaultLoadout("titan");
    this.resetDemo();
  }

  get local() {
    return this.mechs.find((m) => m.id === this.localId) ?? this.mechs[0];
  }

  resetDemo() {
    this.mode = "demo";
    this.over = false;
    this.wave = 0;
    this.mechs = [];
    this.projectiles = [];
    this.loot = [];
    this.sparks = [];
    this.tracers = [];
    const hero = makeMech(this.localId, "Pilot", this.loadout.chassis, 0, 8, 0, {
      isLocal: true,
      loadout: this.loadout,
    });
    this.mechs.push(hero);
    const ids: ChassisId[] = ["reaper", "colossus", "phantom", "titan"];
    for (let i = 0; i < 3; i++) {
      const s = this.city.spawns[(i + 2) % this.city.spawns.length];
      this.mechs.push(
        makeMech(uid("ai"), "Hostile", ids[i % ids.length], s.x + i * 4, s.z, this.rng() * 6, {
          isAi: true,
          team: 1,
        }),
      );
    }
  }

  startSurvival(loadout: Loadout) {
    this.loadout = loadout;
    this.mode = "survival";
    this.over = false;
    this.wave = 0;
    this.intermission = 1.5;
    this.time = 0;
    this.projectiles = [];
    this.loot = [];
    this.sparks = [];
    this.tracers = [];
    this.mechs = [
      makeMech(this.localId, "Pilot", loadout.chassis, 0, 10, 0, { isLocal: true, loadout }),
    ];
    this.applyLoadoutStats(this.local);
    this.toast = "WAVE INBOUND";
    this.toastT = 2;
  }

  startMatch(mode: "ffa" | "tdm", loadout: Loadout, roster: { id: string; name: string; chassis: ChassisId; team: number }[]) {
    this.loadout = loadout;
    this.mode = mode;
    this.over = false;
    this.time = 0;
    this.projectiles = [];
    this.loot = [];
    this.sparks = [];
    this.tracers = [];
    this.mechs = [];
    this.remoteIds = new Set();
    roster.forEach((r, i) => {
      const s = this.city.spawns[i % this.city.spawns.length];
      const isLocal = r.id === this.localId;
      const m = makeMech(r.id, r.name, r.chassis, s.x, s.z, Math.atan2(-s.x, -s.z), {
        isLocal,
        isAi: false,
        team: r.team,
        loadout: isLocal ? loadout : defaultLoadout(r.chassis),
      });
      if (!isLocal) this.remoteIds.add(r.id);
      this.mechs.push(m);
    });
  }

  setHangarChassis(id: ChassisId) {
    this.loadout = { ...this.loadout, chassis: id, primary: CHASSIS[id].primary, secondary: CHASSIS[id].secondary };
    const p = this.local;
    if (!p) return;
    const fresh = makeMech(p.id, p.name, id, 0, 0, 0, { isLocal: true, loadout: this.loadout });
    Object.assign(p, fresh, { x: 0, z: 0, y: 0, yaw: 0 });
  }

  applyLoadoutStats(m: Mech) {
    const c = CHASSIS[m.chassis];
    const stats = applyItems(
      { hp: c.hp, armor: c.armor, speed: c.speed, heatCap: c.heatCap, dmgMul: 1 },
      this.loadout.items,
    );
    m.maxHp = stats.hp;
    m.maxArmor = stats.armor;
    m.heatCap = stats.heatCap;
    m.topSpeed = stats.speed;
    this.dmgMul = stats.dmgMul;
    if (m.hp > m.maxHp) m.hp = m.maxHp;
    if (m.armor > m.maxArmor) m.armor = m.maxArmor;
  }

  step(dt: number, actions: Actions) {
    if (this.paused) return;
    this.time += dt;
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.toast = null;
    }
    if (this.pickupT > 0) {
      this.pickupT -= dt;
      if (this.pickupT <= 0) this.pickupName = null;
    }
    this.hitFlash = Math.max(0, this.hitFlash - dt * 4.2);

    const local = this.local;
    if (local?.isLocal && local.alive && this.mode !== "demo") {
      this.control(local, actions, dt);
    }

    for (const m of this.mechs) {
      if (!m.alive) {
        if (m.respawnIn > 0) {
          m.respawnIn -= dt;
          if (m.respawnIn <= 0 && (this.mode === "ffa" || this.mode === "tdm")) this.respawn(m);
        }
        continue;
      }
      if (m.isAi || (this.mode === "demo" && m.isLocal)) this.thinkAi(m, dt);
      if (!this.remoteIds.has(m.id)) this.integrate(m, dt);
    }

    this.stepProjectiles(dt);
    this.stepLoot(dt);
    this.stepSparks(dt);
    this.stepTracers(dt);

    if (this.mode === "survival" && !this.over) this.stepWaves(dt);
    if (this.mode === "demo") this.keepDemoPopulated();

    if (local && !local.alive && this.mode === "survival" && !this.over) {
      this.over = true;
      this.result = { wave: this.wave, kills: local.kills };
    }
  }

  private control(m: Mech, a: Actions, dt: number) {
    m.torso = clamp(m.torso - a.aimX, -0.85, 0.85);
    m.pitch = clamp(m.pitch - a.aimY, -0.55, 0.35);

    const c = CHASSIS[m.chassis];
    const top = m.topSpeed || c.speed;
    const want = a.throttle * top * (a.boost && m.boost > 0.05 ? c.boostMul : 1);
    const accel = (a.boost ? 38 : 24) / c.mass;
    if (a.throttle !== 0) m.speed += Math.sign(want - m.speed) * accel * dt;
    else m.speed += -Math.sign(m.speed) * 16 * dt;
    if (Math.abs(m.speed - want) < 0.4 && a.throttle !== 0) m.speed = want;
    if (Math.abs(m.speed) < 0.15 && a.throttle === 0) m.speed = 0;
    m.speed = clamp(m.speed, -top * 0.55, top * (a.boost && m.boost > 0.05 ? c.boostMul : 1));

    const speedFactor = clamp(0.45 + Math.abs(m.speed) / Math.max(top, 1) * 0.55, 0.45, 1);
    const reverse = m.speed >= 0 ? 1 : -1;
    m.yaw += a.steer * c.turn * speedFactor * reverse * dt;

    const topLat = top * 0.62;
    const wantSide = a.strafe * topLat;
    if (a.strafe !== 0) m.sidestep += Math.sign(wantSide - m.sidestep) * 28 * dt;
    else m.sidestep += -Math.sign(m.sidestep) * 22 * dt;
    if (Math.abs(m.sidestep - wantSide) < 0.35 && a.strafe !== 0) m.sidestep = wantSide;
    if (Math.abs(m.sidestep) < 0.2 && a.strafe === 0) m.sidestep = 0;
    m.sidestep = clamp(m.sidestep, -topLat, topLat);
    if (a.shield && m.shield > 0.04) {
      m.shieldUp = true;
      m.speed = clamp(m.speed, -top * 0.4, top * 0.72);
    } else m.shieldUp = false;

    if (a.vent && m.venting <= 0 && m.heat > 8) {
      m.venting = 1.15;
      m.heat = Math.max(0, m.heat - 42);
      this.toast = "HEAT VENT";
      this.toastT = 0.7;
      audio.ui();
    }
    m.venting = Math.max(0, m.venting - dt);

    if (a.boost && m.boost > 0) {
      m.boost = Math.max(0, m.boost - dt * 0.28);
      const bx = Math.sin(m.yaw);
      const bz = Math.cos(m.yaw);
      this.sparks.push({ x: m.x, y: 1.2, z: m.z, vx: bx * 9, vy: 0.5, vz: bz * 9, life: 0.18, maxLife: 0.18, kind: "boost" });
    } else m.boost = Math.min(1, m.boost + dt * 0.12);

    if (a.jump && m.jump > 0.12 && m.y < 8) {
      m.vy += 18 * dt;
      m.jump = Math.max(0, m.jump - dt * 0.55);
    } else m.jump = Math.min(1, m.jump + dt * 0.18);

    const look = m.yaw + m.torso;
    m.aimX = -Math.sin(look) * Math.cos(m.pitch);
    m.aimZ = -Math.cos(look) * Math.cos(m.pitch);
    m.aimY = Math.sin(-m.pitch) + 0.08;

    this.updateLock(m, dt);
    const overheat = m.heat >= m.heatCap || m.venting > 0;
    if (!overheat) {
      if (a.fire) this.tryFire(m, m.primary, "primary");
      if (a.alt) this.tryFire(m, m.secondary, "secondary");
      if (a.special && m.special) this.tryFire(m, m.special, "special");
    }
    audio.setEngine(m.speed, a.boost);
  }

  private integrate(m: Mech, dt: number) {
    const fx = -Math.sin(m.yaw);
    const fz = -Math.cos(m.yaw);
    const rx = -Math.cos(m.yaw);
    const rz = Math.sin(m.yaw);
    m.x += fx * m.speed * dt + rx * m.sidestep * dt;
    m.z += fz * m.speed * dt + rz * m.sidestep * dt;
    m.vy -= 22 * dt;
    m.y += m.vy * dt;
    if (m.y < 0) {
      m.y = 0;
      m.vy = 0;
    }
    const resolved = resolveBuildings(m.x, m.z, RADIUS, this.city.buildings);
    m.x = resolved.x;
    m.z = resolved.z;
    m.walk += (Math.abs(m.speed) + Math.abs(m.sidestep) * 0.85) * dt * 1.7;
    m.cdPrimary = Math.max(0, m.cdPrimary - dt);
    m.cdSecondary = Math.max(0, m.cdSecondary - dt);
    m.cdSpecial = Math.max(0, m.cdSpecial - dt);
    m.fireFlash = Math.max(0, m.fireFlash - dt);
    m.altFlash = Math.max(0, m.altFlash - dt);
    m.specialFlash = Math.max(0, m.specialFlash - dt);
    if (m.shieldUp && m.shield > 0) {
      m.shield = Math.max(0, m.shield - dt * 0.2);
      if (m.shield <= 0) {
        m.shieldUp = false;
        if (m.isLocal) {
          this.toast = "SHIELD DOWN";
          this.toastT = 0.8;
        }
      }
    } else if (m.special === "core") {
      m.shield = Math.min(1, m.shield + dt * 0.085);
    }
    m.heat = Math.max(0, m.heat - dt * 12);
    if (this.time - m.lastHitAt > 4) m.armor = Math.min(m.maxArmor, m.armor + dt * 12);
    if (!m.alive) {
      m.speed *= 0.9;
      m.y = Math.max(m.y - dt * 0.4, -0.4);
    }
  }

  private updateLock(m: Mech, dt: number) {
    const w = WEAPONS[m.secondary];
    if (!w.lock) {
      m.lock = 0;
      m.lockId = null;
      return;
    }
    let best: Mech | null = null;
    let bestDot = 0.82;
    for (const o of this.mechs) {
      if (o === m || !o.alive || o.team === m.team) continue;
      const dx = o.x - m.x;
      const dz = o.z - m.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 110 || dist < 6) continue;
      const nx = dx / dist;
      const nz = dz / dist;
      const dot = nx * m.aimX + nz * m.aimZ;
      if (dot > bestDot) {
        bestDot = dot;
        best = o;
      }
    }
    if (best) {
      if (m.lockId === best.id) m.lock = Math.min(1, m.lock + dt * 0.7);
      else {
        m.lockId = best.id;
        m.lock = 0.1;
      }
    } else {
      m.lock = Math.max(0, m.lock - dt);
      if (m.lock <= 0) m.lockId = null;
    }
  }

  private tryFire(m: Mech, weaponId: Mech["primary"], slot: "primary" | "secondary" | "special") {
    const cd = slot === "special" ? m.cdSpecial : slot === "secondary" ? m.cdSecondary : m.cdPrimary;
    if (cd > 0) return;
    const w = WEAPONS[weaponId];
    if (w.lock && m.lock < 1) return;
    const interval = 60 / w.rpm;
    if (slot === "special") m.cdSpecial = interval;
    else if (slot === "secondary") m.cdSecondary = interval;
    else m.cdPrimary = interval;
    m.heat = Math.min(m.heatCap + 5, m.heat + w.heat);
    const punch = weaponId === "rail" || weaponId === "cannon" || weaponId === "blade" || weaponId === "core" ? 0.32 : 0.2;
    if (slot === "special") m.specialFlash = punch;
    else if (slot === "secondary") m.altFlash = punch;
    else m.fireFlash = punch;
    const alt = slot === "secondary";

    const originY = 3.15 + m.y;
    const ox = m.x + m.aimX * 2.6;
    const oz = m.z + m.aimZ * 2.6;
    const dmg = w.dmg * this.dmgMul * (m.isAi ? 0.72 : 1);

    if (w.hitscan) {
      for (let p = 0; p < w.pellets; p++) {
        const sx = (this.rng() - 0.5) * w.spread;
        const sz = (this.rng() - 0.5) * w.spread;
        const dx = m.aimX + sx;
        const dz = m.aimZ + sz;
        const len = Math.hypot(dx, dz) || 1;
        const hitDist = this.hitscan(m, ox, originY, oz, dx / len, m.aimY, dz / len, w.range, dmg);
        this.sparks.push({
          x: ox,
          y: originY,
          z: oz,
          vx: -m.aimZ * (3 + this.rng() * 5) + (this.rng() - 0.5) * 2,
          vy: 2 + this.rng() * 4,
          vz: m.aimX * (3 + this.rng() * 5) + (this.rng() - 0.5) * 2,
          life: 0.1,
          maxLife: 0.14,
          kind: "muzzle",
        });
        this.sparks.push({
          x: ox,
          y: originY,
          z: oz,
          vx: -m.aimZ * (5 + this.rng() * 6) + (this.rng() - 0.5),
          vy: 3 + this.rng() * 5,
          vz: m.aimX * (5 + this.rng() * 6) + (this.rng() - 0.5),
          life: 0.22,
          maxLife: 0.28,
          kind: "ember",
        });
        this.sparks.push({
          x: ox + (dx / len) * Math.min(hitDist, 1.4),
          y: originY,
          z: oz + (dz / len) * Math.min(hitDist, 1.4),
          vx: (this.rng() - 0.5) * 6,
          vy: 1 + this.rng() * 3,
          vz: (this.rng() - 0.5) * 6,
          life: 0.18,
          maxLife: 0.22,
          kind: "ember",
        });
        this.tracers.push({
          x0: ox,
          y0: originY,
          z0: oz,
          x1: ox + (dx / len) * hitDist,
          y1: originY + m.aimY * hitDist,
          z1: oz + (dz / len) * hitDist,
          life: weaponId === "rail" ? 0.34 : weaponId === "blade" ? 0.18 : 0.14,
          maxLife: weaponId === "rail" ? 0.34 : weaponId === "blade" ? 0.18 : 0.14,
          kind: weaponId === "rail" ? "rail" : weaponId === "blade" ? "blade" : "bullet",
          owner: m.id,
          alt,
        });
      }
      audio.fire(weaponId === "rail" || weaponId === "blade" ? "heavy" : "hitscan");
    } else {
      for (let p = 0; p < w.pellets; p++) {
        const sx = (this.rng() - 0.5) * w.spread * 4;
        const sz = (this.rng() - 0.5) * w.spread * 4;
        const dx = m.aimX + sx;
        const dy = m.aimY + (this.rng() - 0.5) * w.spread;
        const dz = m.aimZ + sz;
        const len = Math.hypot(dx, dz, dy) || 1;
        this.projectiles.push({
          id: nextProj++,
          owner: m.id,
          x: ox,
          y: originY,
          z: oz,
          vx: (dx / len) * w.speed,
          vy: (dy / len) * w.speed,
          vz: (dz / len) * w.speed,
          life: w.range / w.speed,
          dmg,
          splash: w.splash,
          kind:
            weaponId === "missiles"
              ? "missile"
              : weaponId === "core"
                ? "core"
                : weaponId === "plasma"
                  ? "plasma"
                  : weaponId === "flak"
                    ? "flak"
                    : "cannon",
          targetId: w.lock ? m.lockId : null,
          fresh: true,
        });
        this.sparks.push({
          x: ox,
          y: originY,
          z: oz,
          vx: (dx / len) * 4 + (this.rng() - 0.5) * 3,
          vy: 1.5 + this.rng() * 3,
          vz: (dz / len) * 4 + (this.rng() - 0.5) * 3,
          life: 0.16,
          maxLife: 0.2,
          kind: "muzzle",
        });
      }
      audio.fire(weaponId === "missiles" ? "missile" : "plasma");
    }
    this.onFire?.(m.id, weaponId);
  }

  private hitscan(
    owner: Mech,
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    range: number,
    dmg: number,
  ) {
    const wall = rayHitsBuilding(ox, oz, dx, dz, range, this.city.buildings);
    let best = wall;
    let target: Mech | null = null;
    for (const o of this.mechs) {
      if (o === owner || !o.alive) continue;
      if (this.mode === "tdm" && o.team === owner.team) continue;
      const wx = o.x - ox;
      const wz = o.z - oz;
      const wy = o.y + 3 - oy;
      const t = wx * dx + wz * dz + wy * dy;
      if (t < 0 || t > best) continue;
      const px = ox + dx * t - o.x;
      const pz = oz + dz * t - o.z;
      const py = oy + dy * t - (o.y + 3);
      if (px * px + pz * pz + py * py * 0.45 < 6.5) {
        best = t;
        target = o;
      }
    }
    if (target) {
      this.damage(target, dmg, owner);
      this.sparks.push({
        x: target.x + (this.rng() - 0.5) * 1.4,
        y: target.y + 2.4 + this.rng(),
        z: target.z + (this.rng() - 0.5) * 1.4,
        vx: (this.rng() - 0.5) * 8,
        vy: 2 + this.rng() * 5,
        vz: (this.rng() - 0.5) * 8,
        life: 0.22,
        maxLife: 0.28,
        kind: "hit",
      });
    } else {
      this.sparks.push({ x: ox + dx * best, y: oy + dy * best, z: oz + dz * best, vx: 0, vy: 0.4, vz: 0, life: 0.12, maxLife: 0.12, kind: "hit" });
    }
    return best;
  }

  private stepProjectiles(dt: number) {
    const keep: Projectile[] = [];
    for (const p of this.projectiles) {
      if (p.targetId) {
        const t = this.mechs.find((m) => m.id === p.targetId && m.alive);
        if (t) {
          const dx = t.x - p.x;
          const dy = t.y + 3 - p.y;
          const dz = t.z - p.z;
          const len = Math.hypot(dx, dy, dz) || 1;
          const spd = Math.hypot(p.vx, p.vy, p.vz);
          p.vx = dx / len * spd;
          p.vy = dy / len * spd;
          p.vz = dz / len * spd;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.life -= dt;
      let hit = p.life <= 0 || p.y < 0;
      if (!hit) {
        for (const b of this.city.buildings) {
          if (Math.abs(p.x - b.x) < b.w * 0.5 && Math.abs(p.z - b.z) < b.d * 0.5 && p.y < b.h) {
            hit = true;
            break;
          }
        }
      }
      const owner = this.mechs.find((m) => m.id === p.owner);
      if (!hit) {
        for (const m of this.mechs) {
          if (!m.alive || m.id === p.owner) continue;
          if (this.mode === "tdm" && owner && m.team === owner.team) continue;
          if (Math.hypot(m.x - p.x, m.z - p.z) < 2.6 && Math.abs(m.y + 3 - p.y) < 3.2) {
            this.splash(p, owner ?? null);
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        if (p.life <= 0) this.splash(p, owner ?? null);
        else this.sparks.push({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0.8, vz: 0, life: 0.2, maxLife: 0.2, kind: p.splash > 3 ? "explode" : "hit" });
      } else keep.push(p);
    }
    this.projectiles = keep;
  }

  private splash(p: Projectile, owner: Mech | null) {
    this.sparks.push({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 1.5, vz: 0, life: 0.35, maxLife: 0.35, kind: "explode" });
    audio.explode();
    const r = Math.max(2.4, p.splash);
    for (const m of this.mechs) {
      if (!m.alive) continue;
      if (owner && m.id === owner.id) continue;
      if (this.mode === "tdm" && owner && m.team === owner.team) continue;
      const d = Math.hypot(m.x - p.x, m.z - p.z);
      if (d < r + 2) this.damage(m, p.dmg * (1 - d / (r + 2)), owner);
    }
  }

  damage(m: Mech, amount: number, src: Mech | null) {
    if (!m.alive || amount <= 0) return;
    if (m.shieldUp && m.shield > 0) {
      const pool = m.shield * 760;
      const soak = Math.min(pool, amount * 0.88);
      m.shield = Math.max(0, (pool - soak) / 760);
      amount -= soak;
      if (m.shield <= 0.01) {
        m.shield = 0;
        m.shieldUp = false;
        if (m.isLocal) {
          this.toast = "SHIELD DOWN";
          this.toastT = 0.8;
        }
      }
    }
    if (amount <= 0) return;
    const absorbed = Math.min(m.armor, amount * 0.58);
    m.armor -= absorbed;
    m.hp -= amount - absorbed;
    m.lastHitAt = this.time;
    this.sparks.push({ x: m.x, y: m.y + 3.2, z: m.z, vx: 0, vy: 1.4, vz: 0, life: 0.16, maxLife: 0.16, kind: "hit" });
    if (src?.isLocal) {
      audio.hit();
      this.hitFlash = 1;
    }
    if (m.hp <= 0) this.kill(m, src);
  }

  private kill(m: Mech, src: Mech | null) {
    m.alive = false;
    m.hp = 0;
    m.deaths += 1;
    m.speed = 0;
    if (src && src !== m) src.kills += 1;
    this.onKill?.(src?.id ?? "", m.id);
    audio.explode();
    for (let i = 0; i < 10; i++) {
      this.sparks.push({
        x: m.x + (this.rng() - 0.5) * 3,
        y: m.y + 1 + this.rng() * 4,
        z: m.z + (this.rng() - 0.5) * 3,
        vx: (this.rng() - 0.5) * 8,
        vy: 2 + this.rng() * 6,
        vz: (this.rng() - 0.5) * 8,
        life: 0.4 + this.rng() * 0.4,
        maxLife: 0.8,
        kind: "explode",
      });
    }
    if (this.mode === "survival" || this.mode === "demo") {
      const item = rollLoot(this.rng, this.wave);
      this.loot.push({ id: nextLoot++, x: m.x, z: m.z, y: 1.4, item, life: 28 });
    }
    if (this.mode === "ffa" || this.mode === "tdm") m.respawnIn = 4.5;
  }

  private respawn(m: Mech) {
    if (this.over) return;
    const s = this.city.spawns[Math.floor(this.rng() * this.city.spawns.length)];
    const c = CHASSIS[m.chassis];
    m.alive = true;
    m.hp = m.maxHp;
    m.armor = m.maxArmor;
    m.heat = 0;
    m.shield = m.special === "core" ? 1 : 0;
    m.shieldUp = false;
    m.x = s.x;
    m.z = s.z;
    m.y = 0;
    m.yaw = this.rng() * Math.PI * 2;
    m.maxHp = c.hp;
  }

  private stepLoot(dt: number) {
    const local = this.local;
    const keep: LootOrb[] = [];
    for (const o of this.loot) {
      o.life -= dt;
      o.y = 1.4 + Math.sin(this.time * 3 + o.id) * 0.25;
      if (o.life <= 0) continue;
      if (local?.alive && Math.hypot(local.x - o.x, local.z - o.z) < 4.2) {
        this.collect(o.item);
        continue;
      }
      keep.push(o);
    }
    this.loot = keep;
  }

  collect(item: ItemDef) {
    this.loadout.items = [...this.loadout.items, item].slice(-12);
    if (item.weaponId && item.kind === "weapon") {
      const stock = CHASSIS[this.local.chassis].primary;
      if (this.local.primary === stock && item.weaponId !== this.local.primary) {
        this.loadout.primary = item.weaponId;
      } else if (item.weaponId !== this.local.primary) {
        this.loadout.secondary = item.weaponId;
      }
      this.local.primary = this.loadout.primary;
      this.local.secondary = this.loadout.secondary;
    }
    this.applyLoadoutStats(this.local);
    this.local.hp = Math.min(this.local.maxHp, this.local.hp + (item.hp ?? 40));
    this.local.armor = Math.min(this.local.maxArmor, this.local.armor + (item.armor ?? 20));
    this.pickupName = item.name;
    this.pickupT = 2.4;
    audio.ui();
  }

  private stepSparks(dt: number) {
    this.sparks = this.sparks.filter((s) => {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.vy -= 10 * dt;
      return s.life > 0;
    });
    if (this.sparks.length > 80) this.sparks.splice(0, this.sparks.length - 80);
  }

  private stepTracers(dt: number) {
    this.tracers = this.tracers.filter((t) => {
      t.life -= dt;
      return t.life > 0;
    });
    if (this.tracers.length > 40) this.tracers.splice(0, this.tracers.length - 40);
  }

  private stepWaves(dt: number) {
    const enemies = this.mechs.filter((m) => m.isAi && m.alive);
    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) this.spawnWave();
      return;
    }
    if (enemies.length === 0 && this.wave > 0) {
      this.intermission = 4;
      this.toast = `WAVE ${this.wave} CLEARED`;
      this.toastT = 2.5;
    }
  }

  private spawnWave() {
    this.wave += 1;
    const n = Math.min(2 + this.wave, 8);
    const types: ChassisId[] = ["titan", "reaper", "phantom"];
    if (this.wave >= 3) types.push("colossus");
    for (let i = 0; i < n; i++) {
      const s = this.city.spawns[(i + this.wave) % this.city.spawns.length];
      const chassis = types[Math.floor(this.rng() * types.length)];
      const m = makeMech(uid("ai"), `Host-${this.wave}-${i}`, chassis, s.x, s.z, this.rng() * 6, {
        isAi: true,
        team: 1,
      });
      const scale = 1 + (this.wave - 1) * 0.12;
      m.maxHp *= scale;
      m.hp = m.maxHp;
      m.maxArmor *= scale;
      m.armor = m.maxArmor;
      this.mechs.push(m);
    }
    this.toast = `WAVE ${this.wave}`;
    this.toastT = 2.2;
    this.mechs = this.mechs.filter((m) => m.alive || m.isLocal);
  }

  private keepDemoPopulated() {
    const ai = this.mechs.filter((m) => m.isAi && m.alive);
    if (ai.length < 3) {
      const s = this.city.spawns[Math.floor(this.rng() * this.city.spawns.length)];
      const ids: ChassisId[] = ["titan", "reaper", "colossus", "phantom"];
      this.mechs.push(
        makeMech(uid("ai"), "Hostile", ids[Math.floor(this.rng() * 4)], s.x, s.z, this.rng() * 6, {
          isAi: true,
          team: 1,
        }),
      );
    }
  }

  private thinkAi(m: Mech, dt: number) {
    const foes = this.mechs.filter((o) => o.alive && o.id !== m.id && (this.mode !== "tdm" || o.team !== m.team));
    let target = foes[0];
    let best = Infinity;
    for (const o of foes) {
      const d = Math.hypot(o.x - m.x, o.z - m.z);
      if (d < best) {
        best = d;
        target = o;
      }
    }
    if (!target) {
      m.speed *= 0.98;
      return;
    }
    const dx = target.x - m.x;
    const dz = target.z - m.z;
    const dist = Math.hypot(dx, dz) || 1;
    const wantYaw = Math.atan2(-dx, -dz);
    m.yaw += angleDiff(m.yaw, wantYaw) * dt * 1.6;
    m.torso += angleDiff(m.yaw + m.torso, wantYaw) * dt * 2.2;
    const ideal = m.chassis === "titan" ? 16 : m.chassis === "colossus" ? 28 : 22;
    const c = CHASSIS[m.chassis];
    const top = m.topSpeed || c.speed;
    if (dist > ideal + 8) m.speed = Math.min(top * 0.9, m.speed + 20 * dt);
    else if (dist < ideal - 8) m.speed = Math.max(-top * 0.3, m.speed - 16 * dt);
    else m.speed += -Math.sign(m.speed) * 8 * dt;

    const look = m.yaw + m.torso;
    m.aimX = -Math.sin(look);
    m.aimZ = -Math.cos(look);
    m.aimY = 0.05;
    const los = rayHitsBuilding(m.x, m.z, m.aimX, m.aimZ, dist, this.city.buildings);
    const skill = this.mode === "survival" ? Math.min(0.92, 0.45 + this.wave * 0.06) : 0.55;
    if (los < dist - 4) {
      m.sidestep += (this.rng() > 0.5 ? 1 : -1) * 10 * dt;
      m.yaw += (this.rng() - 0.5) * dt * 3;
    } else {
      if (dist < 90 && this.rng() < skill * dt * 3) this.tryFire(m, m.primary, "primary");
      if (dist < 70 && this.rng() < skill * dt) this.tryFire(m, m.secondary, "secondary");
      if (m.special && dist < 80 && this.rng() < skill * dt * 0.45) this.tryFire(m, m.special, "special");
    }
    if (m.chassis === "titan" && m.hp < m.maxHp * 0.55 && m.shield > 0.12) m.shieldUp = true;
    if (dist < 18 && this.rng() < dt * 0.4) m.yaw += (this.rng() - 0.5) * 2;
    if (dist > 40 && this.rng() < dt * 0.35) m.boost = Math.max(0.2, m.boost);
    if (m.heat > m.heatCap * 0.85 && this.rng() < dt * 2) {
      m.venting = 0.8;
      m.heat *= 0.55;
    }
  }

  applyRemoteState(
    id: string,
    s: {
      x: number;
      y: number;
      z: number;
      yaw: number;
      torso: number;
      pitch: number;
      hp: number;
      speed: number;
      chassis: ChassisId;
      fire?: boolean;
      name?: string;
      team?: number;
    },
  ) {
    let m = this.mechs.find((e) => e.id === id);
    if (!m) {
      m = makeMech(id, s.name ?? "Pilot", s.chassis, s.x, s.z, s.yaw, {
        team: s.team ?? 1,
      });
      this.mechs.push(m);
      this.remoteIds.add(id);
    }
    m.x = s.x;
    m.y = s.y;
    m.z = s.z;
    m.yaw = s.yaw;
    m.torso = s.torso;
    m.pitch = s.pitch;
    m.hp = s.hp;
    m.speed = s.speed;
    m.alive = s.hp > 0;
    if (s.fire) m.fireFlash = 0.14;
  }

  dropPeer(id: string) {
    this.mechs = this.mechs.filter((m) => m.id !== id);
    this.remoteIds.delete(id);
  }

  hud(): HudSnap {
    const m = this.local;
    const lockMech = m.lockId ? this.mechs.find((e) => e.id === m.lockId) : undefined;
    const fx = -Math.sin(m?.yaw ?? 0);
    const fz = -Math.cos(m?.yaw ?? 0);
    const rx = Math.cos(m?.yaw ?? 0);
    const rz = -Math.sin(m?.yaw ?? 0);
    const contacts = this.mechs
      .filter((e) => e.alive && e !== m)
      .slice(0, 10)
      .map((e) => {
        const dx = e.x - (m?.x ?? 0);
        const dz = e.z - (m?.z ?? 0);
        return {
          x: dx * rx + dz * rz,
          z: dx * fx + dz * fz,
          foe: e.team !== (m?.team ?? 0),
        };
      });
    return {
      hp: m?.hp ?? 0,
      maxHp: m?.maxHp ?? 1,
      armor: m?.armor ?? 0,
      maxArmor: m?.maxArmor ?? 1,
      heat: m?.heat ?? 0,
      heatCap: m?.heatCap ?? 1,
      boost: m?.boost ?? 0,
      jump: m?.jump ?? 0,
      speed: Math.abs(m?.speed ?? 0),
      yaw: m?.yaw ?? 0,
      chassis: m?.chassis ?? "titan",
      primary: m?.primary ?? "rotary",
      secondary: m?.secondary ?? "missiles",
      shield: m?.shield ?? 0,
      shieldUp: m?.shieldUp ?? false,
      special: m?.special ?? null,
      cdSpecial: m?.cdSpecial ?? 0,
      lock: m?.lock ?? 0,
      lockName: lockMech?.name ?? null,
      wave: this.wave,
      kills: m?.kills ?? 0,
      aliveEnemies: this.mechs.filter((e) => e.alive && !e.isLocal).length,
      overheat: (m?.heat ?? 0) >= (m?.heatCap ?? 1),
      toast: this.toast,
      mode: this.mode,
      alive: m?.alive ?? false,
      pickupName: this.pickupName,
      hitFlash: this.hitFlash,
      contacts,
      cdPrimary: m?.cdPrimary ?? 0,
      cdSecondary: m?.cdSecondary ?? 0,
    };
  }
}
