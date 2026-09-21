import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { makeMuzzleSprite, makeValkyrieHullMap } from "./textures";
import type { MechRig } from "./mech-mesh";
import type { WeaponId } from "./types";

const segs = 20;
const geo = {
  box: new RoundedBoxGeometry(1, 1, 1, 3, 0.07),
  soft: new RoundedBoxGeometry(1, 1, 1, 4, 0.13),
  hard: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, segs),
  cylR: new THREE.CylinderGeometry(0.5, 0.2, 1, segs),
  sphere: new THREE.SphereGeometry(0.5, 22, 16),
  torus: new THREE.TorusGeometry(0.5, 0.07, 12, 28),
  torusFat: new THREE.TorusGeometry(0.5, 0.1, 12, 24),
  cone: new THREE.ConeGeometry(0.5, 1, 14),
  cap: new THREE.CapsuleGeometry(0.5, 1, 5, 14),
  disk: new THREE.CircleGeometry(0.5, 28),
  oct: new THREE.OctahedronGeometry(0.5, 0),
  helm: new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0, 0.22),
      new THREE.Vector2(0.08, 0.2),
      new THREE.Vector2(0.18, 0.12),
      new THREE.Vector2(0.22, 0.0),
      new THREE.Vector2(0.18, -0.1),
      new THREE.Vector2(0.1, -0.18),
      new THREE.Vector2(0.0, -0.22),
    ],
    18,
  ),
  binder: makeBinderGeo(),
  fin: makeFinGeo(),
};

function makeBinderGeo() {
  const s = new THREE.Shape();
  s.moveTo(0.0, 0.08);
  s.lineTo(0.18, 0.46);
  s.lineTo(1.15, 0.36);
  s.lineTo(2.15, 0.12);
  s.lineTo(2.58, 0.02);
  s.lineTo(2.7, -0.02);
  s.lineTo(2.25, -0.2);
  s.lineTo(1.05, -0.32);
  s.lineTo(0.2, -0.24);
  s.lineTo(0.0, -0.06);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 1,
  });
  g.center();
  g.computeVertexNormals();
  return g;
}

function makeFinGeo() {
  const s = new THREE.Shape();
  s.moveTo(0.02, 0.0);
  s.lineTo(0.07, 0.12);
  s.lineTo(0.045, 0.52);
  s.lineTo(0.0, 0.66);
  s.lineTo(-0.1, 0.46);
  s.lineTo(-0.07, 0.1);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.034,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 1,
  });
  g.center();
  g.computeVertexNormals();
  return g;
}

const hullMap = makeValkyrieHullMap();
const muzzleTex = makeMuzzleSprite();

// Mild yaw keeps both tips outside the torso in the hangar 3/4.
const WING_REST = { x: -0.1, y: 0.3, z: 0.48 };

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
  const glow = wrecked ? 0x102030 : 0x3aa8ff;
  const lam = (color: number, map?: THREE.Texture, emit = 0x000000, emitI = 0) =>
    new THREE.MeshLambertMaterial({
      color,
      map: map ?? undefined,
      emissive: emit,
      emissiveIntensity: emitI,
    });
  return {
    armor: lam(wrecked ? 0x6a6e74 : 0xf6f8fb, hullMap, wrecked ? 0x101214 : 0x202830, wrecked ? 0.04 : 0.08),
    white: lam(wrecked ? 0x5a5e64 : 0xeef2f6, undefined, 0x1a2028, 0.08),
    navy: lam(wrecked ? 0x22262c : 0x0b1628, undefined, 0x081018, 0.14),
    navySoft: lam(wrecked ? 0x2a3038 : 0x16304c, undefined, 0x0a1828, 0.12),
    gold: lam(wrecked ? 0x4a4434 : 0xd8c078, undefined, 0x4a3814, 0.32),
    dark: lam(0x0c1016, undefined, 0x05070a, 0.05),
    plate: lam(wrecked ? 0x3a3e44 : 0xd4dce4, undefined, 0x1a2028, 0.08),
    emit: new THREE.MeshStandardMaterial({
      color: glow,
      emissive: glow,
      emissiveIntensity: wrecked ? 0.3 : 4.8,
      metalness: 0.08,
      roughness: 0.16,
    }),
    visor: new THREE.MeshStandardMaterial({
      color: 0x030c14,
      emissive: glow,
      emissiveIntensity: wrecked ? 0.2 : 3.8,
      metalness: 0.12,
      roughness: 0.12,
    }),
    glow,
  };
}

