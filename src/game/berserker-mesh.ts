import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { makeBerserkerHullMap, makeMuzzleSprite } from "./textures";
import type { MechRig } from "./mech-mesh";
import type { WeaponId } from "./types";

const segs = 18;
const geo = {
  box: new RoundedBoxGeometry(1, 1, 1, 3, 0.08),
  soft: new RoundedBoxGeometry(1, 1, 1, 4, 0.16),
  hard: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, segs),
  cylR: new THREE.CylinderGeometry(0.5, 0.24, 1, segs),
  sphere: new THREE.SphereGeometry(0.5, 24, 18),
  hex: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  cone: new THREE.ConeGeometry(0.5, 1, 12),
  cap: new THREE.CapsuleGeometry(0.5, 1, 5, 12),
  disk: new THREE.CircleGeometry(0.5, 22),
  torus: new THREE.TorusGeometry(0.5, 0.08, 10, 20),
};

const hullMap = makeBerserkerHullMap();
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
  const glow = wrecked ? 0x3a1208 : 0xff6a18;
  const lam = (color: number, map?: THREE.Texture, emit = 0x000000, emitI = 0) =>
    new THREE.MeshLambertMaterial({
      color,
      map: map ?? undefined,
      emissive: emit,
      emissiveIntensity: emitI,
    });
  return {
    armor: lam(wrecked ? 0x4a3228 : 0xd46828, hullMap, wrecked ? 0x180c08 : 0x3a1608, wrecked ? 0.06 : 0.22),
    plate: lam(wrecked ? 0x3a2a22 : 0xb85018, hullMap, 0x2a1008, 0.16),
    dark: lam(0x1a1614, undefined, 0x0c0a08, 0.06),
    trim: lam(wrecked ? 0x3a3632 : 0x5a5450, undefined, 0x181614, 0.08),
    metal: lam(0x2c2a28, undefined, 0x10100e, 0.06),
    emit: new THREE.MeshStandardMaterial({
      color: glow,
      emissive: glow,
      emissiveIntensity: wrecked ? 0.28 : 4.6,
      metalness: 0.08,
      roughness: 0.18,
    }),
    visor: new THREE.MeshStandardMaterial({
      color: 0x1a0804,
      emissive: glow,
      emissiveIntensity: wrecked ? 0.2 : 3.8,
      metalness: 0.1,
      roughness: 0.12,
    }),
    blade: new THREE.MeshStandardMaterial({
      color: 0xffb060,
      emissive: glow,
      emissiveIntensity: wrecked ? 0.35 : 5.2,
      metalness: 0.05,
      roughness: 0.08,
      transparent: true,
      opacity: 0.88,
    }),
    glow,
  };
}

/**
 * Berserker-class close-combat — rust-orange hulking brawler matching the
 * reference: fused helmet-torso, twin visor slits, triple G-40 back tubes,
 * hydraulic arms, plasma-cutter fists, split-toe feet.
 */
