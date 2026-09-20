import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { makeHexCellMap, makeMuzzleSprite, sharedArmor, sharedMetal } from "./textures";
import type { MechRig } from "./mech-mesh";
import type { WeaponId } from "./types";

const segs = 22;
const geo = {
  box: new RoundedBoxGeometry(1, 1, 1, 4, 0.1),
  soft: new RoundedBoxGeometry(1, 1, 1, 5, 0.16),
  hard: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, segs),
  cylR: new THREE.CylinderGeometry(0.5, 0.28, 1, segs),
  sphere: new THREE.SphereGeometry(0.5, 28, 22),
  sphereHi: new THREE.SphereGeometry(0.5, 40, 28),
  hex: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  torus: new THREE.TorusGeometry(0.5, 0.08, 12, 28),
  torusFat: new THREE.TorusGeometry(0.5, 0.12, 12, 28),
  cone: new THREE.ConeGeometry(0.5, 1, 10),
  cap: new THREE.CapsuleGeometry(0.5, 1, 6, 16),
  disk: new THREE.CircleGeometry(0.5, 28),
};

const hexMap = makeHexCellMap();
const muzzleTex = makeMuzzleSprite();
const metal = sharedMetal();
const armorT = sharedArmor();

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
  const m = new THREE.Mesh(geometry, material);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function mats(wrecked: boolean) {
  const paint = wrecked ? 0x2a2a2c : 0x3a4048;
  const glow = wrecked ? 0x331010 : 0xff2a22;
  return {
    armor: new THREE.MeshStandardMaterial({
      color: paint,
      map: armorT.map,
      normalMap: armorT.normalMap,
      roughnessMap: armorT.roughnessMap,
      metalnessMap: armorT.metalnessMap,
      metalness: wrecked ? 0.35 : 0.42,
      roughness: wrecked ? 0.64 : 0.48,
      envMapIntensity: wrecked ? 0.3 : 0.95,
      normalScale: new THREE.Vector2(1.25, 1.25),
    }),
    plate: new THREE.MeshStandardMaterial({
      color: 0x1a1d22,
      map: metal.map,
      normalMap: metal.normalMap,
      metalness: 0.55,
      roughness: 0.4,
      envMapIntensity: 0.9,
    }),
    dark: new THREE.MeshStandardMaterial({
      color: 0x08090c,
      map: metal.map,
      metalness: 0.7,
      roughness: 0.42,
    }),
    trim: new THREE.MeshStandardMaterial({
      color: 0x5a616c,
      map: metal.map,
      metalness: 0.5,
      roughness: 0.4,
    }),
    emit: new THREE.MeshStandardMaterial({
      color: glow,
      emissive: glow,
      emissiveIntensity: wrecked ? 0.35 : 3.8,
      metalness: 0.1,
      roughness: 0.22,
    }),
    hex: new THREE.MeshStandardMaterial({
      map: hexMap,
      color: 0xffffff,
      emissive: glow,
      emissiveMap: hexMap,
      emissiveIntensity: wrecked ? 0.25 : 2.6,
      metalness: 0.15,
      roughness: 0.32,
    }),
    lens: new THREE.MeshPhysicalMaterial({
      color: 0x1a0408,
      metalness: 0.12,
      roughness: 0.04,
      emissive: glow,
      emissiveIntensity: wrecked ? 0.2 : 2.8,
      transparent: true,
      opacity: 0.96,
      envMapIntensity: 1.4,
    }),
    glow,
  };
}

/**
 * Titan-class heavy assault — headless spherical chassis matching the
 * reference: hex crown, cyclops core, dual upward tube pods, hanging rotaries.
 */