/**
 * Valkyrie-class aerial interceptor — white/navy Freedom-style fighter
 * matching the reference: bulky V-chest, pointed helm, twin pack rings, swept binders.
 */
export function buildValkyrieMech(
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
  hips.position.y = 2.12;
  body.add(hips);
  add(hips, geo.soft, m.navy, 0.9, 0.32, 0.52, 0, 0.04, 0.02);
  add(hips, geo.soft, m.armor, 1.32, 0.28, 0.64, 0, 0.26, 0.08);
  add(hips, geo.soft, m.white, 0.56, 0.26, 0.38, -0.64, 0.18, 0.1, 0, 0.16, 0.16);
  add(hips, geo.soft, m.white, 0.56, 0.26, 0.38, 0.64, 0.18, 0.1, 0, -0.16, -0.16);
  add(hips, geo.soft, m.navySoft, 0.38, 0.2, 0.3, -0.7, 0.08, 0.02);
  add(hips, geo.soft, m.navySoft, 0.38, 0.2, 0.3, 0.7, 0.08, 0.02);
  add(hips, geo.box, m.gold, 0.18, 0.035, 0.36, 0, 0.38, 0.28);

  const leftHip = new THREE.Group();
  leftHip.position.set(-0.5, 0.02, 0.04);
  hips.add(leftHip);
  const rightHip = new THREE.Group();
  rightHip.position.set(0.5, 0.02, 0.04);
  hips.add(rightHip);
  const L = buildLeg(leftHip, -1, m, detail);
  const R = buildLeg(rightHip, 1, m, detail);

  const torso = new THREE.Group();
  torso.position.set(0, 0.2, 0);
  hips.add(torso);
  buildChest(torso, m, detail);

  const chin = new THREE.Group();
  chin.position.set(0, 0.34, 0.62);
  torso.add(chin);
  const muzzleChest = buildChinGatling(chin, m, detail);

  const head = new THREE.Group();
  head.position.set(0, 1.96, 0.46);
  torso.add(head);
  const antenna = buildHead(head, m, detail);

  const pack = new THREE.Group();
  pack.position.set(0, 1.42, -0.58);
  torso.add(pack);
  const { wings, thrusters } = buildBackpack(pack, m, detail);

  const lShoulder = new THREE.Group();
  lShoulder.position.set(-0.92, 1.56, 0.06);
  torso.add(lShoulder);
  const rShoulder = new THREE.Group();
  rShoulder.position.set(0.92, 1.56, 0.06);
  torso.add(rShoulder);
  const pdL = buildPauldron(lShoulder, -1, m, detail);
  const pdR = buildPauldron(rShoulder, 1, m, detail);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.1, -0.18, 0.04);
  lShoulder.add(leftArm);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.1, -0.18, 0.04);
  rShoulder.add(rightArm);
  const leftFore = buildArm(leftArm, -1, m, detail);
  const rightFore = buildArm(rightArm, 1, m, detail);

  const flashes: THREE.Sprite[] = [];
  const muzzleLights: THREE.PointLight[] = [];
  const muzzle = new THREE.Object3D();
  const muzzle2 = new THREE.Object3D();
  const rightGun = attachRotary(rightFore, 1, m, muzzle, flashes, wrecked ? [] : muzzleLights);
  const leftGun = attachPulse(leftFore, -1, m, muzzle2, flashes, wrecked ? [] : muzzleLights);

  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.9, 22, 14),
    new THREE.MeshPhysicalMaterial({
      color: 0x66d4ff,
      emissive: 0x3aa8ff,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.12,
      roughness: 0.1,
      metalness: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  shieldMesh.position.set(0, 1.4, 0);
  shieldMesh.visible = false;
  body.add(shieldMesh);

  const lights: THREE.PointLight[] = [];
  if (!wrecked) {
    const visor = new THREE.PointLight(m.glow, 2.8, 8);
    visor.position.set(0, 1.88, 0.62);
    torso.add(visor);
    lights.push(visor);
    const ring = new THREE.PointLight(m.glow, 2.6, 9);
    ring.position.set(0, 2.12, 0.02);
    torso.add(ring);
    lights.push(ring);
  }

  const chinFlash = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: muzzleTex,
      color: 0x88e0ff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  chinFlash.position.copy(muzzleChest.position);
  chinFlash.visible = false;
  chin.add(chinFlash);
  flashes.push(chinFlash);

  if (wrecked) {
    root.rotation.z = 0.55;
    leftArm.rotation.x = 0.7;
    wings[0].rotation.z = -0.2;
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
    antenna,
    muzzle,
    muzzle2,
    muzzleLights,
    thrusters,
    flashes,
    lights,
    glow: [m.emit],
    chassis: "valkyrie",
    primary: weapons.primary,
    secondary: weapons.secondary,
    shieldMesh,
    muzzleChest,
    barrels: rightGun.userData.barrels as THREE.Object3D[],
    wings,
    pdTurrets: [pdL, pdR],
  };
}

type ValkMats = ReturnType<typeof mats>;

function buildChest(torso: THREE.Group, m: ValkMats, detail: boolean) {
  add(torso, geo.soft, m.navy, 0.88, 1.48, 0.56, 0, 0.96, -0.06);
  add(torso, geo.soft, m.navySoft, 0.7, 0.82, 0.36, 0, 1.22, 0.14);
  // Collar.
  add(torso, geo.soft, m.armor, 1.22, 0.32, 0.68, 0, 1.68, 0.12);
  add(torso, geo.soft, m.white, 0.86, 0.16, 0.42, 0, 1.8, 0.2, 0.22, 0, 0);
  // Layered V pecs — this is the chest from the reference.
  add(torso, geo.soft, m.armor, 0.78, 0.8, 0.52, -0.46, 1.34, 0.32, 0.22, 0.46, 0.26);
  add(torso, geo.soft, m.armor, 0.78, 0.8, 0.52, 0.46, 1.34, 0.32, 0.22, -0.46, -0.26);
  add(torso, geo.soft, m.white, 0.56, 0.48, 0.34, -0.4, 1.4, 0.52, 0.28, 0.34, 0.16);
  add(torso, geo.soft, m.white, 0.56, 0.48, 0.34, 0.4, 1.4, 0.52, 0.28, -0.34, -0.16);
  add(torso, geo.soft, m.plate, 0.42, 0.3, 0.22, -0.42, 1.16, 0.44, 0.14, 0.24, 0.1);
  add(torso, geo.soft, m.plate, 0.42, 0.3, 0.22, 0.42, 1.16, 0.44, 0.14, -0.24, -0.1);
  add(torso, geo.soft, m.armor, 0.44, 0.52, 0.28, -0.66, 1.44, 0.1, 0.08, 0.22, 0.2);
  add(torso, geo.soft, m.armor, 0.44, 0.52, 0.28, 0.66, 1.44, 0.1, 0.08, -0.22, -0.2);
  add(torso, geo.soft, m.navy, 0.2, 0.7, 0.3, -0.72, 1.2, 0.08);
  add(torso, geo.soft, m.navy, 0.2, 0.7, 0.3, 0.72, 1.2, 0.08);
  // Center keel + gold V — wide navy gap so pecs read as a split.
  add(torso, geo.soft, m.navy, 0.4, 1.08, 0.26, 0, 1.16, 0.48);
  add(torso, geo.box, m.gold, 0.055, 0.98, 0.045, -0.14, 1.14, 0.62, 0, 0, 0.4);
  add(torso, geo.box, m.gold, 0.055, 0.98, 0.045, 0.14, 1.14, 0.62, 0, 0, -0.4);
  add(torso, geo.soft, m.visor, 0.24, 0.13, 0.1, 0, 1.04, 0.56);
  add(torso, geo.box, m.emit, 0.18, 0.045, 0.06, 0, 1.04, 0.62);
  add(torso, geo.oct, m.emit, 0.11, 0.11, 0.09, 0, 1.3, 0.56);
  // Abs + waist.
  add(torso, geo.soft, m.armor, 0.82, 0.48, 0.54, 0, 0.66, 0.14);
  add(torso, geo.soft, m.navy, 0.4, 0.3, 0.24, 0, 0.62, 0.34);
  add(torso, geo.soft, m.plate, 0.26, 0.18, 0.14, -0.24, 0.7, 0.36);
  add(torso, geo.soft, m.plate, 0.26, 0.18, 0.14, 0.24, 0.7, 0.36);
  add(torso, geo.soft, m.navy, 0.58, 0.22, 0.34, 0, 0.36, 0.06);
  add(torso, geo.soft, m.white, 0.2, 0.24, 0.16, -0.34, 0.76, 0.32);
  add(torso, geo.soft, m.white, 0.2, 0.24, 0.16, 0.34, 0.76, 0.32);
  if (detail) {
    add(torso, geo.box, m.gold, 0.035, 0.38, 0.16, -0.7, 1.34, 0.18);
    add(torso, geo.box, m.gold, 0.035, 0.38, 0.16, 0.7, 1.34, 0.18);
    add(torso, geo.soft, m.white, 0.2, 0.14, 0.12, -0.18, 0.9, 0.46);
    add(torso, geo.soft, m.white, 0.2, 0.14, 0.12, 0.18, 0.9, 0.46);
    add(torso, geo.box, m.gold, 0.03, 0.24, 0.08, -0.38, 0.74, 0.34);
    add(torso, geo.box, m.gold, 0.03, 0.24, 0.08, 0.38, 0.74, 0.34);
    add(torso, geo.box, m.emit, 0.05, 0.05, 0.05, -0.52, 1.54, 0.26);
    add(torso, geo.box, m.emit, 0.05, 0.05, 0.05, 0.52, 1.54, 0.26);
  }
}

function buildHead(head: THREE.Group, m: ValkMats, detail: boolean) {
  add(head, geo.helm, m.armor, 1.45, 1.32, 2.05, 0, 0.14, 0.12);
  add(head, geo.soft, m.white, 0.46, 0.24, 0.46, 0, 0.3, 0.14, 0.32, 0, 0);
  add(head, geo.cone, m.armor, 0.46, 0.62, 0.5, 0, 0.04, 0.54, Math.PI / 2, 0, 0);
  add(head, geo.soft, m.navy, 0.44, 0.24, 0.36, 0, -0.02, 0.18);
  add(head, geo.cone, m.navy, 0.24, 0.3, 0.22, 0, -0.04, 0.46, Math.PI / 2, 0, 0);
  add(head, geo.soft, m.visor, 0.4, 0.08, 0.26, 0, 0.1, 0.5);
  add(head, geo.hard, m.dark, 0.3, 0.026, 0.18, 0, 0.1, 0.6);
  add(head, geo.box, m.emit, 0.22, 0.022, 0.06, 0, 0.1, 0.62);
  add(head, geo.box, m.gold, 0.34, 0.016, 0.05, 0, 0.16, 0.5);
  add(head, geo.box, m.gold, 0.34, 0.016, 0.05, 0, 0.04, 0.5);
  add(head, geo.box, m.gold, 0.02, 0.12, 0.08, -0.12, 0.1, 0.52, 0, 0, 0.35);
  add(head, geo.box, m.gold, 0.02, 0.12, 0.08, 0.12, 0.1, 0.52, 0, 0, -0.35);
  const fin = add(head, geo.fin, m.armor, 1.35, 1.35, 1.35, 0, 0.54, -0.02, 0.6, 0, 0);
  add(head, geo.fin, m.navy, 0.85, 0.98, 0.8, 0, 0.5, -0.04, 0.6, 0, 0);
  add(head, geo.box, m.gold, 0.018, 0.38, 0.035, 0, 0.46, 0.12, 0.6, 0, 0);
  if (detail) {
    add(head, geo.box, m.gold, 0.024, 0.12, 0.08, -0.16, 0.18, 0.18);
    add(head, geo.box, m.gold, 0.024, 0.12, 0.08, 0.16, 0.18, 0.18);
    add(head, geo.soft, m.plate, 0.12, 0.08, 0.12, -0.15, 0.16, 0.26);
    add(head, geo.soft, m.plate, 0.12, 0.08, 0.12, 0.15, 0.16, 0.26);
    add(head, geo.soft, m.navySoft, 0.1, 0.07, 0.12, -0.14, 0.02, 0.24);
    add(head, geo.soft, m.navySoft, 0.1, 0.07, 0.12, 0.14, 0.02, 0.24);
  }
  return fin;
}

function buildBackpack(pack: THREE.Group, m: ValkMats, detail: boolean) {
  add(pack, geo.soft, m.navy, 0.86, 0.78, 0.56, 0, 0.14, -0.08);
  add(pack, geo.soft, m.armor, 0.64, 0.46, 0.34, 0, 0.26, 0.06);
  add(pack, geo.soft, m.white, 0.38, 0.22, 0.18, 0, 0.44, 0.12);
  const thrusters: THREE.Mesh[] = [];
  const wings: THREE.Group[] = [];

  for (const side of [-1, 1] as const) {
    const pod = new THREE.Group();
    pod.position.set(side * 0.72, 0.86, 0.2);
    pack.add(pod);
    add(pod, geo.cyl, m.armor, 0.72, 0.24, 0.72, 0, 0, 0, Math.PI / 2, 0, 0);
    add(pod, geo.cyl, m.navy, 0.58, 0.12, 0.58, 0, 0, 0.08, Math.PI / 2, 0, 0);
    add(pod, geo.torusFat, m.white, 0.66, 0.66, 0.66, 0, 0, 0.08);
    add(pod, geo.torus, m.gold, 0.64, 0.64, 0.64, 0, 0, 0.12);
    add(pod, geo.disk, m.emit, 0.48, 0.48, 0.48, 0, 0, 0.16);
    add(pod, geo.disk, m.dark, 0.16, 0.16, 0.16, 0, 0, 0.175);
    add(pod, geo.cyl, m.emit, 0.11, 0.07, 0.11, 0, 0, 0.2, Math.PI / 2, 0, 0);
    const bell = add(pod, geo.cylR, m.emit, 0.3, 0.36, 0.3, 0, 0, -0.28, Math.PI / 2, 0, 0);
    thrusters.push(bell);
    add(pod, geo.box, m.emit, 0.055, 0.055, 0.055, side * 0.28, 0.2, 0.14);
    add(pod, geo.box, m.emit, 0.04, 0.04, 0.04, side * -0.18, 0.22, 0.1);
    if (detail) {
      add(pod, geo.box, m.gold, 0.035, 0.16, 0.1, side * 0.26, 0.16, 0);
      add(pod, geo.soft, m.white, 0.16, 0.12, 0.2, side * 0.28, -0.18, 0.02);
    }

    // Binders rise beside the shoulders so both tips clear the torso.
    const wing = new THREE.Group();
    wing.position.set(side * 0.58, 0.28, -0.2);
    wing.rotation.set(WING_REST.x, side * WING_REST.y, side * WING_REST.z);
    wing.userData.restX = WING_REST.x;
    wing.userData.restY = side * WING_REST.y;
    wing.userData.restZ = side * WING_REST.z;
    pack.add(wing);
    add(wing, geo.binder, m.armor, side, 1, 1, side * 1.32, 0.42, 0);
    add(wing, geo.binder, m.navy, side * 0.94, 0.88, 0.65, side * 1.3, 0.36, -0.06);
    add(wing, geo.binder, m.white, side * 0.52, 0.58, 1.05, side * 0.68, 0.48, 0.03);
    add(wing, geo.soft, m.navySoft, 0.4, 0.3, 0.1, side * 0.3, 0.22, 0.03);
    add(wing, geo.box, m.gold, 0.03, 0.03, 1.55, side * 1.2, 0.62, 0.05);
    add(wing, geo.box, m.emit, 0.08, 0.08, 0.08, side * 0.55, 0.58, 0.07);
    add(wing, geo.box, m.emit, 0.055, 0.055, 0.055, side * 1.75, 0.4, 0.04);
    if (detail) {
      add(wing, geo.box, m.gold, 0.022, 0.022, 0.9, side * 0.75, 0.68, 0.05);
      add(wing, geo.soft, m.plate, 0.4, 0.2, 0.08, side * 0.82, 0.5, 0.04);
    }
    const rack = new THREE.Group();
    rack.position.set(side * 0.7, -0.1, 0.12);
    wing.add(rack);
    add(rack, geo.hard, m.dark, 0.28, 0.12, 0.64, 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      add(rack, geo.cyl, m.navy, 0.07, 0.46, 0.07, 0, -0.02, -0.18 + i * 0.18, 0, 0, Math.PI / 2);
    }
    const pulse = add(wing, geo.cyl, m.dark, 0.1, 0.52, 0.1, side * 0.34, 0.02, 0.28, Math.PI / 2, 0, 0);
    add(pulse, geo.cyl, m.emit, 0.055, 0.1, 0.055, 0, 0.28, 0);
    wings.push(wing);
  }

  const vent = add(pack, geo.cylR, m.emit, 0.22, 0.34, 0.22, 0, -0.04, -0.28, Math.PI / 2, 0, 0);
  thrusters.push(vent);
  return { wings, thrusters };
}

function buildPauldron(sh: THREE.Group, side: number, m: ValkMats, detail: boolean) {
  add(sh, geo.soft, m.armor, 0.74, 0.34, 0.62, side * 0.2, 0.16, 0);
  add(sh, geo.soft, m.white, 0.56, 0.2, 0.44, side * 0.24, 0.32, -0.02, 0.22, 0, side * 0.2);
  add(sh, geo.soft, m.navy, 0.38, 0.22, 0.36, side * 0.26, 0.04, -0.08);
  add(sh, geo.soft, m.navySoft, 0.24, 0.16, 0.28, side * 0.34, 0.0, 0.1);
  add(sh, geo.soft, m.armor, 0.28, 0.18, 0.2, side * 0.38, 0.22, 0.16, 0.1, 0, side * 0.25);
  const pd = new THREE.Group();
  pd.position.set(side * 0.24, 0.34, 0.16);
  sh.add(pd);
  add(pd, geo.sphere, m.dark, 0.15, 0.15, 0.15, 0, 0, 0);
  add(pd, geo.cyl, m.emit, 0.045, 0.16, 0.045, 0, 0.02, 0.1, Math.PI / 2, 0, 0);
  if (detail) {
    add(sh, geo.box, m.gold, 0.035, 0.18, 0.22, side * 0.36, 0.12, 0.14);
    add(sh, geo.soft, m.plate, 0.18, 0.1, 0.15, side * 0.26, 0.02, 0.2);
    add(sh, geo.box, m.emit, 0.045, 0.045, 0.045, side * 0.2, 0.24, 0.18);
  }
  return pd;
}

function buildArm(arm: THREE.Group, side: number, m: ValkMats, detail: boolean) {
  add(arm, geo.soft, m.armor, 0.3, 0.76, 0.3, 0, -0.38, 0.02);
  add(arm, geo.soft, m.white, 0.22, 0.3, 0.22, 0, -0.22, 0.08);
  add(arm, geo.cyl, m.navy, 0.22, 0.14, 0.22, 0, -0.74, 0.02);
  add(arm, geo.soft, m.navySoft, 0.16, 0.24, 0.14, side * 0.1, -0.4, 0.04);
  const fore = new THREE.Group();
  fore.position.set(0, -0.8, 0.02);
  arm.add(fore);
  add(fore, geo.soft, m.armor, 0.26, 0.62, 0.26, 0, -0.26, 0.02);
  add(fore, geo.soft, m.navy, 0.22, 0.2, 0.22, 0, -0.52, 0.04);
  add(fore, geo.soft, m.white, 0.18, 0.24, 0.16, side * 0.08, -0.2, 0.1);
  if (detail) add(fore, geo.box, m.gold, 0.03, 0.26, 0.07, side * 0.1, -0.2, 0.1);
  return fore;
}

function buildLeg(hip: THREE.Group, side: number, m: ValkMats, detail: boolean) {
  // Athletic Gundam thigh: white front, navy outer panel, gold seam.
  add(hip, geo.soft, m.armor, 0.5, 0.96, 0.48, 0, -0.46, 0.06);
  add(hip, geo.soft, m.white, 0.38, 0.46, 0.3, 0, -0.3, 0.22);
  add(hip, geo.soft, m.navy, 0.2, 0.7, 0.36, side * 0.24, -0.44, 0.0);
  add(hip, geo.soft, m.navySoft, 0.14, 0.42, 0.22, side * -0.18, -0.4, 0.02);
  add(hip, geo.soft, m.navy, 0.28, 0.16, 0.28, 0, -0.9, 0.02);
  add(hip, geo.box, m.gold, 0.03, 0.42, 0.07, side * 0.2, -0.38, 0.2);
  add(hip, geo.box, m.emit, 0.08, 0.03, 0.045, 0, -0.22, 0.3);
  if (detail) add(hip, geo.soft, m.plate, 0.22, 0.2, 0.14, side * 0.1, -0.58, 0.24);

  const knee = new THREE.Group();
  knee.position.set(0, -0.98, 0.04);
  hip.add(knee);
  // Forward kneecap — the cap lives on +Z so a +X flex reads as a humanoid knee.
  add(knee, geo.soft, m.armor, 0.46, 0.32, 0.44, 0, 0.02, 0.12);
  add(knee, geo.soft, m.white, 0.36, 0.22, 0.28, 0, 0.05, 0.32);
  add(knee, geo.cone, m.armor, 0.3, 0.28, 0.22, 0, 0.0, 0.42, Math.PI / 2, 0, 0);
  add(knee, geo.soft, m.navy, 0.22, 0.16, 0.16, 0, -0.04, 0.3);
  add(knee, geo.box, m.gold, 0.22, 0.03, 0.045, 0, 0.1, 0.46);
  // Shin sits slightly aft of the cap so the planted bend is calf-back.
  add(knee, geo.soft, m.navy, 0.36, 1.08, 0.36, 0, -0.6, -0.04);
  add(knee, geo.soft, m.armor, 0.3, 0.74, 0.28, 0, -0.62, 0.12);
  add(knee, geo.soft, m.white, 0.22, 0.46, 0.2, 0, -0.72, 0.22);
  add(knee, geo.soft, m.navySoft, 0.18, 0.78, 0.26, side * 0.18, -0.58, -0.04);
  add(knee, geo.box, m.emit, 0.08, 0.03, 0.04, 0, -0.36, 0.28);
  if (detail) add(knee, geo.box, m.gold, 0.035, 0.52, 0.07, side * 0.16, -0.5, 0.14);

  const foot = new THREE.Group();
  foot.position.set(0, -1.16, 0.02);
  knee.add(foot);
  add(foot, geo.soft, m.navy, 0.36, 0.14, 0.52, 0, 0.06, 0.04);
  add(foot, geo.soft, m.armor, 0.44, 0.12, 0.64, 0, 0.14, 0.12);
  add(foot, geo.soft, m.armor, 0.17, 0.11, 0.38, -0.12, 0.13, 0.5);
  add(foot, geo.soft, m.armor, 0.17, 0.11, 0.38, 0.12, 0.13, 0.5);
  add(foot, geo.soft, m.white, 0.13, 0.08, 0.2, -0.12, 0.16, 0.62);
  add(foot, geo.soft, m.white, 0.13, 0.08, 0.2, 0.12, 0.16, 0.62);
  add(foot, geo.soft, m.navySoft, 0.12, 0.08, 0.2, 0, 0.1, -0.18);
  add(foot, geo.box, m.emit, 0.08, 0.03, 0.035, 0, 0.2, 0.24);
  return { knee, foot };
}

function buildChinGatling(chin: THREE.Group, m: ValkMats, detail: boolean) {
  add(chin, geo.soft, m.navy, 0.28, 0.18, 0.34, 0, 0.04, 0);
  add(chin, geo.cyl, m.dark, 0.16, 0.88, 0.16, 0, -0.08, 0.42, Math.PI / 2, 0, 0);
  add(chin, geo.cyl, m.navy, 0.2, 0.16, 0.2, 0, -0.08, 0.12, Math.PI / 2, 0, 0);
  add(chin, geo.cyl, m.armor, 0.13, 0.22, 0.13, 0, -0.08, 0.3, Math.PI / 2, 0, 0);
  if (detail) {
    for (const x of [-0.045, 0.045]) {
      add(chin, geo.cyl, m.dark, 0.04, 0.55, 0.04, x, -0.08, 0.4, Math.PI / 2, 0, 0);
    }
  }
  add(chin, geo.cyl, m.emit, 0.055, 0.1, 0.055, 0, -0.08, 0.82, Math.PI / 2, 0, 0);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -0.08, 0.9);
  chin.add(muzzle);
  return muzzle;
}

