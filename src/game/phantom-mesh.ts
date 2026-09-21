import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { makeMuzzleSprite, makePhantomHullMap } from "./textures";
import type { MechRig } from "./mech-mesh";
import type { WeaponId } from "./types";

const segs = 18;
const geo = {
  box: new RoundedBoxGeometry(1, 1, 1, 3, 0.07),
  soft: new RoundedBoxGeometry(1, 1, 1, 4, 0.14),
  hard: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, segs),
  cylR: new THREE.CylinderGeometry(0.5, 0.22, 1, segs),
  sphere: new THREE.SphereGeometry(0.5, 22, 16),
  hex: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  torus: new THREE.TorusGeometry(0.5, 0.07, 10, 22),
  cone: new THREE.ConeGeometry(0.5, 1, 12),
  cap: new THREE.CapsuleGeometry(0.5, 1, 5, 12),
  disk: new THREE.CircleGeometry(0.5, 22),
};

const hullMap = makePhantomHullMap();
const muzzleTex = makeMuzzleSprite();

function add(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function mats(wrecked: boolean) {
  const glow = wrecked ? 0x102028 : 0x4ad4e8;
  const lam = (color: number, map?: THREE.Texture, emit = 0x000000, emitI = 0) =>
    new THREE.MeshLambertMaterial({
      color,
      map: map ?? undefined,
      emissive: emit,
      emissiveIntensity: emitI,
    });
  return {
    armor: lam(wrecked ? 0x3a3c40 : 0x6a727a, hullMap, wrecked ? 0x101214 : 0x1c2228, wrecked ? 0.05 : 0.18),
    plate: lam(wrecked ? 0x323438 : 0x5a626a, hullMap, 0x161c22, 0.14),
    dark: lam(0x2a2e32, undefined, 0x101214, 0.08),
    trim: lam(wrecked ? 0x3a3e42 : 0x8a9298, undefined, 0x1a2024, 0.1),
    emit: new THREE.MeshStandardMaterial({
      color: glow,
      emissive: glow,
      emissiveIntensity: wrecked ? 0.25 : 4.4,
      metalness: 0.08,
      roughness: 0.16,
    }),
    visor: new THREE.MeshStandardMaterial({
      color: 0x03080c,
      emissive: glow,
      emissiveIntensity: wrecked ? 0.18 : 3.6,
      metalness: 0.1,
      roughness: 0.12,
    }),
    glow,
  };
}

/**
 * Phantom-class stealth recon — headless faceted hunter matching the
 * reference: hex graphene hull, cyan slit visor, shoulder tube clusters,
 * long right rail, left EMP / drone pack.
 */
export function buildPhantomMech(
  wrecked: boolean,
  lowDetail: boolean,
  weapons: { primary: WeaponId; secondary: WeaponId },
): MechRig {
  const detail = !wrecked && !lowDetail;
  const m = mats(wrecked);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const hips = new THREE.Group();
  hips.position.y = 2.08;
  body.add(hips);
  add(hips, geo.soft, m.dark, 0.86, 0.32, 0.56, 0, 0.04, 0.02);
  add(hips, geo.soft, m.armor, 1.12, 0.3, 0.64, 0, 0.22, 0.06);
  add(hips, geo.hex, m.plate, 0.22, 0.06, 0.22, -0.32, 0.32, 0.22, Math.PI / 2, 0, 0);
  add(hips, geo.hex, m.plate, 0.22, 0.06, 0.22, 0.32, 0.32, 0.22, Math.PI / 2, 0, 0);
  add(hips, geo.box, m.emit, 0.12, 0.02, 0.04, 0, 0.34, 0.26);

  const leftHip = new THREE.Group();
  leftHip.position.set(-0.46, 0.02, 0.04);
  hips.add(leftHip);
  const rightHip = new THREE.Group();
  rightHip.position.set(0.46, 0.02, 0.04);
  hips.add(rightHip);
  const L = buildLeg(leftHip, -1, m, detail);
  const R = buildLeg(rightHip, 1, m, detail);

  const torso = new THREE.Group();
  torso.position.set(0, 0.18, 0);
  hips.add(torso);
  buildTorso(torso, m, detail);

  const head = new THREE.Group();
  head.position.set(0, 1.72, 0.18);
  torso.add(head);

  const lShoulder = new THREE.Group();
  lShoulder.position.set(-0.92, 1.42, 0.04);
  torso.add(lShoulder);
  const rShoulder = new THREE.Group();
  rShoulder.position.set(0.92, 1.42, 0.04);
  torso.add(rShoulder);
  buildShoulder(lShoulder, -1, m, detail);
  buildShoulder(rShoulder, 1, m, detail);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.08, -0.16, 0.04);
  lShoulder.add(leftArm);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.08, -0.16, 0.04);
  rShoulder.add(rightArm);
  const leftFore = buildArm(leftArm, -1, m, detail);
  const rightFore = buildArm(rightArm, 1, m, detail);

  const flashes: THREE.Sprite[] = [];
  const muzzleLights: THREE.PointLight[] = [];
  const muzzle = new THREE.Object3D();
  const muzzle2 = new THREE.Object3D();
  const rightGun = attachRail(rightFore, m, muzzle, flashes, wrecked ? [] : muzzleLights);
  const leftGun = attachEmp(leftFore, m, muzzle2, flashes, wrecked ? [] : muzzleLights, detail);

  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 20, 12),
    new THREE.MeshPhysicalMaterial({
      color: 0x4ad4e8,
      emissive: 0x2aa8c4,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.07,
      roughness: 0.08,
      metalness: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  shieldMesh.position.set(0, 1.3, 0);
  shieldMesh.visible = false;
  body.add(shieldMesh);

  const lights: THREE.PointLight[] = [];
  if (!wrecked) {
    const visor = new THREE.PointLight(m.glow, 3.4, 8);
    visor.position.set(0, 1.62, 0.72);
    torso.add(visor);
    lights.push(visor);
  }

  if (wrecked) {
    root.rotation.z = 0.55;
    leftArm.rotation.x = 0.7;
  }

  root.scale.setScalar(1.08);
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      (o as THREE.Mesh).castShadow = true;
      (o as THREE.Mesh).receiveShadow = true;
    }
  });

  return {
    root,
    body,
    torso,
    head,
    leftHip,
    rightHip,
    leftKnee: L.knee,
    rightKnee: R.knee,
    leftFoot: L.foot,
    rightFoot: R.foot,
    leftShoulder: lShoulder,
    rightShoulder: rShoulder,
    leftArm,
    rightArm,
    leftFore,
    rightFore,
    leftGun,
    rightGun,
    antenna: null,
    muzzle,
    muzzle2,
    muzzleLights,
    thrusters: [],
    flashes,
    lights,
    glow: [m.emit],
    chassis: "phantom",
    primary: weapons.primary,
    secondary: weapons.secondary,
    shieldMesh,
  };
}

