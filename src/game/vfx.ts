import * as THREE from "three";
import { MAP_SIZE } from "./city";
import type { MechRig } from "./mech-mesh";
import { makeExplosionSprite, makeFlareSprite, makeMuzzleSprite } from "./textures";
import type { Sim } from "./sim";

const _dir = new THREE.Vector3();
const _look = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _mid = new THREE.Vector3();

export class Vfx {
  private tracers: THREE.Line[] = [];
  private tracerGeo: THREE.BufferGeometry[] = [];
  private beams: THREE.Mesh[] = [];
  private projMeshes: THREE.Mesh[] = [];
  private lootMeshes: THREE.Mesh[] = [];
  private sparkPoints: THREE.Points;
  private sparkPos: Float32Array;
  private sparkCol: Float32Array;
  private explodeSprites: THREE.Sprite[] = [];
  private explodeLights: THREE.PointLight[] = [];
  private ash: THREE.Points;
  private ashPos: THREE.BufferAttribute;
  private missileMat: THREE.MeshStandardMaterial;
  private plasmaMat: THREE.MeshStandardMaterial;
  private cannonMat: THREE.MeshStandardMaterial;
  private flakMat: THREE.MeshStandardMaterial;
  private lootMat: THREE.MeshPhysicalMaterial;
  private tracerMats: Record<string, THREE.LineBasicMaterial>;
  private beamMats: Record<string, THREE.MeshBasicMaterial>;
  private explodeMat: THREE.SpriteMaterial;
  private beamGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
  private shotLights: THREE.PointLight[] = [];
  private projGeo = new THREE.CapsuleGeometry(0.12, 0.7, 4, 8).rotateX(Math.PI / 2);
  private missileGeo = new THREE.CapsuleGeometry(0.14, 1.15, 4, 8).rotateX(Math.PI / 2);
  private lootGeo = new THREE.OctahedronGeometry(0.55);
  private muzzles = new Map<string, { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3 }>();
  private coreMat: THREE.MeshStandardMaterial;
  trauma = 0;
  private cheap = false;