function attachPulse(
  fore: THREE.Group,
  side: number,
  m: ValkMats,
  muzzle: THREE.Object3D,
  flashes: THREE.Sprite[],
  lights: THREE.PointLight[],
) {
  const g = new THREE.Group();
  g.position.set(side * 0.05, -0.58, 0.26);
  fore.add(g);
  add(g, geo.soft, m.navy, 0.2, 0.18, 0.3, 0, 0.02, 0);
  add(g, geo.cyl, m.armor, 0.18, 0.96, 0.18, 0, 0, 0.26, Math.PI / 2, 0, 0);
  add(g, geo.cyl, m.dark, 0.13, 0.6, 0.13, 0, 0, 0.36, Math.PI / 2, 0, 0);
  add(g, geo.cyl, m.emit, 0.075, 0.15, 0.075, 0, 0, 0.76, Math.PI / 2, 0, 0);
  add(g, geo.box, m.gold, 0.03, 0.12, 0.2, side * 0.08, 0.08, 0.1);
  muzzle.position.set(0, 0, 0.86);
  g.add(muzzle);
  addFlash(g, muzzle, flashes, lights, m.glow);
  return g;
}

function attachRotary(
  fore: THREE.Group,
  _side: number,
  m: ValkMats,
  muzzle: THREE.Object3D,
  flashes: THREE.Sprite[],
  lights: THREE.PointLight[],
) {
  const g = new THREE.Group();
  g.position.set(0.05, -0.58, 0.26);
  fore.add(g);
  add(g, geo.soft, m.navy, 0.28, 0.2, 0.34, 0, 0.02, 0);
  add(g, geo.cyl, m.armor, 0.24, 0.42, 0.24, 0, 0, 0.22, Math.PI / 2, 0, 0);
  const barrels: THREE.Object3D[] = [];
  const spin = new THREE.Group();
  spin.position.set(0, 0, 0.44);
  g.add(spin);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    barrels.push(
      add(spin, geo.cyl, m.dark, 0.055, 0.5, 0.055, Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0.1, Math.PI / 2, 0, 0),
    );
  }
  g.userData.barrels = barrels;
  add(g, geo.cyl, m.emit, 0.075, 0.075, 0.075, 0, 0, 0.76, Math.PI / 2, 0, 0);
  muzzle.position.set(0, 0, 0.86);
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
      color: 0x88e0ff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  spr.position.copy(muzzle.position);
  spr.visible = false;
  g.add(spr);
  flashes.unshift(spr);
  if (lights) {
    const light = new THREE.PointLight(glow, 0, 6);
    light.position.copy(muzzle.position);
    g.add(light);
    lights.push(light);
  }
}