type PhantomMats = ReturnType<typeof mats>;

function buildTorso(torso: THREE.Group, m: PhantomMats, detail: boolean) {
  // Fused faceted helmet-body — no neck, one graphene ovoid.
  add(torso, geo.soft, m.dark, 1.02, 1.55, 0.78, 0, 0.9, 0);
  add(torso, geo.sphere, m.plate, 1.58, 1.42, 1.28, 0, 1.22, 0.06);
  add(torso, geo.sphere, m.armor, 1.36, 1.02, 1.05, 0, 1.5, 0.12);
  add(torso, geo.soft, m.armor, 1.22, 0.64, 0.88, 0, 0.82, 0.12);
  add(torso, geo.soft, m.plate, 0.82, 0.36, 0.56, 0, 0.42, 0.08);
  // Hex graphene pecs and crown.
  add(torso, geo.hex, m.armor, 0.48, 0.07, 0.48, -0.3, 1.32, 0.44, Math.PI / 2, 0.18, 0.12);
  add(torso, geo.hex, m.armor, 0.48, 0.07, 0.48, 0.3, 1.32, 0.44, Math.PI / 2, -0.18, -0.12);
  add(torso, geo.hex, m.plate, 0.34, 0.06, 0.34, -0.22, 0.94, 0.46, Math.PI / 2, 0.08, 0.06);
  add(torso, geo.hex, m.plate, 0.34, 0.06, 0.34, 0.22, 0.94, 0.46, Math.PI / 2, -0.08, -0.06);
  add(torso, geo.hex, m.armor, 0.36, 0.06, 0.36, 0, 1.78, 0.22, Math.PI / 2, 0, 0);
  add(torso, geo.hex, m.plate, 0.22, 0.05, 0.22, 0, 1.86, 0.08, Math.PI / 2, 0, 0);
  // Thin cyan visor slit across the face.
  add(torso, geo.soft, m.dark, 0.86, 0.2, 0.18, 0, 1.58, 0.62);
  add(torso, geo.soft, m.visor, 0.72, 0.07, 0.1, 0, 1.58, 0.7);
  add(torso, geo.hard, m.dark, 0.52, 0.02, 0.06, 0, 1.58, 0.76);
  add(torso, geo.box, m.emit, 0.48, 0.018, 0.045, 0, 1.58, 0.78);
  add(torso, geo.box, m.emit, 0.08, 0.08, 0.04, 0, 1.18, 0.62);
  // Back chaff / flare pack.
  add(torso, geo.soft, m.dark, 0.42, 0.36, 0.22, 0, 1.18, -0.42);
  add(torso, geo.cyl, m.plate, 0.08, 0.22, 0.08, -0.1, 1.36, -0.48, 0.4, 0, 0);
  add(torso, geo.cyl, m.plate, 0.08, 0.22, 0.08, 0.1, 1.36, -0.48, 0.4, 0, 0);
  if (detail) {
    add(torso, geo.hex, m.trim, 0.14, 0.04, 0.14, -0.46, 1.54, 0.3, Math.PI / 2, 0, 0);
    add(torso, geo.hex, m.trim, 0.14, 0.04, 0.14, 0.46, 1.54, 0.3, Math.PI / 2, 0, 0);
    add(torso, geo.box, m.emit, 0.035, 0.035, 0.035, -0.38, 1.08, 0.48);
    add(torso, geo.box, m.emit, 0.035, 0.035, 0.035, 0.38, 1.08, 0.48);
    add(torso, geo.box, m.emit, 0.03, 0.03, 0.03, -0.1, 1.48, -0.52);
    add(torso, geo.box, m.emit, 0.03, 0.03, 0.03, 0.1, 1.48, -0.52);
    add(torso, geo.soft, m.dark, 0.26, 0.2, 0.16, 0, 0.5, 0.26);
  }
}