export function buildBerserkerMech(
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
  hips.position.y = 2.22;
  body.add(hips);
  add(hips, geo.soft, m.dark, 1.42, 0.42, 0.98, 0, 0.06, 0);
  add(hips, geo.soft, m.armor, 1.62, 0.46, 1.12, 0, 0.28, 0.04);
  add(hips, geo.box, m.emit, 0.36, 0.03, 0.06, 0, 0.5, 0.58);

  const leftHip = new THREE.Group();
  leftHip.position.set(-0.72, 0.02, 0.04);
  hips.add(leftHip);
  const rightHip = new THREE.Group();
  rightHip.position.set(0.72, 0.02, 0.04);
  hips.add(rightHip);
  const L = buildLeg(leftHip, -1, m, detail);
  const R = buildLeg(rightHip, 1, m, detail);

  const torso = new THREE.Group();
  torso.position.set(0, 0.18, 0);
  hips.add(torso);
  buildTorso(torso, m, detail);

  const head = new THREE.Group();
  head.position.set(0, 1.82, 0.2);
  torso.add(head);

  const lShoulder = new THREE.Group();
  lShoulder.position.set(-1.28, 1.32, 0.08);
  torso.add(lShoulder);
  const rShoulder = new THREE.Group();
  rShoulder.position.set(1.28, 1.32, 0.08);
  torso.add(rShoulder);
  buildPauldron(lShoulder, -1, m, detail);
  buildPauldron(rShoulder, 1, m, detail);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.08, -0.2, 0.04);
  lShoulder.add(leftArm);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.08, -0.2, 0.04);
  rShoulder.add(rightArm);
  const leftFore = buildArm(leftArm, -1, m, detail);
  const rightFore = buildArm(rightArm, 1, m, detail);

  const flashes: THREE.Sprite[] = [];
  const muzzleLights: THREE.PointLight[] = [];
  const muzzle = new THREE.Object3D();
  const muzzle2 = new THREE.Object3D();
  const gauntlets: THREE.Mesh[] = [];
  const rightGun = attachFist(rightFore, 1, m, muzzle, flashes, wrecked ? [] : muzzleLights, gauntlets, detail);
  const leftGun = attachFist(leftFore, -1, m, muzzle2, flashes, wrecked ? [] : muzzleLights, gauntlets, detail);

  const backMuzzle = new THREE.Object3D();
  buildBackTubes(torso, m, backMuzzle, flashes, wrecked ? [] : muzzleLights, detail);

  const flamerMuzzle = new THREE.Object3D();
  buildFlamer(torso, m, flamerMuzzle, flashes, wrecked ? [] : muzzleLights, detail);

  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 22, 14),
    new THREE.MeshPhysicalMaterial({
      color: 0xff6a18,
      emissive: 0xff4a10,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.12,
      roughness: 0.14,
      metalness: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  shieldMesh.position.set(0, 1.4, 0.2);
  shieldMesh.visible = false;
  body.add(shieldMesh);

  const lights: THREE.PointLight[] = [];
  if (!wrecked) {
    const visor = new THREE.PointLight(m.glow, 2.8, 8);
    visor.position.set(0, 1.62, 0.85);
    torso.add(visor);
    lights.push(visor);
  }

  if (wrecked) {
    root.rotation.z = 0.5;
    leftArm.rotation.x = 0.65;
  }

  root.scale.setScalar(1.12);
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
    glow: [m.emit, m.blade, m.visor],
    chassis: "berserker",
    primary: weapons.primary,
    secondary: weapons.secondary,
    shieldMesh,
    gauntlets,
  };
}

type BerMats = ReturnType<typeof mats>;

function buildTorso(torso: THREE.Group, m: BerMats, detail: boolean) {
  add(torso, geo.soft, m.dark, 1.35, 1.62, 1.05, 0, 0.95, 0);
  add(torso, geo.sphere, m.armor, 1.95, 1.72, 1.62, 0, 1.18, 0.06);
  add(torso, geo.sphere, m.plate, 1.62, 1.28, 1.28, 0, 1.42, 0.14);
  add(torso, geo.soft, m.armor, 1.48, 0.72, 1.12, 0, 0.72, 0.12);
  add(torso, geo.soft, m.plate, 1.05, 0.4, 0.72, 0, 0.38, 0.08);
  // Twin orange visor slits.
  add(torso, geo.soft, m.dark, 0.82, 0.2, 0.16, 0, 1.58, 0.78);
  add(torso, geo.soft, m.visor, 0.22, 0.055, 0.08, -0.16, 1.58, 0.86);
  add(torso, geo.soft, m.visor, 0.22, 0.055, 0.08, 0.16, 1.58, 0.86);
  add(torso, geo.box, m.emit, 0.16, 0.018, 0.035, -0.16, 1.58, 0.9);
  add(torso, geo.box, m.emit, 0.16, 0.018, 0.035, 0.16, 1.58, 0.9);
  add(torso, geo.box, m.emit, 0.08, 0.08, 0.04, 0, 1.18, 0.82);
  if (detail) {
    add(torso, geo.soft, m.metal, 0.28, 0.9, 0.12, 0, 1.22, 0.72);
    add(torso, geo.box, m.emit, 0.04, 0.42, 0.03, 0, 1.22, 0.8);
    add(torso, geo.hex, m.trim, 0.16, 0.05, 0.16, -0.52, 1.48, 0.52, Math.PI / 2, 0, 0);
    add(torso, geo.hex, m.trim, 0.16, 0.05, 0.16, 0.52, 1.48, 0.52, Math.PI / 2, 0, 0);
    add(torso, geo.soft, m.dark, 0.36, 0.24, 0.2, 0, 0.48, 0.42);
  }
}

function buildPauldron(sh: THREE.Group, side: number, m: BerMats, detail: boolean) {
  add(sh, geo.soft, m.armor, 0.92, 0.58, 0.82, side * 0.18, 0.12, 0);
  add(sh, geo.soft, m.plate, 0.62, 0.32, 0.56, side * 0.22, 0.28, -0.02);
  add(sh, geo.soft, m.dark, 0.4, 0.22, 0.36, side * 0.2, 0.02, -0.04);
  add(sh, geo.cyl, m.metal, 0.22, 0.18, 0.22, side * 0.08, -0.18, 0.02);
  if (detail) {
    add(sh, geo.box, m.emit, 0.05, 0.05, 0.22, side * 0.28, 0.18, 0.28);
    add(sh, geo.hex, m.trim, 0.14, 0.04, 0.14, side * 0.32, 0.08, 0.22, Math.PI / 2, 0, 0);
  }
}