export function poseValkyrieExtras(
  rig: MechRig,
  fire: number,
  special: number,
  alt: number,
  boost: boolean,
  jumping: boolean,
  shieldUp: boolean,
  shield: number,
  time: number,
) {
  const flare = boost || jumping ? 0.16 : 0;
  if (rig.wings) {
    for (let i = 0; i < rig.wings.length; i++) {
      const wing = rig.wings[i];
      const side = i === 0 ? -1 : 1;
      const restX = (wing.userData.restX as number | undefined) ?? WING_REST.x;
      const restY = (wing.userData.restY as number | undefined) ?? side * WING_REST.y;
      const restZ = (wing.userData.restZ as number | undefined) ?? side * WING_REST.z;
      wing.rotation.set(restX, restY, restZ + side * flare);
    }
  }
  if (rig.barrels) {
    for (const b of rig.barrels) b.rotation.z += (fire + special) * 2.2;
  }
  if (rig.pdTurrets) {
    rig.pdTurrets.forEach((t, i) => {
      t.rotation.y = Math.sin(time * 1.6 + i) * 0.45;
      t.rotation.x = 0.12 + Math.sin(time * 1.1 + i * 2) * 0.16;
    });
  }
  if (rig.shieldMesh) {
    rig.shieldMesh.visible = shieldUp && shield > 0.02;
    const mat = rig.shieldMesh.material as THREE.MeshPhysicalMaterial;
    mat.opacity = 0.08 + shield * 0.14;
    mat.emissiveIntensity = 0.4 + shield * 1.1;
    const s = 1 + Math.sin(time * 11) * 0.02;
    rig.shieldMesh.scale.set(s, s * 0.9, s);
  }
  if (rig.glow[0]) {
    rig.glow[0].emissiveIntensity = special > 0.02 || fire > 0.02 ? 5.6 : 3.8 + Math.sin(time * 4) * 0.35;
  }
  void alt;
}