function buildShoulder(sh: THREE.Group, side: number, m: PhantomMats, detail: boolean) {
  add(sh, geo.soft, m.armor, 0.78, 0.44, 0.68, side * 0.18, 0.12, 0);
  add(sh, geo.soft, m.plate, 0.52, 0.24, 0.46, side * 0.22, 0.26, -0.02);
  add(sh, geo.soft, m.dark, 0.34, 0.18, 0.32, side * 0.22, 0.02, -0.06);
  // Triple tubes point up-back like the reference clusters.
  for (let i = 0; i < 3; i++) {
    const x = side * (0.08 + (i % 2) * 0.16);
    const z = -0.2 - Math.floor(i / 2) * 0.16;
    add(sh, geo.cyl, m.plate, 0.16, 0.88, 0.16, x, 0.55, z, 0.85, 0, side * 0.1);
    add(sh, geo.cyl, m.dark, 0.1, 0.22, 0.1, x, 0.9, z - 0.22, 0.85, 0, side * 0.1);
    if (detail) add(sh, geo.cyl, m.emit, 0.05, 0.08, 0.05, x, 1.0, z - 0.26, 0.85, 0, side * 0.1);
  }
  if (detail) {
    add(sh, geo.box, m.emit, 0.035, 0.035, 0.035, side * 0.24, 0.16, 0.22);
    add(sh, geo.hex, m.trim, 0.12, 0.04, 0.12, side * 0.28, 0.06, 0.16, Math.PI / 2, 0, 0);
  }
}