export function buildTitanMech(
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
  hips.position.y = 2.28;
  body.add(hips);
  add(hips, geo.soft, m.dark, 1.72, 0.48, 1.12, 0, 0.06, 0);
  add(hips, geo.soft, m.armor, 1.95, 0.52, 1.28, 0, 0.32, 0.04);
  add(hips, geo.cyl, m.plate, 0.72, 0.38, 0.72, 0, 0.28, 0);
  add(hips, geo.box, m.emit, 0.42, 0.03, 0.06, 0, 0.52, 0.62);
  if (detail) {
    add(hips, geo.hex, m.trim, 0.16, 0.05, 0.16, -0.58, 0.48, 0.48);
    add(hips, geo.hex, m.trim, 0.16, 0.05, 0.16, 0.58, 0.48, 0.48);
  }

  const leftHip = new THREE.Group();
  leftHip.position.set(-0.78, 0.02, 0.04);
  hips.add(leftHip);
  const rightHip = new THREE.Group();
  rightHip.position.set(0.78, 0.02, 0.04);
  hips.add(rightHip);
  const L = buildTitanLeg(leftHip, -1, m, detail);
  const R = buildTitanLeg(rightHip, 1, m, detail);

  const torso = new THREE.Group();
  torso.position.set(0, 0.18, 0);
  hips.add(torso);
  buildTorso(torso, m, detail);

  const muzzleChest = new THREE.Object3D();
  muzzleChest.position.set(0, 1.32, 1.38);
  torso.add(muzzleChest);

  const head = new THREE.Group();
  head.position.set(0, 1.72, 0.18);
  torso.add(head);

  // Missile pods live on the torso so they stay planted like the reference.
  buildMissilePod(torso, -1, m, detail);
  buildMissilePod(torso, 1, m, detail);

  const lShoulder = new THREE.Group();
  lShoulder.position.set(-1.28, 1.48, 0.06);
  torso.add(lShoulder);
  const rShoulder = new THREE.Group();
  rShoulder.position.set(1.28, 1.48, 0.06);
  torso.add(rShoulder);
  buildPauldron(lShoulder, -1, m);
  buildPauldron(rShoulder, 1, m);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.06, -0.22, 0.04);
  lShoulder.add(leftArm);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.06, -0.22, 0.04);
  rShoulder.add(rightArm);
  const leftFore = buildTitanArm(leftArm, -1, m, detail);
  const rightFore = buildTitanArm(rightArm, 1, m, detail);

  const flashes: THREE.Sprite[] = [];
  const muzzleLights: THREE.PointLight[] = [];
  const muzzle = new THREE.Object3D();
  const muzzle2 = new THREE.Object3D();
  const rightGun = attachRotary(rightFore, 1, m, muzzle, flashes, wrecked ? [] : muzzleLights, true);
  const leftGun = attachRotary(leftFore, -1, m, muzzle2, flashes, wrecked ? [] : muzzleLights, false);

  const thrusters: THREE.Mesh[] = [];
  add(torso, geo.soft, m.dark, 1.05, 0.72, 0.48, 0, 1.02, -1.12);
  const bellL = add(torso, geo.cylR, m.emit, 0.38, 0.48, 0.38, -0.32, 0.78, -1.22, Math.PI / 2, 0, 0);
  const bellR = add(torso, geo.cylR, m.emit, 0.38, 0.48, 0.38, 0.32, 0.78, -1.22, Math.PI / 2, 0, 0);
  thrusters.push(bellL, bellR);

  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(3.5, 28, 18),
    new THREE.MeshPhysicalMaterial({
      color: 0xff4433,
      emissive: 0xff2218,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.16,
      roughness: 0.12,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  shieldMesh.position.set(0, 1.35, 0);
  shieldMesh.visible = false;
  body.add(shieldMesh);

  const lights: THREE.PointLight[] = [];
  if (!wrecked) {
    const eye = new THREE.PointLight(m.glow, 2.4, 11);
    eye.position.set(0, 1.32, 1.4);
    torso.add(eye);
    lights.push(eye);
    const crown = new THREE.PointLight(m.glow, 1.1, 7);
    crown.position.set(0, 2.62, 0);
    torso.add(crown);
    lights.push(crown);
  }

  const chestFlash = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: muzzleTex,
      color: 0xff6644,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  chestFlash.position.copy(muzzleChest.position);
  chestFlash.visible = false;
  torso.add(chestFlash);
  flashes.push(chestFlash);

  if (wrecked) {
    root.rotation.z = 0.7;
    leftArm.rotation.x = 0.8;
  }

  root.scale.setScalar(1.06);
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
    thrusters,
    flashes,
    lights,
    glow: [m.emit],
    chassis: "titan",
    primary: weapons.primary,
    secondary: weapons.secondary,
    shieldMesh,
    muzzleChest,
    barrels: [...rightGun.userData.barrels, ...leftGun.userData.barrels] as THREE.Object3D[],
  };
}

type TitanMats = ReturnType<typeof mats>;