function buildArm(arm: THREE.Group, side: number, m: BerMats, detail: boolean) {
  add(arm, geo.soft, m.armor, 0.52, 0.92, 0.5, 0, -0.44, 0.02);
  add(arm, geo.soft, m.plate, 0.4, 0.38, 0.36, 0, -0.24, 0.1);
  add(arm, geo.cyl, m.metal, 0.28, 0.16, 0.28, 0, -0.88, 0.02);
  add(arm, geo.cyl, m.dark, 0.18, 0.42, 0.18, side * 0.16, -0.46, 0);
  if (detail) add(arm, geo.box, m.emit, 0.05, 0.22, 0.04, side * 0.18, -0.36, 0.18);
  const fore = new THREE.Group();
  fore.position.set(0, -0.98, 0.02);
  arm.add(fore);
  add(fore, geo.soft, m.armor, 0.48, 0.72, 0.46, 0, -0.32, 0.02);
  add(fore, geo.soft, m.plate, 0.36, 0.28, 0.32, 0, -0.18, 0.12);
  add(fore, geo.soft, m.dark, 0.32, 0.2, 0.3, 0, -0.62, 0.04);
  return fore;
}

function buildLeg(hip: THREE.Group, side: number, m: BerMats, detail: boolean) {
  add(hip, geo.soft, m.armor, 0.68, 1.12, 0.64, 0, -0.54, 0.04);
  add(hip, geo.soft, m.plate, 0.48, 0.46, 0.4, 0, -0.32, 0.22);
  add(hip, geo.soft, m.dark, 0.22, 0.62, 0.3, side * 0.24, -0.5, 0);
  add(hip, geo.box, m.emit, 0.08, 0.03, 0.04, 0, -0.28, 0.34);
  const knee = new THREE.Group();
  knee.position.set(0, -1.12, 0.04);
  hip.add(knee);
  add(knee, geo.soft, m.armor, 0.62, 0.38, 0.56, 0, 0.02, 0.12);
  add(knee, geo.soft, m.plate, 0.44, 0.22, 0.34, 0, 0.04, 0.3);
  add(knee, geo.soft, m.dark, 0.48, 1.12, 0.46, 0, -0.64, -0.02);
  add(knee, geo.soft, m.armor, 0.4, 0.78, 0.36, 0, -0.66, 0.14);
  add(knee, geo.box, m.emit, 0.08, 0.03, 0.04, 0, -0.4, 0.3);
  if (detail) add(knee, geo.hex, m.trim, 0.14, 0.04, 0.14, side * 0.16, -0.48, 0.18, Math.PI / 2, 0, 0);
  const foot = new THREE.Group();
  foot.position.set(0, -1.26, 0.02);
  knee.add(foot);
  add(foot, geo.soft, m.dark, 0.5, 0.16, 0.66, 0, 0.06, 0.08);
  add(foot, geo.soft, m.armor, 0.58, 0.14, 0.82, 0, 0.15, 0.16);
  add(foot, geo.soft, m.armor, 0.2, 0.12, 0.42, -0.16, 0.14, 0.58);
  add(foot, geo.soft, m.armor, 0.2, 0.12, 0.42, 0.16, 0.14, 0.58);
  add(foot, geo.box, m.emit, 0.08, 0.03, 0.04, 0, 0.22, 0.28);
  return { knee, foot };
}

function attachFist(
  fore: THREE.Group,
  side: number,
  m: BerMats,
  muzzle: THREE.Object3D,
  flashes: THREE.Sprite[],
  lights: THREE.PointLight[],
  gauntlets: THREE.Mesh[],
  detail: boolean,
) {
  const g = new THREE.Group();
  g.position.set(side * 0.04, -0.72, 0.08);
  fore.add(g);
  add(g, geo.soft, m.metal, 0.46, 0.42, 0.52, 0, 0.04, 0);
  add(g, geo.soft, m.armor, 0.52, 0.38, 0.58, 0, -0.02, 0.06);
  add(g, geo.sphere, m.dark, 0.28, 0.24, 0.28, 0, -0.12, 0.18);
  add(g, geo.cyl, m.emit, 0.1, 0.08, 0.1, 0, -0.14, 0.28, Math.PI / 2, 0, 0);
  // Plasma cutter / chain blade hanging down like the reference.
  add(g, geo.cone, m.blade, 0.22, 0.72, 0.1, 0, -0.52, 0.16, 0, 0, 0);
  add(g, geo.cone, m.emit, 0.08, 0.62, 0.04, 0, -0.48, 0.16);
  if (detail) {
    add(g, geo.box, m.emit, 0.04, 0.04, 0.04, -0.14, 0.08, 0.22);
    add(g, geo.box, m.emit, 0.04, 0.04, 0.04, 0.14, 0.08, 0.22);
  }
  const disc = add(g, geo.torus, m.blade, 0.42, 0.42, 0.42, 0, -0.02, 0.1, Math.PI / 2, 0, 0);
  disc.visible = false;
  gauntlets.push(disc);
  muzzle.position.set(0, -0.78, 0.16);
  g.add(muzzle);
  addFlash(g, muzzle, flashes, lights, m.glow);
  return g;
}