function buildArm(arm: THREE.Group, side: number, m: PhantomMats, detail: boolean) {
  add(arm, geo.soft, m.armor, 0.36, 0.78, 0.36, 0, -0.38, 0.02);
  add(arm, geo.soft, m.plate, 0.28, 0.34, 0.28, 0, -0.22, 0.1);
  add(arm, geo.cyl, m.dark, 0.26, 0.14, 0.26, 0, -0.76, 0.02);
  if (detail) add(arm, geo.box, m.emit, 0.05, 0.05, 0.05, side * 0.12, -0.3, 0.16);
  const fore = new THREE.Group();
  fore.position.set(0, -0.84, 0.02);
  arm.add(fore);
  add(fore, geo.soft, m.armor, 0.32, 0.64, 0.32, 0, -0.28, 0.02);
  add(fore, geo.soft, m.dark, 0.26, 0.22, 0.26, 0, -0.54, 0.04);
  add(fore, geo.soft, m.plate, 0.24, 0.26, 0.2, side * 0.08, -0.2, 0.12);
  return fore;
}

function buildLeg(hip: THREE.Group, side: number, m: PhantomMats, detail: boolean) {
  add(hip, geo.soft, m.armor, 0.56, 1.02, 0.52, 0, -0.5, 0.04);
  add(hip, geo.soft, m.plate, 0.4, 0.42, 0.32, 0, -0.3, 0.2);
  add(hip, geo.soft, m.dark, 0.2, 0.58, 0.28, side * 0.2, -0.48, 0);
  add(hip, geo.hex, m.plate, 0.24, 0.06, 0.24, 0, -0.22, 0.26, Math.PI / 2, 0, 0);
  add(hip, geo.box, m.emit, 0.08, 0.025, 0.04, 0, -0.24, 0.3);
  const knee = new THREE.Group();
  knee.position.set(0, -1.05, 0.04);
  hip.add(knee);
  add(knee, geo.soft, m.armor, 0.5, 0.32, 0.46, 0, 0.02, 0.12);
  add(knee, geo.soft, m.plate, 0.36, 0.2, 0.28, 0, 0.04, 0.28);
  add(knee, geo.cone, m.armor, 0.26, 0.2, 0.18, 0, 0.0, 0.36, Math.PI / 2, 0, 0);
  add(knee, geo.soft, m.dark, 0.4, 1.08, 0.38, 0, -0.62, -0.02);
  add(knee, geo.soft, m.armor, 0.34, 0.74, 0.3, 0, -0.64, 0.14);
  add(knee, geo.soft, m.plate, 0.24, 0.4, 0.2, 0, -0.74, 0.24);
  add(knee, geo.box, m.emit, 0.08, 0.025, 0.04, 0, -0.4, 0.28);
  if (detail) add(knee, geo.hex, m.trim, 0.14, 0.045, 0.14, side * 0.14, -0.46, 0.16, Math.PI / 2, 0, 0);
  const foot = new THREE.Group();
  foot.position.set(0, -1.22, 0.02);
  knee.add(foot);
  add(foot, geo.soft, m.dark, 0.42, 0.14, 0.58, 0, 0.06, 0.08);
  add(foot, geo.soft, m.armor, 0.5, 0.12, 0.7, 0, 0.14, 0.14);
  add(foot, geo.soft, m.armor, 0.18, 0.1, 0.38, -0.14, 0.13, 0.54);
  add(foot, geo.soft, m.armor, 0.18, 0.1, 0.38, 0.14, 0.13, 0.54);
  add(foot, geo.box, m.emit, 0.08, 0.025, 0.04, 0, 0.2, 0.26);
  return { knee, foot };
}