function buildTorso(torso: THREE.Group, m: TitanMats, detail: boolean) {
  // Headless barrel — the sphere IS the body/face.
  add(torso, geo.sphereHi, m.armor, 2.72, 2.42, 2.48, 0, 1.32, 0.04);
  add(torso, geo.sphere, m.plate, 2.42, 2.12, 2.18, 0, 1.28, 0.02);
  add(torso, geo.soft, m.armor, 2.05, 0.72, 1.55, 0, 0.42, 0.12);
  add(torso, geo.soft, m.dark, 1.55, 0.95, 0.42, 0, 1.22, 0.98);
  add(torso, geo.soft, m.plate, 1.85, 0.28, 1.72, 0, 2.22, 0.02);

  // Side vents / slope plates.
  add(torso, geo.soft, m.armor, 0.42, 1.15, 1.35, -1.18, 1.22, 0.08, 0, 0, 0.18);
  add(torso, geo.soft, m.armor, 0.42, 1.15, 1.35, 1.18, 1.22, 0.08, 0, 0, -0.18);
  add(torso, geo.box, m.emit, 0.04, 0.72, 0.06, -1.38, 1.22, 0.42);
  add(torso, geo.box, m.emit, 0.04, 0.72, 0.06, 1.38, 1.22, 0.42);
  add(torso, geo.box, m.emit, 0.85, 0.03, 0.05, 0, 0.62, 0.92);

  if (detail) {
    for (const [x, y, z] of [
      [-0.72, 0.78, 1.05],
      [0.72, 0.78, 1.05],
      [-0.95, 1.35, 0.98],
      [0.95, 1.35, 0.98],
      [-0.55, 1.72, 1.02],
      [0.55, 1.72, 1.02],
    ]) {
      add(torso, geo.hex, m.trim, 0.22, 0.04, 0.22, x, y, z, Math.PI / 2, 0, 0);
    }
    add(torso, geo.hard, m.dark, 0.55, 0.08, 0.04, -1.22, 1.55, 0.55);
    add(torso, geo.hard, m.dark, 0.55, 0.08, 0.04, 1.22, 1.55, 0.55);
  }

  // Cyclops — concentric rings + plasma core.
  add(torso, geo.torusFat, m.dark, 1.05, 1.05, 1.05, 0, 1.32, 1.05);
  add(torso, geo.torus, m.emit, 0.88, 0.88, 0.88, 0, 1.32, 1.1);
  add(torso, geo.torusFat, m.dark, 0.7, 0.7, 0.7, 0, 1.32, 1.14);
  add(torso, geo.torus, m.emit, 0.52, 0.52, 0.52, 0, 1.32, 1.18);
  add(torso, geo.cyl, m.dark, 0.72, 0.12, 0.72, 0, 1.32, 1.12, Math.PI / 2, 0, 0);
  add(torso, geo.sphere, m.lens, 0.58, 0.58, 0.22, 0, 1.32, 1.2);
  add(torso, geo.sphere, m.emit, 0.2, 0.2, 0.18, 0, 1.32, 1.3);
  add(torso, geo.cyl, m.emit, 0.08, 0.08, 0.06, 0, 1.32, 1.36, Math.PI / 2, 0, 0);

  // Hex crown — the signature top plate from the reference.
  add(torso, geo.hex, m.plate, 1.95, 0.22, 1.95, 0, 2.42, -0.02);
  add(torso, geo.hex, m.dark, 1.72, 0.1, 1.72, 0, 2.54, -0.02);
  const crown = add(torso, geo.hex, m.hex, 1.58, 0.08, 1.58, 0, 2.6, -0.02);
  crown.material = m.hex;
  add(torso, geo.hex, m.emit, 1.62, 0.03, 1.62, 0, 2.52, -0.02);
  add(torso, geo.hex, m.dark, 0.42, 0.06, 0.42, 0, 2.66, -0.02);
}