function buildBackTubes(
  torso: THREE.Group,
  m: BerMats,
  muzzle: THREE.Object3D,
  flashes: THREE.Sprite[],
  lights: THREE.PointLight[],
  detail: boolean,
) {
  const pack = new THREE.Group();
  pack.position.set(0, 1.62, -0.62);
  torso.add(pack);
  add(pack, geo.soft, m.dark, 0.72, 0.42, 0.36, 0, 0.08, 0);
  const tubes: [number, number, number][] = [
    [-0.42, 0.18, 0.06],
    [0, 0.42, 0.12],
    [0.42, 0.18, 0.06],
  ];
  for (const [x, y, z] of tubes) {
    add(pack, geo.cyl, m.metal, 0.28, 0.92, 0.28, x, y, z, 0.95, 0, x * 0.15);
    add(pack, geo.cyl, m.dark, 0.2, 0.22, 0.2, x, y + 0.42, z - 0.28, 0.95, 0, x * 0.15);
    add(pack, geo.cyl, m.emit, 0.12, 0.1, 0.12, x, y + 0.52, z - 0.36, 0.95, 0, x * 0.15);
    if (detail) add(pack, geo.cyl, m.trim, 0.3, 0.08, 0.3, x, y + 0.08, z - 0.04, 0.95, 0, x * 0.15);
  }
  muzzle.position.set(0, 0.92, -0.28);
  pack.add(muzzle);
  addFlash(pack, muzzle, flashes, lights, m.glow);
}

function buildFlamer(
  torso: THREE.Group,
  m: BerMats,
  muzzle: THREE.Object3D,
  flashes: THREE.Sprite[],
  lights: THREE.PointLight[],
  detail: boolean,
) {
  const g = new THREE.Group();
  g.position.set(0, 0.92, -0.88);
  torso.add(g);
  add(g, geo.soft, m.dark, 0.42, 0.36, 0.4, 0, 0.04, 0);
  add(g, geo.cylR, m.metal, 0.28, 0.48, 0.28, 0, 0.02, -0.22, Math.PI / 2, 0, 0);
  add(g, geo.cyl, m.emit, 0.12, 0.1, 0.12, 0, 0.02, -0.44, Math.PI / 2, 0, 0);
  if (detail) add(g, geo.box, m.emit, 0.04, 0.04, 0.08, 0, 0.16, -0.12);
  muzzle.position.set(0, 0.02, -0.52);
  g.add(muzzle);
  addFlash(g, muzzle, flashes, lights, m.glow);
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
      color: 0xff8a30,
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

export function poseBerserkerExtras(
  rig: MechRig,
  fire: number,
  special: number,
  alt: number,
  shieldUp: boolean,
  shield: number,
  time: number,
) {
  if (rig.shieldMesh) {
    const up = shieldUp && shield > 0.02;
    rig.shieldMesh.visible = up;
    const mat = rig.shieldMesh.material as THREE.MeshPhysicalMaterial;
    mat.opacity = 0.08 + shield * 0.16;
    mat.emissiveIntensity = 0.4 + shield * 1.1;
    const s = 1 + Math.sin(time * 8) * 0.018;
    rig.shieldMesh.scale.set(s * 0.92, s, s * 0.88);
  }
  for (const g of rig.gauntlets ?? []) {
    g.visible = shieldUp && shield > 0.02;
    const mat = g.material as THREE.MeshStandardMaterial;
    if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 3.2 + shield * 2.4 + Math.sin(time * 10) * 0.4;
  }
  if (rig.glow[1]) {
    rig.glow[1].emissiveIntensity = fire > 0.02 ? 6.4 : 4.6 + Math.sin(time * 3.4) * 0.35;
  }
  if (rig.glow[0]) {
    rig.glow[0].emissiveIntensity = fire > 0.02 || alt > 0.02 || special > 0.02 ? 5.8 : 4.2;
  }
}