function attachRail(
  fore: THREE.Group,
  m: PhantomMats,
  muzzle: THREE.Object3D,
  flashes: THREE.Sprite[],
  lights: THREE.PointLight[],
) {
  const g = new THREE.Group();
  g.position.set(0.06, -0.52, 0.28);
  fore.add(g);
  add(g, geo.soft, m.dark, 0.32, 0.26, 0.48, 0, 0.04, 0);
  add(g, geo.soft, m.trim, 0.26, 0.2, 2.15, 0, 0.02, 1.05);
  add(g, geo.hard, m.dark, 0.16, 0.12, 1.92, 0, 0.02, 1.1);
  add(g, geo.cyl, m.plate, 0.14, 0.28, 0.14, 0, 0.02, 0.24, Math.PI / 2, 0, 0);
  add(g, geo.box, m.emit, 0.05, 0.05, 1.55, 0, 0.14, 1.1);
  add(g, geo.cyl, m.emit, 0.07, 0.1, 0.07, 0, 0.02, 2.14, Math.PI / 2, 0, 0);
  muzzle.position.set(0, 0.02, 2.26);
  g.add(muzzle);
  addFlash(g, muzzle, flashes, lights, m.glow);
  return g;
}

function attachEmp(
  fore: THREE.Group,
  m: PhantomMats,
  muzzle: THREE.Object3D,
  flashes: THREE.Sprite[],
  lights: THREE.PointLight[],
  detail: boolean,
) {
  const g = new THREE.Group();
  g.position.set(-0.06, -0.52, 0.24);
  fore.add(g);
  add(g, geo.soft, m.dark, 0.34, 0.28, 0.4, 0, 0.04, 0);
  add(g, geo.cyl, m.armor, 0.28, 0.52, 0.28, 0, 0.02, 0.32, Math.PI / 2, 0, 0);
  add(g, geo.cyl, m.dark, 0.2, 0.26, 0.2, 0, 0.02, 0.5, Math.PI / 2, 0, 0);
  add(g, geo.disk, m.emit, 0.22, 0.22, 0.22, 0, 0.02, 0.64);
  add(g, geo.cyl, m.emit, 0.09, 0.1, 0.09, 0, 0.02, 0.66, Math.PI / 2, 0, 0);
  // Small drone cells under the emitter.
  add(g, geo.hard, m.dark, 0.22, 0.12, 0.28, 0, -0.1, 0.08);
  for (const z of [-0.06, 0.08]) {
    add(g, geo.cyl, m.plate, 0.07, 0.16, 0.07, 0, -0.16, z, Math.PI / 2, 0, 0);
    if (detail) add(g, geo.cyl, m.emit, 0.03, 0.04, 0.03, 0, -0.16, z + 0.08, Math.PI / 2, 0, 0);
  }
  muzzle.position.set(0, 0.02, 0.64);
  g.add(muzzle);
  addFlash(g, muzzle, flashes, lights, m.glow);
  return g;
}

function addFlash(
  g: THREE.Group,
  muzzle: THREE.Object3D,
  flashes: THREE.Sprite[],
  lights: THREE.PointLight[],
  glow: number,
) {
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: muzzleTex,
      color: 0x88f0ff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  spr.position.copy(muzzle.position);
  spr.visible = false;
  g.add(spr);
  flashes.push(spr);
  if (lights) {
    const light = new THREE.PointLight(glow, 0, 6);
    light.position.copy(muzzle.position);
    g.add(light);
    lights.push(light);
  }
}

export function posePhantomExtras(
  rig: MechRig,
  fire: number,
  special: number,
  alt: number,
  shieldUp: boolean,
  shield: number,
  time: number,
) {
  if (rig.shieldMesh) {
    const cloaked = shieldUp && shield > 0.02;
    rig.shieldMesh.visible = cloaked;
    const mat = rig.shieldMesh.material as THREE.MeshPhysicalMaterial;
    mat.opacity = 0.04 + shield * 0.1;
    mat.emissiveIntensity = 0.25 + shield * 0.7;
    const s = 1 + Math.sin(time * 9) * 0.015;
    rig.shieldMesh.scale.set(s, s * 0.92, s);
    rig.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh === rig.shieldMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const raw of mats) {
        const mm = raw as THREE.MeshLambertMaterial;
        if (!("opacity" in mm)) continue;
        mm.transparent = cloaked;
        mm.opacity = cloaked ? 0.2 : 1;
        mm.depthWrite = !cloaked;
      }
    });
  }
  if (rig.glow[0]) {
    rig.glow[0].emissiveIntensity = fire > 0.02 || alt > 0.02 || special > 0.02 ? 5.4 : 3.4 + Math.sin(time * 3.2) * 0.3;
  }
}