function buildMissilePod(torso: THREE.Group, side: number, m: TitanMats, detail: boolean) {
  const pod = new THREE.Group();
  // High and outboard, flush with the hex crown like the reference.
  pod.position.set(side * 1.18, 2.48, -0.02);
  torso.add(pod);
  add(pod, geo.soft, m.plate, 1.08, 0.52, 0.92, 0, 0, 0);
  add(pod, geo.soft, m.dark, 0.95, 0.18, 0.8, 0, 0.22, 0);
  add(pod, geo.soft, m.armor, 1.02, 0.22, 0.72, 0, -0.18, 0.02);
  const cols = [-0.28, 0, 0.28];
  const rows = [-0.22, 0, 0.22];
  for (const x of cols) {
    for (const z of rows) {
      add(pod, geo.cyl, m.dark, 0.2, 0.28, 0.2, x, 0.28, z);
      add(pod, geo.cyl, m.plate, 0.16, 0.08, 0.16, x, 0.4, z);
      add(pod, geo.cyl, m.emit, 0.08, 0.04, 0.08, x, 0.44, z);
    }
  }
  if (detail) {
    add(pod, geo.box, m.emit, 0.72, 0.03, 0.04, 0, 0.02, 0.42);
    add(pod, geo.hex, m.trim, 0.12, 0.04, 0.12, side * 0.38, -0.08, 0.38);
  }
}

function buildPauldron(sh: THREE.Group, side: number, m: TitanMats) {
  add(sh, geo.sphere, m.plate, 0.72, 0.72, 0.72, 0, 0.02, 0);
  add(sh, geo.soft, m.armor, 0.95, 0.58, 0.92, -side * 0.12, 0.12, 0.02);
  add(sh, geo.cyl, m.dark, 0.42, 0.55, 0.42, 0, -0.28, 0.02);
  add(sh, geo.box, m.emit, 0.06, 0.04, 0.42, side * 0.38, 0.22, 0.08);
}

function buildTitanArm(arm: THREE.Group, side: number, m: TitanMats, detail: boolean) {
  add(arm, geo.sphere, m.plate, 0.58, 0.58, 0.58, 0, 0.18, 0);
  add(arm, geo.cap, m.dark, 0.38, 0.72, 0.38, 0, -0.28, 0.02);
  add(arm, geo.soft, m.armor, 0.52, 0.95, 0.5, side * 0.04, -0.22, 0.04);
  add(arm, geo.box, m.trim, 0.14, 0.62, 0.14, side * 0.26, -0.22, 0.14);
  if (detail) add(arm, geo.box, m.emit, 0.04, 0.35, 0.04, side * 0.3, -0.18, 0.22);
  const fore = new THREE.Group();
  fore.position.set(0, -0.78, 0.04);
  arm.add(fore);
  add(fore, geo.sphere, m.plate, 0.46, 0.46, 0.46, 0, 0.06, 0);
  add(fore, geo.soft, m.armor, 0.48, 0.62, 0.44, 0, -0.22, 0.06);
  return fore;
}

function attachRotary(
  arm: THREE.Group,
  _side: number,
  m: TitanMats,
  muzzle: THREE.Object3D,
  flashes: THREE.Sprite[],
  lights: THREE.PointLight[],
  exposed: boolean,
) {
  const g = new THREE.Group();
  g.position.set(0, -0.38, 0.32);
  arm.add(g);
  add(g, geo.cyl, m.plate, 0.58, 0.58, 0.38, 0, 0.06, 0.02, Math.PI / 2, 0, 0);
  add(g, geo.cyl, m.dark, exposed ? 0.4 : 0.46, exposed ? 0.4 : 0.46, 1.28, 0, 0.02, 0.68, Math.PI / 2, 0, 0);
  add(g, geo.cyl, m.trim, 0.5, 0.5, 0.12, 0, 0.02, 0.28, Math.PI / 2, 0, 0);
  add(g, geo.cyl, m.trim, 0.48, 0.48, 0.1, 0, 0.02, 1.22, Math.PI / 2, 0, 0);
  const barrels: THREE.Object3D[] = [];
  const ring = exposed ? 0.13 : 0.1;
  const len = exposed ? 1.12 : 0.85;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const b = add(
      g,
      geo.cyl,
      m.trim,
      exposed ? 0.1 : 0.08,
      exposed ? 0.1 : 0.08,
      len,
      Math.cos(a) * ring,
      0.02 + Math.sin(a) * ring,
      exposed ? 0.78 : 0.7,
      Math.PI / 2,
      0,
      0,
    );
    barrels.push(b);
    if (exposed) add(g, geo.cyl, m.emit, 0.04, 0.04, 0.06, Math.cos(a) * ring, 0.02 + Math.sin(a) * ring, 1.32, Math.PI / 2, 0, 0);
  }
  add(g, geo.cyl, m.emit, 0.07, 0.07, 0.06, 0, 0.02, exposed ? 1.36 : 1.28, Math.PI / 2, 0, 0);
  g.userData.barrels = barrels;
  muzzle.position.set(0, 0.02, exposed ? 1.42 : 1.34);
  g.add(muzzle);
  const flash = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: muzzleTex,
      color: 0xff8866,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  flash.position.copy(muzzle.position);
  flash.visible = false;
  g.add(flash);
  flashes.push(flash);
  const light = new THREE.PointLight(0xff5533, 0, 7, 2);
  light.position.copy(muzzle.position);
  light.visible = false;
  g.add(light);
  lights.push(light);
  return g;
}

