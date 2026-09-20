import * as THREE from "three";
import { CHASSIS, CHASSIS_LIST } from "./catalog";
import { input } from "./input";
import { buildMech, poseMech, type MechRig } from "./mech-mesh";
import { detectQuality, PostFx } from "./postfx";
import { Sim } from "./sim";
import { rayHitsBuilding } from "./city";
import type { ChassisId, ControlsProbe, GameMode, HudSnap, Loadout, ViewMode } from "./types";
import { Vfx } from "./vfx";
import { World } from "./world";

const STEP = 1 / 60;
const _shake = new THREE.Vector3();

export class Engine {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(58, 1, 0.12, 520);
  sim = new Sim();
  view: ViewMode = "title";
  hudListeners = new Set<(h: HudSnap) => void>();
  private acc = 0;
  private last = 0;
  private running = false;
  private rigs = new Map<string, MechRig>();
  private camDist = 16;
  private _desired = new THREE.Vector3();
  private _look = new THREE.Vector3();
  private disposed = false;
  private hangarIndex = 0;
  hangarWalk = false;
  private world: World;
  private vfx: Vfx;
  private post: PostFx;
  private quality = detectQuality();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.quality.mobile,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.78;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = true;

    this.world = new World(this.scene, this.renderer, this.sim.city, this.quality);
    this.vfx = new Vfx(this.scene);
    this.post = new PostFx(this.renderer, this.scene, this.camera, this.quality);

    this.resize();
    window.addEventListener("resize", this.resize);

    input.attach(canvas);
    this.syncRigs();
    this.camera.position.set(12, 6.5, 20);