  constructor(
    private scene: THREE.Scene,
    quality?: { cheap?: boolean; software?: boolean },
  ) {
    this.cheap = !!(quality?.cheap || quality?.software);
    this.tracerMats = {
      bullet: new THREE.LineBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: 0.95 }),
      rail: new THREE.LineBasicMaterial({ color: 0x9ad8ff, transparent: true, opacity: 1 }),
      plasma: new THREE.LineBasicMaterial({ color: 0x7ae0ff, transparent: true, opacity: 0.95 }),
      blade: new THREE.LineBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.9 }),
    };
    this.beamMats = {
      bullet: new THREE.MeshBasicMaterial({
        color: 0xffe6b0,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      rail: new THREE.MeshBasicMaterial({
        color: 0x8fd4ff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      plasma: new THREE.MeshBasicMaterial({
        color: 0x66e7ff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      blade: new THREE.MeshBasicMaterial({
        color: 0xff9a4a,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    };
    this.missileMat = new THREE.MeshStandardMaterial({
      color: 0xd8c8b8,
      emissive: 0xd4654a,
      emissiveIntensity: 1.6,
      metalness: 0.5,
      roughness: 0.28,
    });
    this.plasmaMat = new THREE.MeshStandardMaterial({
      color: 0xc5d4e2,
      emissive: 0x8aa4bc,
      emissiveIntensity: 2.2,
      metalness: 0.2,
      roughness: 0.15,
    });
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0xff6644,
      emissive: 0xff2a18,
      emissiveIntensity: 2.8,
      metalness: 0.15,
      roughness: 0.12,
    });
    this.cannonMat = new THREE.MeshStandardMaterial({
      color: 0xe8ddd0,
      emissive: 0xc9a078,
      emissiveIntensity: 1.1,
      metalness: 0.6,
      roughness: 0.3,
    });
    this.flakMat = new THREE.MeshStandardMaterial({
      color: 0xf0e6d8,
      emissive: 0xd8c8a8,
      emissiveIntensity: 1.4,
      metalness: 0.3,
      roughness: 0.4,
    });
    this.lootMat = new THREE.MeshPhysicalMaterial({
      color: 0xd8dee6,
      emissive: 0x9aa7b8,
      emissiveIntensity: 1.4,
      metalness: 0.7,
      roughness: 0.18,
      clearcoat: 0.6,
    });
    this.explodeMat = new THREE.SpriteMaterial({
      map: makeExplosionSprite(),
      color: 0xffc080,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const maxSparks = 180;
    this.sparkPos = new Float32Array(maxSparks * 3);
    this.sparkCol = new Float32Array(maxSparks * 3);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(this.sparkPos, 3));
    sg.setAttribute("color", new THREE.BufferAttribute(this.sparkCol, 3));
    this.sparkPoints = new THREE.Points(
      sg,
      new THREE.PointsMaterial({
        size: 0.38,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        map: makeFlareSprite(),
      }),
    );
    scene.add(this.sparkPoints);

    const n = this.cheap ? 1 : 80;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * MAP_SIZE;
      pos[i * 3 + 1] = Math.random() * 32;
      pos[i * 3 + 2] = (Math.random() - 0.5) * MAP_SIZE;
      const ember = Math.random() > 0.72;
      col[i * 3] = ember ? 0.85 : 0.72;
      col[i * 3 + 1] = ember ? 0.45 : 0.68;
      col[i * 3 + 2] = ember ? 0.22 : 0.6;
    }
    const ag = new THREE.BufferGeometry();
    ag.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    ag.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.ash = new THREE.Points(
      ag,
      new THREE.PointsMaterial({
        size: 0.16,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        map: makeMuzzleSprite(),
      }),
    );
    this.ash.visible = n > 0;
    scene.add(this.ash);
    this.ashPos = ag.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xffc090, 0, 9, 2);
      scene.add(l);
      this.shotLights.push(l);
    }
  }

  captureMuzzles(rigs: Map<string, MechRig>) {
    for (const [id, rig] of rigs) {
      let slot = this.muzzles.get(id);
      if (!slot) {
        slot = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3() };
        this.muzzles.set(id, slot);
      }
      rig.muzzle.getWorldPosition(slot.a);
      rig.muzzle2.getWorldPosition(slot.b);
      if (rig.muzzleChest) rig.muzzleChest.getWorldPosition(slot.c);
      else slot.c.copy(slot.a);
    }
  }

  setCheap(on: boolean) {
    this.cheap = on;
    this.ash.visible = !on && this.ashPos.count > 0;
  }

  addTrauma(v: number) {
    this.trauma = Math.min(1, this.trauma + v);
  }

  private placeBeam(mesh: THREE.Mesh, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, radius: number) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dz = z1 - z0;
    const len = Math.max(0.08, Math.hypot(dx, dy, dz));
    _mid.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
    mesh.position.copy(_mid);
    _dir.set(dx / len, dy / len, dz / len);
    mesh.quaternion.setFromUnitVectors(_up, _dir);
    mesh.scale.set(radius, len, radius);
  }

  sync(sim: Sim, dt: number) {
    this.trauma = Math.max(0, this.trauma - dt * 1.8);

    while (this.tracers.length < sim.tracers.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(g, this.tracerMats.bullet);
      this.scene.add(line);
      this.tracers.push(line);
      this.tracerGeo.push(g);
      const beam = new THREE.Mesh(this.beamGeo, this.beamMats.bullet);
      beam.frustumCulled = false;
      this.scene.add(beam);
      this.beams.push(beam);
    }
    this.tracers.forEach((line, i) => {
      const t = sim.tracers[i];
      const beam = this.beams[i];
      if (!t) {
        line.visible = false;
        if (beam) beam.visible = false;
        return;
      }
      const muz = this.muzzles.get(t.owner);
      if (muz && t.life > t.maxLife * 0.55) {
        const src = t.alt ? muz.b : muz.a;
        const dx = t.x1 - t.x0;
        const dy = t.y1 - t.y0;
        const dz = t.z1 - t.z0;
        t.x0 = src.x;
        t.y0 = src.y;
        t.z0 = src.z;
        t.x1 = src.x + dx;
        t.y1 = src.y + dy;
        t.z1 = src.z + dz;
      }
      line.visible = true;
      line.material = this.tracerMats[t.kind] ?? this.tracerMats.bullet;
      const arr = this.tracerGeo[i].getAttribute("position") as THREE.BufferAttribute;
      arr.setXYZ(0, t.x0, t.y0, t.z0);
      arr.setXYZ(1, t.x1, t.y1, t.z1);
      arr.needsUpdate = true;
      const fade = Math.max(0.08, t.life / t.maxLife);
      (line.material as THREE.LineBasicMaterial).opacity = fade;
      if (beam) {
        beam.visible = true;
        beam.material = this.beamMats[t.kind] ?? this.beamMats.bullet;
        (beam.material as THREE.MeshBasicMaterial).opacity = fade * (t.kind === "rail" ? 1 : 0.75);
        const radius = t.kind === "rail" ? 0.22 : t.kind === "blade" ? 0.26 : t.kind === "plasma" ? 0.14 : 0.1;
        this.placeBeam(beam, t.x0, t.y0, t.z0, t.x1, t.y1, t.z1, radius);
      }
    });

    while (this.projMeshes.length < sim.projectiles.length) {
      const mesh = new THREE.Mesh(this.projGeo, this.cannonMat);
      this.scene.add(mesh);
      this.projMeshes.push(mesh);
    }
    this.projMeshes.forEach((mesh, i) => {
      const p = sim.projectiles[i];
      if (!p) {
        mesh.visible = false;
        return;
      }
      if (p.fresh) {
        const muz = this.muzzles.get(p.owner);
        if (muz) {
          const src = p.kind === "core" ? muz.c : p.kind === "missile" ? muz.b : muz.a;
          p.x = src.x;
          p.y = src.y;
          p.z = src.z;
        }
        p.fresh = false;
      }
      mesh.visible = true;
      mesh.position.set(p.x, p.y, p.z);
      mesh.geometry = p.kind === "missile" ? this.missileGeo : this.projGeo;
      mesh.material =
        p.kind === "missile"
          ? this.missileMat
          : p.kind === "core"
            ? this.coreMat
            : p.kind === "plasma"
              ? this.plasmaMat
              : p.kind === "flak"
                ? this.flakMat
                : this.cannonMat;
      _dir.set(p.vx, p.vy, p.vz);
      if (_dir.lengthSq() > 0.01) {
        _look.copy(mesh.position).add(_dir);
        mesh.lookAt(_look);
      }
    });

    while (this.lootMeshes.length < sim.loot.length) {
      const mesh = new THREE.Mesh(this.lootGeo, this.lootMat);
      this.scene.add(mesh);
      this.lootMeshes.push(mesh);
    }
    this.lootMeshes.forEach((mesh, i) => {
      const o = sim.loot[i];
      if (!o) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      mesh.position.set(o.x, o.y, o.z);
      mesh.rotation.y += dt * 1.8;
      const s = 0.9 + Math.sin(sim.time * 4 + o.id) * 0.12;
      mesh.scale.setScalar(s);
    });

    const n = Math.min(sim.sparks.length, this.sparkPos.length / 3);
    for (let i = 0; i < n; i++) {
      const s = sim.sparks[i];
      this.sparkPos[i * 3] = s.x;
      this.sparkPos[i * 3 + 1] = s.y;
      this.sparkPos[i * 3 + 2] = s.z;
      if (s.kind === "explode") {
        this.sparkCol[i * 3] = 1;
        this.sparkCol[i * 3 + 1] = 0.45;
        this.sparkCol[i * 3 + 2] = 0.18;
      } else if (s.kind === "boost") {
        this.sparkCol[i * 3] = 1;
        this.sparkCol[i * 3 + 1] = 0.55;
        this.sparkCol[i * 3 + 2] = 0.22;
      } else if (s.kind === "muzzle") {
        this.sparkCol[i * 3] = 1;
        this.sparkCol[i * 3 + 1] = 0.95;
        this.sparkCol[i * 3 + 2] = 0.55;
      } else if (s.kind === "ember") {
        this.sparkCol[i * 3] = 1;
        this.sparkCol[i * 3 + 1] = 0.72;
        this.sparkCol[i * 3 + 2] = 0.22;
      } else {
        this.sparkCol[i * 3] = 1;
        this.sparkCol[i * 3 + 1] = 0.85;
        this.sparkCol[i * 3 + 2] = 0.55;
      }
    }
    for (let i = n; i < this.sparkPos.length / 3; i++) {
      this.sparkPos[i * 3 + 1] = -20;
    }
    (this.sparkPoints.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.sparkPoints.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;

    const explodes = sim.sparks.filter((s) => s.kind === "explode");
    while (this.explodeSprites.length < Math.min(explodes.length, 24)) {
      const spr = new THREE.Sprite(this.explodeMat.clone());
      this.scene.add(spr);
      this.explodeSprites.push(spr);
      const l = new THREE.PointLight(0xff7a3a, 0, 14, 2);
      this.scene.add(l);
      this.explodeLights.push(l);
    }
    this.explodeSprites.forEach((spr, i) => {
      const s = explodes[i];
      const light = this.explodeLights[i];
      if (!s) {
        spr.visible = false;
        if (light) light.intensity = 0;
        return;
      }
      spr.visible = true;
      spr.position.set(s.x, s.y, s.z);
      const k = s.life / Math.max(0.01, s.maxLife);
      const sc = (1.1 - k) * 6.2 + 0.8;
      spr.scale.set(sc, sc, 1);
      spr.material.opacity = k;
      if (light) {
        light.position.copy(spr.position);
        light.intensity = k * 5.5;
      }
    });
    this.shotLights.forEach((l) => {
      l.intensity = 0;
    });
    sim.tracers.forEach((t, i) => {
      const light = this.shotLights[i];
      if (!light) return;
      if (t.life > t.maxLife * 0.45) {
        light.position.set(t.x0, t.y0, t.z0);
        light.intensity = t.kind === "rail" ? 16 : t.kind === "plasma" ? 12 : 10;
        light.color.setHex(t.kind === "rail" ? 0x9ad8ff : t.kind === "plasma" ? 0x66e7ff : 0xffc090);
      }
    });
    if (explodes.some((s) => s.life > s.maxLife * 0.7)) this.addTrauma(0.28);

    if (!this.cheap && this.ash.visible) {
      const arr = this.ashPos.array as Float32Array;
      for (let i = 0; i < this.ashPos.count; i++) {
        arr[i * 3 + 1] -= dt * (1.4 + (i % 5) * 0.3);
        arr[i * 3] += Math.sin(sim.time + i) * dt * 0.4;
        if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 30;
      }
      this.ashPos.needsUpdate = true;
      this.ash.rotation.y += dt * 0.015;
    }
  }

  shakeOffset(out: THREE.Vector3) {
    const s = this.trauma * this.trauma;
    out.set((Math.random() - 0.5) * s * 0.9, (Math.random() - 0.5) * s * 0.45, (Math.random() - 0.5) * s * 0.9);
  }
}