function buildTitanLeg(hip: THREE.Group, side: number, m: TitanMats, detail: boolean) {
  add(hip, geo.sphere, m.plate, 0.82, 0.82, 0.82, 0, 0.04, 0);
  add(hip, geo.soft, m.armor, 0.92, 0.68, 0.85, side * 0.08, -0.2, 0.04);
  add(hip, geo.box, m.emit, 0.08, 0.04, 0.28, side * 0.28, 0.12, 0.32);
  const thigh = new THREE.Group();
  hip.add(thigh);
  add(thigh, geo.cap, m.dark, 0.42, 0.85, 0.42, 0, -0.58, 0);
  add(thigh, geo.soft, m.armor, 0.78, 1.22, 0.78, side * 0.06, -0.55, 0.06);
  add(thigh, geo.soft, m.plate, 0.28, 0.85, 0.22, side * 0.4, -0.62, 0.18);
  if (detail) {
    add(thigh, geo.hex, m.trim, 0.16, 0.04, 0.16, side * 0.1, -0.32, 0.42, Math.PI / 2, 0, 0);
    add(thigh, geo.box, m.emit, 0.05, 0.45, 0.04, side * 0.42, -0.55, 0.28);
  }

  const knee = new THREE.Group();
  knee.position.set(0, -1.22, 0.02);
  thigh.add(knee);
  add(knee, geo.sphere, m.plate, 0.56, 0.56, 0.56, 0, 0, 0);
  add(knee, geo.soft, m.armor, 0.6, 0.38, 0.32, 0, 0.02, 0.26);
  add(knee, geo.cap, m.dark, 0.34, 0.72, 0.34, 0, -0.58, 0);
  add(knee, geo.soft, m.armor, 0.62, 1.08, 0.6, 0, -0.55, 0.06);
  add(knee, geo.box, m.emit, 0.1, 0.03, 0.22, 0, -0.22, 0.34);

  const foot = new THREE.Group();
  foot.position.set(0, -1.18, 0.06);
  knee.add(foot);
  add(foot, geo.soft, m.dark, 0.78, 0.2, 1.12, 0, 0.1, 0.1);
  add(foot, geo.soft, m.armor, 0.95, 0.26, 1.28, 0, 0.16, 0.16);
  add(foot, geo.soft, m.armor, 0.32, 0.18, 0.48, -0.28, 0.14, 0.72);
  add(foot, geo.soft, m.armor, 0.32, 0.18, 0.48, 0.28, 0.14, 0.72);
  add(foot, geo.soft, m.armor, 0.28, 0.16, 0.42, 0, 0.13, 0.82);
  add(foot, geo.soft, m.armor, 0.38, 0.16, 0.42, 0, 0.16, -0.48);
  add(foot, geo.box, m.emit, 0.22, 0.03, 0.05, 0, 0.28, 0.55);
  return { knee, foot };
}

export function poseTitanExtras(
  rig: MechRig,
  fire: number,
  special: number,
  shieldUp: boolean,
  shield: number,
  time: number,
) {
  if (rig.barrels) {
    for (const b of rig.barrels) {
      b.rotation.z += fire * 1.8;
    }
  }
  if (rig.shieldMesh) {
    rig.shieldMesh.visible = shieldUp && shield > 0.02;
    const mat = rig.shieldMesh.material as THREE.MeshPhysicalMaterial;
    mat.opacity = 0.1 + shield * 0.18;
    mat.emissiveIntensity = 0.5 + shield * 1.2;
    const s = 1 + Math.sin(time * 9) * 0.015;
    rig.shieldMesh.scale.set(s, s * 0.92, s);
  }
  if (rig.glow[0] && special > 0.02) {
    rig.glow[0].emissiveIntensity = 5.4;
  } else if (rig.glow[0]) {
    rig.glow[0].emissiveIntensity = 3.4 + Math.sin(time * 3) * 0.3;
  }
}