    this.probe = {
      getYaw: () => this.sim.local?.yaw ?? 0,
      getSpeed: () => this.sim.local?.speed ?? 0,
      setSteer: (v) => {
        input.qaSteer = v;
      },
      setKeys: (codes) => {
        input.qaKeys = Array.isArray(codes)
          ? codes
          : Object.entries(codes as Record<string, boolean>)
              .filter(([, on]) => on)
              .map(([k]) => k);
        input.qaSteer = null;
      },
    };
    window.__controlsTest = this.probe;
  }

  probe: ControlsProbe;

  onHud(fn: (h: HudSnap) => void) {
    this.hudListeners.add(fn);
    return () => this.hudListeners.delete(fn);
  }

  setView(v: ViewMode) {
    this.view = v;
    this.world.setHangarMode(v === "hangar");
    this.camera.fov = v === "hangar" ? 40 : v === "title" ? 50 : 58;
    this.camera.updateProjectionMatrix();
    if (v === "title") {
      this.sim.resetDemo();
      this.syncRigs();
    }
    if (v === "hangar") {
      this.sim.setHangarChassis(this.sim.loadout.chassis);
      this.syncRigs();
    }
  }

  startSurvival(loadout: Loadout) {
    this.sim.startSurvival(loadout);
    this.sim.paused = false;
    this.view = "play";
    this.world.setHangarMode(false);
    this.camera.fov = 58;
    this.camera.updateProjectionMatrix();
    this.syncRigs();
    input.requestLock();
  }

  startMatch(mode: "ffa" | "tdm", loadout: Loadout, roster: { id: string; name: string; chassis: ChassisId; team: number }[]) {
    this.sim.startMatch(mode, loadout, roster);
    this.sim.paused = false;
    this.view = "play";
    this.world.setHangarMode(false);
    this.camera.fov = 58;
    this.camera.updateProjectionMatrix();
    this.syncRigs();
    input.requestLock();
  }

  setHangar(id: ChassisId) {
    this.hangarIndex = CHASSIS_LIST.findIndex((c) => c.id === id);
    this.sim.setHangarChassis(id);
    this.syncRigs();
  }

  applyLoadout(loadout: Loadout) {
    this.sim.loadout = loadout;
    const p = this.sim.local;
    if (!p) return;
    if (p.chassis !== loadout.chassis) this.sim.setHangarChassis(loadout.chassis);
    p.primary = loadout.primary;
    p.secondary = loadout.secondary;
    p.special = CHASSIS[p.chassis].special ?? null;
    this.sim.applyLoadoutStats(p);
    this.syncRigs();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.renderer.setAnimationLoop(this.loop);
  }

  private loop = (time: number) => {
    if (this.disposed) return;
    const raw = Math.min((time - this.last) / 1000, 0.1);
    this.last = time;
    this.acc += raw;
    const actions = input.getActions();
    while (this.acc >= STEP) {
      if (this.view === "play" || this.view === "title") this.sim.step(STEP, actions);
      this.acc -= STEP;
    }
    this.syncRigs();
    this.vfx.captureMuzzles(this.rigs);
    this.vfx.sync(this.sim, raw);
    const p = this.sim.local;
    this.world.update(raw, time, p?.x ?? 0, p?.z ?? 0);
    this.updateCamera(raw, time);
    this.post.render();
    if (this.view === "play") {
      const snap = this.sim.hud();
      for (const fn of this.hudListeners) fn(snap);
    }
  };

  private updateCamera(dt: number, time: number) {
    const p = this.sim.local;
    if (!p) return;
    if (this.view === "hangar") {
      const t = time / 1000;
      const hulking = p.chassis === "titan";
      // Stay inside the hangar bay (walls at ~13.4) so the orbit never clips.
      const dist = hulking ? 11.6 : 12.2;
      this.camera.position.set(Math.sin(t * 0.2) * dist, hulking ? 4.35 : 3.55, Math.cos(t * 0.2) * dist);
      this.camera.lookAt(p.x, hulking ? 1.9 : 1.55, p.z);
      p.x = 0;
      p.z = 0;
      p.yaw += dt * 0.18;
      return;
    }
    if (this.view === "title") {
      const t = time / 1000;
      this._desired.set(p.x + Math.sin(t * 0.13 + 0.8) * 9.6, 4.2, p.z + Math.cos(t * 0.13 + 0.8) * 9.6);
      this.camera.position.lerp(this._desired, 1 - Math.exp(-dt * 1.35));
      this._look.set(p.x, 2.45, p.z);
      this.camera.lookAt(this._look);
      return;
    }
    const look = p.yaw + p.torso;
    const fx = -Math.sin(look);
    const fz = -Math.cos(look);
    this.camDist = THREE.MathUtils.lerp(this.camDist, 12.4, 1 - Math.exp(-dt * 3));
    const wantX = p.x - fx * this.camDist;
    const wantZ = p.z - fz * this.camDist;
    const backX = wantX - p.x;
    const backZ = wantZ - p.z;
    const backLen = Math.hypot(backX, backZ) || 1;
    const blocked = rayHitsBuilding(p.x, p.z, backX / backLen, backZ / backLen, backLen, this.sim.city.buildings);
    const dist = Math.max(4.2, blocked - 1.1);
    this._desired.set(p.x + (backX / backLen) * dist, p.y + 5.6, p.z + (backZ / backLen) * dist);
    this.vfx.shakeOffset(_shake);
    this._desired.add(_shake);
    this.camera.position.lerp(this._desired, 1 - Math.exp(-dt * 6));
    this._look.set(p.x + fx * 8.5, p.y + 3.5 + p.pitch * -4, p.z + fz * 8.5);
    this.camera.lookAt(this._look);
  }

  private syncRigs() {
    const seen = new Set<string>();
    for (const m of this.sim.mechs) {
      seen.add(m.id);
      let rig = this.rigs.get(m.id);
      if (!rig || rig.chassis !== m.chassis || rig.primary !== m.primary || rig.secondary !== m.secondary) {
        if (rig) this.scene.remove(rig.root);
        rig = buildMech(
          m.chassis,
          !m.alive && m.hp <= 0 && !m.isLocal,
          this.quality.mobile,
          { primary: m.primary, secondary: m.secondary },
        );
        this.rigs.set(m.id, rig);
        this.scene.add(rig.root);
      }
      rig.root.visible = this.view !== "hangar" || m.isLocal;
      rig.root.position.set(m.x, m.y, m.z);
      rig.root.rotation.y = m.yaw;
      if (this.view === "hangar" && m.isLocal) {
        if (this.hangarWalk) {
          m.speed = 5.2;
          m.walk += 0.085;
        } else {
          m.speed = 0;
        }
      }
      poseMech(
        rig,
        m.walk,
        m.speed,
        m.torso,
        m.pitch,
        m.boost < 0.85 && Math.abs(m.speed) > 8,
        m.fireFlash,
        m.y > 0.4,
        m.altFlash,
        this.last / 1000,
        m.specialFlash,
        m.shieldUp,
        m.shield,
      );
      if (!m.alive) {
        rig.root.rotation.z = Math.min(1.1, (rig.root.rotation.z || 0) + 0.02);
      } else rig.root.rotation.z = 0;
    }
    for (const [id, rig] of this.rigs) {
      if (!seen.has(id)) {
        this.scene.remove(rig.root);
        this.rigs.delete(id);
      }
    }
  }

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.post.resize(w, h);
  };

  dispose() {
    this.disposed = true;
    this.running = false;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("resize", this.resize);
    input.detach();
    this.post.dispose();
    this.world.dispose();
    this.renderer.dispose();
  }
}

export type { GameMode };
