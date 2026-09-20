import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { CHASSIS } from "./catalog";
import {
  chassisMark,
  makeMuzzleSprite,
  sharedArmor,
  sharedHazard,
  sharedMetal,
  sharedRubber,
  sharedVisor,
} from "./textures";
import type { ChassisId, WeaponId } from "./types";
import { buildTitanMech, poseTitanExtras } from "./titan-mesh";

export interface MechRig {
  root: THREE.Group;
  body: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftHip: THREE.Group;
  rightHip: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftFoot: THREE.Group;
  rightFoot: THREE.Group;
  leftShoulder: THREE.Group;
  rightShoulder: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftFore: THREE.Group;
  rightFore: THREE.Group;
  leftGun: THREE.Group;
  rightGun: THREE.Group;
  antenna: THREE.Object3D | null;
  muzzle: THREE.Object3D;
  muzzle2: THREE.Object3D;
  muzzleLights: THREE.PointLight[];
  thrusters: THREE.Mesh[];
  flashes: THREE.Sprite[];
  lights: THREE.PointLight[];
  glow: THREE.MeshStandardMaterial[];
  chassis: ChassisId;
  primary: WeaponId;
  secondary: WeaponId;
  shieldMesh?: THREE.Mesh;
  muzzleChest?: THREE.Object3D;
  barrels?: THREE.Object3D[];
}

const segs = 14;
const geo = {
  box: new RoundedBoxGeometry(1, 1, 1, 3, 0.08),
  plate: new RoundedBoxGeometry(1, 1, 1, 2, 0.045),
  hard: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, segs),
  cylR: new THREE.CylinderGeometry(0.5, 0.28, 1, segs),
  cone: new THREE.ConeGeometry(0.5, 1, segs),
  sphere: new THREE.SphereGeometry(0.5, 16, 12),
  hex: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  torus: new THREE.TorusGeometry(0.5, 0.12, 8, 18),
  cap: new THREE.CapsuleGeometry(0.5, 1, 5, 12),
  nozzle: new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.48, 0),
      new THREE.Vector2(0.4, 0.18),
      new THREE.Vector2(0.26, 0.48),
      new THREE.Vector2(0.22, 0.78),
      new THREE.Vector2(0.34, 0.95),
    ],
    12,
  ),
};

const muzzleTex = makeMuzzleSprite();
const metal = sharedMetal();
const armor = sharedArmor();
const rubberT = sharedRubber();
const visorT = sharedVisor();
const hazardT = sharedHazard();

const GLOW: Record<ChassisId, number> = {
  titan: 0xff2a22,
  reaper: 0xffb060,
  colossus: 0xff7a3a,
  phantom: 0x66e7ff,
};

const MARK: Record<ChassisId, string> = {
  titan: "T",
  reaper: "R",
  colossus: "C",
  phantom: "P",
};

interface Mats {
  armor: THREE.MeshPhysicalMaterial;
  accent: THREE.MeshPhysicalMaterial;
  trim: THREE.MeshPhysicalMaterial;
  dark: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  emit: THREE.MeshStandardMaterial;
  heat: THREE.MeshStandardMaterial;
  hyd: THREE.MeshPhysicalMaterial;
  rubber: THREE.MeshStandardMaterial;
  stripe: THREE.MeshStandardMaterial;
  lens: THREE.MeshPhysicalMaterial;
  mark: THREE.MeshStandardMaterial;
}

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

function piston(
  parent: THREE.Object3D,
  mats: Mats,
  x: number,
  y: number,
  z: number,
  len: number,
  side: number,
  along: "y" | "z" = "y",
) {
  if (along === "y") {
    add(parent, geo.cyl, mats.dark, 0.16, len * 0.55, 0.16, x, y, z);
    add(parent, geo.cyl, mats.hyd, 0.1, len * 0.72, 0.1, x + side * 0.02, y - len * 0.08, z + 0.02);
    add(parent, geo.cyl, mats.accent, 0.18, 0.08, 0.18, x, y + len * 0.28, z);
    add(parent, geo.cyl, mats.accent, 0.14, 0.07, 0.14, x, y - len * 0.28, z);
  } else {
    add(parent, geo.cyl, mats.dark, 0.16, 0.16, len * 0.55, x, y, z, Math.PI / 2, 0, 0);
    add(parent, geo.cyl, mats.hyd, 0.1, 0.1, len * 0.7, x, y, z + 0.04, Math.PI / 2, 0, 0);
  }
}

function vent(parent: THREE.Object3D, mats: Mats, x: number, y: number, z: number, w: number, h: number, n = 4) {
  add(parent, geo.hard, mats.dark, w, h, 0.06, x, y, z);
  const step = h / (n + 1);
  for (let i = 0; i < n; i++) {
    add(parent, geo.hard, mats.trim, w * 0.86, 0.03, 0.08, x, y - h * 0.5 + step * (i + 1), z + 0.02);
  }
}

function joint(parent: THREE.Object3D, mats: Mats, size: number, x = 0, y = 0, z = 0) {
  add(parent, geo.sphere, mats.accent, size, size, size, x, y, z);
  add(parent, geo.torus, mats.dark, size * 1.15, size * 1.15, size * 1.15, x, y, z, 0, 0, Math.PI / 2);
}

function fairing(
  parent: THREE.Object3D,
  mats: Mats,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
) {
  add(parent, geo.plate, mats.armor, w, h, d, x, y, z);
  add(parent, geo.box, mats.dark, w * 0.55, h * 0.85, d * 0.55, x, y, z);
}

function cable(parent: THREE.Object3D, mats: Mats, x: number, y: number, z: number, len: number, rx = 0.15) {
  add(parent, geo.cyl, mats.rubber, 0.07, len, 0.07, x, y, z, rx, 0, 0);
}

export function buildMech(
  chassis: ChassisId,
  wrecked = false,
  lowDetail = false,
  weapons?: { primary: WeaponId; secondary: WeaponId },
): MechRig {
  const def = CHASSIS[chassis];
  const primary = weapons?.primary ?? def.primary;
  const secondary = weapons?.secondary ?? def.secondary;
  if (chassis === "titan") return buildTitanMech(wrecked, lowDetail, { primary, secondary });
  const glow = GLOW[chassis];
  const detail = !wrecked && !lowDetail;
  const paintColor = wrecked ? 0x2a2a2c : def.paint;
  const accentColor = wrecked ? 0x3a3a3c : def.accent;

  const mats: Mats = {
    armor: new THREE.MeshPhysicalMaterial({
      color: paintColor,
      map: armor.map,
      normalMap: armor.normalMap,
      roughnessMap: armor.roughnessMap,
      metalnessMap: armor.metalnessMap,
      metalness: wrecked ? 0.52 : 0.62,
      roughness: wrecked ? 0.64 : 0.38,
      clearcoat: wrecked ? 0.06 : 0.36,
      clearcoatRoughness: wrecked ? 0.55 : 0.32,
      clearcoatNormalMap: armor.normalMap,
      clearcoatNormalScale: new THREE.Vector2(0.25, 0.25),
      envMapIntensity: wrecked ? 0.4 : 1.45,
      normalScale: new THREE.Vector2(1.05, 1.05),
    }),
    accent: new THREE.MeshPhysicalMaterial({
      color: accentColor,
      map: armor.map,
      normalMap: armor.normalMap,
      metalness: 0.92,
      roughness: wrecked ? 0.42 : 0.16,
      clearcoat: 0.7,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.45,
      normalScale: new THREE.Vector2(0.45, 0.45),
    }),
    trim: new THREE.MeshPhysicalMaterial({
      color: def.trim,
      map: metal.map,
      normalMap: metal.normalMap,
      roughnessMap: metal.roughnessMap,
      metalnessMap: metal.metalnessMap,
      metalness: 0.78,
      roughness: 0.34,
      envMapIntensity: 1.05,
      normalScale: new THREE.Vector2(0.5, 0.5),
    }),
    dark: new THREE.MeshStandardMaterial({
      color: 0x0c0e14,
      map: metal.map,
      normalMap: metal.normalMap,
      metalness: 0.82,
      roughness: 0.38,
      envMapIntensity: 0.75,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x071018,
      map: visorT,
      metalness: 0.18,
      roughness: 0.04,
      ior: 1.48,
      iridescence: wrecked ? 0 : 0.7,
      iridescenceIOR: 1.28,
      transparent: true,
      opacity: 0.86,
      envMapIntensity: 2.4,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      emissive: wrecked ? 0x000000 : glow,
      emissiveIntensity: wrecked ? 0 : 1.15,
      emissiveMap: visorT,
    }),
    emit: new THREE.MeshStandardMaterial({
      color: wrecked ? 0x33110c : glow,
      metalness: 0.15,
      roughness: 0.16,
      emissive: wrecked ? 0x33110c : glow,
      emissiveIntensity: wrecked ? 0.4 : 3.2,
    }),
    heat: new THREE.MeshStandardMaterial({
      color: 0x4a2018,
      emissive: 0xff6a32,
      emissiveIntensity: wrecked ? 0.85 : 0.22,
      metalness: 0.35,
      roughness: 0.42,
    }),
    hyd: new THREE.MeshPhysicalMaterial({
      color: 0xc5cdd6,
      map: metal.map,
      normalMap: metal.normalMap,
      metalness: 0.98,
      roughness: 0.08,
      envMapIntensity: 1.7,
      anisotropy: 0.65,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x1a1c20,
      map: rubberT.map,
      normalMap: rubberT.normalMap,
      metalness: 0.08,
      roughness: 0.78,
      envMapIntensity: 0.3,
    }),
    stripe: new THREE.MeshStandardMaterial({
      map: hazardT,
      color: 0xffffff,
      metalness: 0.35,
      roughness: 0.42,
      envMapIntensity: 0.7,
    }),
    lens: new THREE.MeshPhysicalMaterial({
      color: 0x08141c,
      metalness: 0.2,
      roughness: 0.05,
      emissive: wrecked ? 0x000000 : glow,
      emissiveIntensity: wrecked ? 0 : 1.6,
      envMapIntensity: 1.8,
      transparent: true,
      opacity: 0.92,
    }),
    mark: new THREE.MeshStandardMaterial({
      map: chassisMark(MARK[chassis], "#d8e4f0"),
      color: 0xffffff,
      metalness: 0.35,
      roughness: 0.4,
      emissive: glow,
      emissiveIntensity: wrecked ? 0 : 0.18,
    }),
  };

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const hips = new THREE.Group();
  hips.position.y = 2.58 * def.scale;
  body.add(hips);

  add(hips, geo.box, mats.dark, 1.85, 0.5, 1.22, 0, 0.06, 0);
  add(hips, geo.box, mats.armor, 2.25, 0.48, 1.48, 0, 0.32, 0.02);
  add(hips, geo.plate, mats.armor, 2.05, 0.72, 1.32, 0, 0.62, 0.04);
  add(hips, geo.cyl, mats.dark, 0.78, 1.05, 0.78, 0, 0.42, 0);
  add(hips, geo.torus, mats.accent, 1.28, 1.28, 1.28, 0, 0.52, 0, Math.PI / 2, 0, 0);
  add(hips, geo.cyl, mats.hyd, 0.18, 0.18, 0.9, -0.88, 0.08, 0.12, 0, 0, Math.PI / 2);
  add(hips, geo.cyl, mats.hyd, 0.18, 0.18, 0.9, 0.88, 0.08, 0.12, 0, 0, Math.PI / 2);
  add(hips, geo.plate, mats.stripe, 0.55, 0.1, 1.05, 0, 0.72, 0.22);
  add(hips, geo.plate, mats.armor, 1.05, 1.12, 1.12, -0.58, -0.28, 0.04);
  add(hips, geo.plate, mats.armor, 1.05, 1.12, 1.12, 0.58, -0.28, 0.04);
  add(hips, geo.plate, mats.trim, 2.15, 0.18, 0.85, 0, -0.08, 0.18);
  if (detail) {
    add(hips, geo.hex, mats.trim, 0.16, 0.08, 0.16, -0.7, 0.48, 0.42);
    add(hips, geo.hex, mats.trim, 0.16, 0.08, 0.16, 0.7, 0.48, 0.42);
  }

  const leftHip = new THREE.Group();
  leftHip.position.set(-0.52, 0.02, 0.04);
  hips.add(leftHip);
  const rightHip = new THREE.Group();
  rightHip.position.set(0.52, 0.02, 0.04);
  hips.add(rightHip);

  const reverse = chassis === "reaper";
  const heavy = chassis === "colossus";
  const L = buildLeg(leftHip, -1, reverse, heavy, mats, detail);
  const R = buildLeg(rightHip, 1, reverse, heavy, mats, detail);

  const torso = new THREE.Group();
  torso.position.set(0, 0.16, chassis === "reaper" ? 0.06 : 0);
  hips.add(torso);

  const wide = chassis === "colossus" ? 1.3 : chassis === "phantom" ? 0.86 : 1;
  buildTorso(torso, chassis, wide, mats, detail, wrecked);

  const thrusters: THREE.Mesh[] = [];
  buildBackpack(torso, chassis, mats, thrusters, detail);

  const head = new THREE.Group();
  head.position.set(0, chassis === "colossus" ? 1.78 : 1.7, 0.1);
  torso.add(head);
  const antenna = buildHead(head, chassis, mats, wrecked, detail);

  const lShoulder = new THREE.Group();
  lShoulder.position.set(-0.58 * wide, 1.4, 0.08);
  torso.add(lShoulder);
  const rShoulder = new THREE.Group();
  rShoulder.position.set(0.58 * wide, 1.4, 0.08);
  torso.add(rShoulder);
  buildPauldron(lShoulder, -1, chassis, mats, detail);
  buildPauldron(rShoulder, 1, chassis, mats, detail);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.04, -0.22, 0.06);
  lShoulder.add(leftArm);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.04, -0.22, 0.06);
  rShoulder.add(rightArm);
  const leftFore = buildArm(leftArm, -1, mats, detail);
  const rightFore = buildArm(rightArm, 1, mats, detail);

  const muzzle = new THREE.Object3D();
  const muzzle2 = new THREE.Object3D();
  const flashes: THREE.Sprite[] = [];
  const muzzleLights: THREE.PointLight[] = [];
  const rightGun = attachWeapon(rightFore, primary, mats, muzzle, flashes, wrecked ? [] : muzzleLights, detail);
  const leftGun = attachWeapon(leftFore, secondary, mats, muzzle2, flashes, wrecked ? [] : muzzleLights, detail);

  if (wrecked) {
    root.rotation.z = 0.72;
    root.rotation.x = 0.16;
    leftArm.rotation.x = 0.85;
    rightArm.visible = Math.random() > 0.4;
    add(torso, geo.box, mats.heat, 0.55, 0.22, 0.4, 0.4, 1.1, 0.5, 0.4, 0.2, 0.3);
  }

  const lights: THREE.PointLight[] = [];
  if (!wrecked) {
    const pl = new THREE.PointLight(glow, 1.45, 10);
    pl.position.set(0, 1.62, 1.22);
    torso.add(pl);
    lights.push(pl);
  }

  root.scale.setScalar(def.scale);
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
    glow: [mats.emit, mats.heat],
    chassis,
    primary,
    secondary,
  };
}

function buildLeg(
  hip: THREE.Group,
  side: number,
  reverse: boolean,
  heavy: boolean,
  mats: Mats,
  detail: boolean,
) {
  const fat = heavy ? 1.18 : 1;
  joint(hip, mats, 0.78 * fat, 0, 0.08, 0);
  add(hip, geo.box, mats.dark, 0.24, 0.22, 0.24, side * 0.32, 0.1, 0);
  fairing(hip, mats, 0.78 * fat, 0.7, 0.82, side * 0.04, -0.18, 0.04);
  add(hip, geo.plate, mats.armor, 0.7 * fat, 0.85, 0.78, side * 0.08, -0.32, 0.04);
  if (detail) add(hip, geo.hex, mats.trim, 0.14, 0.08, 0.14, side * 0.38, 0.1, 0.12, 0, 0, Math.PI / 2);

  const thigh = new THREE.Group();
  thigh.position.set(0, 0.02, 0);
  hip.add(thigh);
  const thighLen = reverse ? 1.12 : 1.32;
  add(thigh, geo.cyl, mats.dark, 0.42 * fat, thighLen * 0.95, 0.42 * fat, side * 0.02, -thighLen * 0.32, reverse ? 0.08 : 0);
  add(thigh, geo.box, mats.dark, 0.42 * fat, thighLen * 0.9, 0.46, side * 0.04, -thighLen * 0.32, reverse ? 0.1 : 0);
  add(thigh, geo.plate, mats.armor, 0.62 * fat, thighLen * 0.92, 0.72, side * 0.08, -thighLen * 0.3, reverse ? 0.14 : 0.04);
  add(thigh, geo.plate, mats.trim, 0.2, thighLen * 0.62, 0.22, side * 0.32, -thighLen * 0.42, 0.28);
  piston(thigh, mats, side * 0.28, -thighLen * 0.42, 0.22, thighLen * 0.85, side);
  if (detail) {
    cable(thigh, mats, side * 0.22, -thighLen * 0.42, 0.34, thighLen * 0.7, 0.08);
    add(thigh, geo.plate, mats.armor, 0.42 * fat, thighLen * 0.38, 0.18, side * 0.08, -thighLen * 0.22, 0.38);
    vent(thigh, mats, side * 0.06, -thighLen * 0.55, 0.4, 0.28, 0.32, 3);
  }

  const knee = new THREE.Group();
  knee.position.set(0, -thighLen + 0.18, reverse ? 0.26 : 0);
  thigh.add(knee);
  joint(knee, mats, 0.54 * fat, 0, 0, 0);
  add(knee, geo.hex, mats.accent, 0.5 * fat, 0.36, 0.58 * fat, 0, 0, 0, Math.PI / 2, 0, 0);
  add(knee, geo.cyl, mats.dark, 0.14, 0.14, 0.46, side * 0.3, 0, 0, 0, 0, Math.PI / 2);
  // Knee cap on the flexion side: front for humanoid, forward-high for reverse-joint.
  const capZ = reverse ? 0.22 : 0.28;
  add(knee, geo.plate, mats.armor, 0.48 * fat, 0.42, 0.2, 0, reverse ? 0.06 : 0.02, capZ);
  add(knee, geo.plate, mats.trim, 0.34 * fat, 0.22, 0.1, 0, 0.04, capZ + 0.06);
  piston(knee, mats, side * 0.18, -0.08, reverse ? -0.2 : -0.22, 0.55, side, "z");
  if (detail) add(knee, geo.hex, mats.hyd, 0.12, 0.08, 0.12, side * 0.34, 0.02, 0.08, 0, 0, Math.PI / 2);

  const shinLen = reverse ? 1.42 : 1.24;
  add(knee, geo.cyl, mats.dark, 0.3 * fat, shinLen * 0.88, 0.3 * fat, 0, -shinLen * 0.42, reverse ? -0.08 : 0);
  add(knee, geo.box, mats.dark, 0.32 * fat, shinLen * 0.85, 0.34, 0, -shinLen * 0.42, reverse ? -0.08 : 0);
  add(knee, geo.plate, mats.armor, 0.52 * fat, shinLen * 0.9, 0.56, 0, -shinLen * 0.4, reverse ? -0.1 : 0.04);
  add(knee, geo.plate, mats.trim, 0.18, shinLen * 0.55, 0.16, side * 0.24, -shinLen * 0.42, 0.24);
  piston(knee, mats, side * 0.2, -shinLen * 0.42, 0.18, shinLen * 0.75, side);
  if (detail) {
    vent(knee, mats, 0, -shinLen * 0.36, 0.34, 0.3, 0.38, 3);
    add(knee, geo.cyl, mats.rubber, 0.12, 0.12, 0.4, side * 0.18, -shinLen * 0.18, 0.16, Math.PI / 2, 0, 0);
  }

  const foot = new THREE.Group();
  foot.position.set(0, -shinLen + 0.16, reverse ? -0.14 : 0.06);
  knee.add(foot);
  add(foot, geo.sphere, mats.dark, 0.32, 0.32, 0.32, 0, 0.16, 0);
  add(foot, geo.box, mats.dark, 0.72 * fat, 0.2, 1.08, 0, 0.08, 0.16);
  add(foot, geo.plate, mats.armor, 0.86 * fat, 0.26, 1.28, 0, 0.12, 0.22);
  add(foot, geo.plate, mats.trim, 0.26, 0.14, 0.52, -0.28 * fat, 0.16, 0.62);
  add(foot, geo.plate, mats.trim, 0.26, 0.14, 0.52, 0.28 * fat, 0.16, 0.62);
  add(foot, geo.box, mats.dark, 0.7 * fat, 0.1, 0.28, 0, 0.04, 0.72);
  add(foot, geo.box, mats.armor, 0.22, 0.12, 0.34, 0, 0.2, -0.46);
  add(foot, geo.box, mats.emit, 0.18, 0.05, 0.3, 0, 0.24, -0.44);
  add(foot, geo.cylR, mats.heat, 0.22, 0.18, 0.22, 0, 0.06, -0.52, Math.PI / 2, 0, 0);
  if (heavy) {
    add(foot, geo.plate, mats.trim, 0.2, 0.12, 0.4, 0, 0.16, 0.78);
    add(foot, geo.plate, mats.armor, 0.95, 0.18, 0.4, 0, 0.08, -0.18);
  }
  if (detail) {
    add(foot, geo.cyl, mats.hyd, 0.08, 0.22, 0.08, -0.22, 0.28, 0.18);
    add(foot, geo.cyl, mats.hyd, 0.08, 0.22, 0.08, 0.22, 0.28, 0.18);
  }
  return { knee, foot };
}

function buildTorso(torso: THREE.Group, chassis: ChassisId, wide: number, mats: Mats, detail: boolean, wrecked: boolean) {
  add(torso, geo.box, mats.dark, 1.85 * wide, 1.62, 1.12, 0, 1.0, -0.02);
  add(torso, geo.plate, mats.armor, 2.02 * wide, 0.92, 1.35, 0, 0.22, 0.04);
  add(torso, geo.plate, mats.armor, 2.28 * wide, 1.55, 1.42, 0, 1.18, 0.02);
  add(torso, geo.plate, mats.accent, 1.9 * wide, 0.18, 1.5, 0, 1.78, 0.08);
  add(torso, geo.plate, mats.trim, 2.15 * wide, 0.24, 0.72, 0, 0.48, 0.16);
  add(torso, geo.plate, mats.armor, 0.78, 1.15, 1.35, -0.95 * wide, 1.18, 0.04);
  add(torso, geo.plate, mats.armor, 0.78, 1.15, 1.35, 0.95 * wide, 1.18, 0.04);
  add(torso, geo.plate, mats.armor, 0.9, 0.48, 1.05, -0.92 * wide, 1.68, 0.02);
  add(torso, geo.plate, mats.armor, 0.9, 0.48, 1.05, 0.92 * wide, 1.68, 0.02);

  add(torso, geo.cyl, mats.dark, 0.52, 0.52, 1.35, -0.38 * wide, 1.4, 0.06, 0, 0, Math.PI / 2);
  add(torso, geo.cyl, mats.dark, 0.52, 0.52, 1.35, 0.38 * wide, 1.4, 0.06, 0, 0, Math.PI / 2);
  add(torso, geo.cyl, mats.dark, 0.34, 0.34, 1.7 * wide, 0, 1.42, 0.06, 0, 0, Math.PI / 2);
  add(torso, geo.sphere, mats.accent, 0.86, 0.86, 0.86, -0.58 * wide, 1.4, 0.08);
  add(torso, geo.sphere, mats.accent, 0.86, 0.86, 0.86, 0.58 * wide, 1.4, 0.08);
  add(torso, geo.plate, mats.armor, 1.12, 0.95, 1.22, -0.42 * wide, 1.28, 0.06);
  add(torso, geo.plate, mats.armor, 1.12, 0.95, 1.22, 0.42 * wide, 1.28, 0.06);
  add(torso, geo.plate, mats.trim, 1.85 * wide, 0.32, 0.85, 0, 1.56, 0.04);
  add(torso, geo.plate, mats.armor, 1.65 * wide, 0.42, 0.85, 0, 1.48, -0.22);
  add(torso, geo.plate, mats.armor, 1.35 * wide, 0.55, 0.55, 0, 1.28, -0.15);
  add(torso, geo.plate, mats.armor, 0.55, 0.7, 0.7, -0.72 * wide, 1.05, 0.08);
  add(torso, geo.plate, mats.armor, 0.55, 0.7, 0.7, 0.72 * wide, 1.05, 0.08);
  add(torso, geo.sphere, mats.dark, 0.7, 0.85, 0.7, -0.52 * wide, 1.18, 0.06);
  add(torso, geo.sphere, mats.dark, 0.7, 0.85, 0.7, 0.52 * wide, 1.18, 0.06);
  add(torso, geo.plate, mats.armor, 0.7, 0.95, 0.85, -0.62 * wide, 1.08, 0.08);
  add(torso, geo.plate, mats.armor, 0.7, 0.95, 0.85, 0.62 * wide, 1.08, 0.08);

  add(torso, geo.cyl, mats.dark, 0.46, 0.55, 0.46, 0, 1.62, 0.08);
  add(torso, geo.torus, mats.trim, 0.48, 0.48, 0.48, 0, 1.58, 0.1, Math.PI / 2, 0, 0);
  add(torso, geo.plate, mats.armor, 0.7, 0.28, 0.6, 0, 1.78, 0.08);

  add(torso, geo.box, mats.dark, 1.48, 0.82, 0.55, 0, 1.32, 0.62);
  add(torso, geo.plate, mats.armor, 1.22, 0.42, 0.18, 0, 1.12, 0.82);
  add(torso, geo.hard, mats.glass, 1.02, 0.48, 0.1, 0, 1.52, 0.92);
  add(torso, geo.box, mats.emit, 0.78, 0.05, 0.06, 0, 1.24, 0.98);
  add(torso, geo.box, mats.emit, 0.08, 0.38, 0.05, -0.58, 1.5, 0.96);
  add(torso, geo.box, mats.emit, 0.08, 0.38, 0.05, 0.58, 1.5, 0.96);

  add(torso, geo.box, mats.dark, 1.58, 0.92, 0.7, 0, 1.08, -0.92);
  add(torso, geo.cyl, mats.trim, 0.24, 0.24, 0.72, 0, 1.72, -0.52);
  add(torso, geo.plate, mats.armor, 1.15, 0.58, 0.92, 0, 0.6, -0.52);

  if (chassis === "colossus") {
    add(torso, geo.plate, mats.armor, 2.62, 0.52, 1.72, 0, 0.42, 0.04);
    add(torso, geo.plate, mats.trim, 2.05, 0.85, 0.32, 0, 1.05, 0.78);
    add(torso, geo.plate, mats.stripe, 0.7, 0.12, 1.4, 0, 0.62, 0.7);
  }
  if (chassis === "phantom") {
    add(torso, geo.plate, mats.armor, 1.55, 0.22, 1.7, 0, 1.82, -0.15, 0.35);
    add(torso, geo.plate, mats.trim, 0.18, 1.4, 1.15, -0.95, 1.1, -0.2, 0, 0, 0.25);
    add(torso, geo.plate, mats.trim, 0.18, 1.4, 1.15, 0.95, 1.1, -0.2, 0, 0, -0.25);
  }
  if (chassis === "reaper") {
    add(torso, geo.plate, mats.armor, 1.55, 0.7, 1.15, 0, 1.25, 0.35);
    add(torso, geo.box, mats.dark, 0.7, 0.28, 0.9, 0, 0.75, 0.55);
  }
  if (detail) {
    vent(torso, mats, -0.62 * wide, 0.7, 0.72, 0.32, 0.4, 3);
    vent(torso, mats, 0.62 * wide, 0.7, 0.72, 0.32, 0.4, 3);
    add(torso, geo.cyl, mats.rubber, 0.08, 0.08, 0.55, -0.78 * wide, 1.45, 0.15, 0, 0, Math.PI / 2);
    add(torso, geo.cyl, mats.rubber, 0.08, 0.08, 0.55, 0.78 * wide, 1.45, 0.15, 0, 0, Math.PI / 2);
  }
  if (!wrecked) {
    add(torso, geo.hard, mats.mark, 0.42, 0.42, 0.02, -0.98 * wide, 1.25, 0.8);
  }
}

function buildBackpack(
  torso: THREE.Group,
  chassis: ChassisId,
  mats: Mats,
  thrusters: THREE.Mesh[],
  detail: boolean,
) {
  add(torso, geo.box, mats.dark, 1.35, 1.05, 0.62, 0, 1.05, -1.12);
  add(torso, geo.plate, mats.armor, 1.48, 1.12, 0.48, 0, 1.08, -1.28);
  if (detail) {
    for (let i = 0; i < 5; i++) {
      add(torso, geo.hard, mats.trim, 1.05, 0.05, 0.28, 0, 0.62 + i * 0.16, -1.42);
    }
  }

  const twin = chassis === "phantom" ? 3 : 2;
  const spread = chassis === "colossus" ? 0.58 : 0.48;
  for (let i = 0; i < twin; i++) {
    const x = twin === 3 ? (i - 1) * spread : (i === 0 ? -1 : 1) * spread;
    const y = 0.72;
    const z = -1.22;
    add(torso, geo.cyl, mats.dark, 0.46, 0.46, 0.32, x, y, z + 0.28, Math.PI / 2, 0, 0);
    const bell = add(torso, geo.nozzle, mats.heat, 0.85, 0.85, 0.85, x, y, z - 0.12, Math.PI / 2, 0, 0);
    thrusters.push(bell);
    add(torso, geo.cyl, mats.emit, 0.16, 0.16, 0.08, x, y, z - 0.18, Math.PI / 2, 0, 0);
  }
  if (chassis === "colossus") {
    const extra = add(torso, geo.nozzle, mats.heat, 0.7, 0.7, 0.7, 0, 0.32, -1.35, Math.PI / 2, 0, 0);
    thrusters.push(extra);
  }
}

function buildHead(
  head: THREE.Group,
  chassis: ChassisId,
  mats: Mats,
  wrecked: boolean,
  detail: boolean,
): THREE.Object3D | null {
  add(head, geo.cyl, mats.dark, 0.42, 0.28, 0.42, 0, 0.02, 0);
  add(head, geo.box, mats.dark, 0.58, 0.42, 0.55, 0, 0.22, -0.04);
  add(head, geo.plate, mats.accent, 0.78, 0.5, 0.74, 0, 0.28, 0.02);
  add(head, geo.hard, mats.glass, 0.56, 0.16, 0.12, 0, 0.26, 0.4);
  add(head, geo.box, mats.emit, 0.48, 0.06, 0.08, 0, 0.26, 0.42);
  add(head, geo.box, mats.armor, 0.82, 0.12, 0.7, 0, 0.54, -0.02);

  let antenna: THREE.Object3D | null = null;
  if (chassis === "titan") {
    add(head, geo.cyl, mats.trim, 0.07, 0.07, 0.7, 0.26, 0.68, -0.04);
    const tip = add(head, geo.sphere, mats.emit, 0.12, 0.12, 0.12, 0.26, 1.02, -0.04);
    antenna = tip;
    add(head, geo.cyl, mats.lens, 0.1, 0.1, 0.08, -0.22, 0.32, 0.38, Math.PI / 2, 0, 0);
  } else if (chassis === "reaper") {
    add(head, geo.box, mats.dark, 0.95, 0.1, 0.32, 0, 0.5, 0.12);
    add(head, geo.cyl, mats.dark, 0.08, 0.08, 0.85, 0, 0.4, 0.72, Math.PI / 2, 0, 0);
    add(head, geo.cyl, mats.lens, 0.14, 0.14, 0.08, 0, 0.4, 1.12, Math.PI / 2, 0, 0);
    add(head, geo.cyl, mats.trim, 0.06, 0.9, 0.06, -0.28, 0.9, -0.1);
    antenna = add(head, geo.sphere, mats.emit, 0.1, 0.1, 0.1, -0.28, 1.32, -0.1);
  } else if (chassis === "colossus") {
    add(head, geo.plate, mats.armor, 0.95, 0.55, 0.85, 0, 0.32, 0);
    add(head, geo.cyl, mats.lens, 0.16, 0.16, 0.1, -0.22, 0.32, 0.46, Math.PI / 2, 0, 0);
    add(head, geo.cyl, mats.lens, 0.16, 0.16, 0.1, 0.22, 0.32, 0.46, Math.PI / 2, 0, 0);
    add(head, geo.box, mats.trim, 0.12, 0.55, 0.12, 0.32, 0.76, -0.1);
    antenna = add(head, geo.box, mats.emit, 0.08, 0.08, 0.08, 0.32, 1.04, -0.1);
  } else {
    add(head, geo.plate, mats.armor, 0.1, 0.78, 0.98, 0, 0.5, -0.12, 0.42);
    add(head, geo.box, mats.emit, 0.06, 0.5, 0.08, 0, 0.46, 0.4);
    add(head, geo.cyl, mats.trim, 0.05, 0.85, 0.05, 0.22, 0.88, -0.18, 0.3);
    antenna = add(head, geo.sphere, mats.emit, 0.09, 0.09, 0.09, 0.22, 1.28, -0.32);
  }
  if (wrecked) {
    mats.emit.emissiveIntensity = 0.3;
    antenna = null;
  }
  if (detail && chassis !== "reaper") {
    add(head, geo.box, mats.dark, 0.18, 0.12, 0.22, -0.28, 0.12, 0.18);
  }
  return antenna;
}

function buildPauldron(sh: THREE.Group, side: number, chassis: ChassisId, mats: Mats, detail: boolean) {
  joint(sh, mats, 0.78, 0, 0.04, 0);
  add(sh, geo.cyl, mats.dark, 0.5, 0.85, 0.5, 0, -0.32, 0.02);
  add(sh, geo.plate, mats.armor, 1.18, 0.82, 1.28, -side * 0.22, 0.12, 0.04);
  add(sh, geo.plate, mats.armor, 0.95, 0.55, 1.05, -side * 0.32, 0.28, 0.02);
  add(sh, geo.plate, mats.trim, 0.92, 0.16, 1.08, -side * 0.16, 0.42, 0.04);
  add(sh, geo.box, mats.emit, 0.12, 0.06, 0.7, side * 0.28, 0.36, 0.1);
  add(sh, geo.plate, mats.armor, 0.82, 1.05, 0.95, side * 0.02, -0.42, 0.04);
  add(sh, geo.plate, mats.armor, 0.9, 0.7, 0.95, -side * 0.2, -0.08, -0.12);
  add(sh, geo.box, mats.dark, 0.52, 0.7, 0.55, 0, -0.28, 0.02);
  add(sh, geo.plate, mats.armor, 0.62, 0.55, 0.72, 0, -0.62, 0.04);
  add(sh, geo.cyl, mats.rubber, 0.22, 0.4, 0.22, 0, -0.55, 0.02);
  if (chassis === "colossus") {
    add(sh, geo.plate, mats.trim, 1.12, 0.85, 1.5, side * 0.08, 0.32, 0);
    add(sh, geo.plate, mats.stripe, 0.9, 0.08, 1.2, side * 0.06, 0.72, 0.02);
  }
  if (chassis === "phantom") {
    add(sh, geo.plate, mats.armor, 0.95, 0.22, 1.45, side * 0.04, 0.28, -0.12, 0.35);
  }
  if (chassis === "titan" || chassis === "colossus") {
    add(sh, geo.cyl, mats.dark, 0.32, 0.32, 1.05, side * 0.1, 0.38, -0.28, Math.PI / 2, 0, 0);
    add(sh, geo.cone, mats.trim, 0.22, 0.28, 0.22, side * 0.1, 0.38, -0.8, Math.PI / 2, 0, 0);
  }
  if (detail) {
    add(sh, geo.hex, mats.hyd, 0.12, 0.06, 0.12, side * 0.22, 0.22, 0.4);
    vent(sh, mats, side * 0.06, 0.02, 0.56, 0.5, 0.26, 3);
    cable(sh, mats, side * 0.04, -0.22, 0.16, 0.5, 0.35);
  }
}

function buildArm(arm: THREE.Group, side: number, mats: Mats, detail: boolean) {
  add(arm, geo.sphere, mats.accent, 0.62, 0.62, 0.62, 0, 0.28, 0.02);
  add(arm, geo.cyl, mats.dark, 0.42, 1.18, 0.42, 0, -0.18, 0.03);
  add(arm, geo.plate, mats.armor, 0.58, 1.08, 0.56, 0, -0.12, 0.05);
  add(arm, geo.plate, mats.trim, 0.22, 0.7, 0.22, side * 0.22, -0.16, 0.18);
  piston(arm, mats, side * 0.16, -0.22, 0.14, 0.78, side);
  if (detail) cable(arm, mats, side * 0.12, -0.24, 0.18, 0.62, 0.1);

  const fore = new THREE.Group();
  fore.position.set(0, -0.78, 0.05);
  arm.add(fore);
  joint(fore, mats, 0.52, 0, 0.12, 0);
  add(fore, geo.cyl, mats.dark, 0.38, 0.95, 0.38, 0, -0.22, 0.06);
  add(fore, geo.box, mats.dark, 0.44, 0.82, 0.44, 0, -0.22, 0.08);
  add(fore, geo.plate, mats.armor, 0.56, 0.88, 0.54, 0, -0.2, 0.1);
  add(fore, geo.cyl, mats.hyd, 0.1, 0.1, 0.38, side * 0.2, -0.18, 0.16, Math.PI / 2, 0, 0);
  add(fore, geo.cyl, mats.dark, 0.46, 0.28, 0.46, 0, -0.48, 0.16);
  add(fore, geo.box, mats.dark, 0.36, 0.24, 0.5, 0, -0.42, 0.28);
  if (detail) {
    add(fore, geo.box, mats.trim, 0.16, 0.38, 0.12, side * 0.24, -0.2, 0.24);
    vent(fore, mats, 0, -0.12, 0.34, 0.26, 0.28, 3);
  }
  return fore;
}

function attachWeapon(
  arm: THREE.Group,
  id: string,
  mats: Mats,
  muzzle: THREE.Object3D,
  flashes: THREE.Sprite[],
  muzzleLights: THREE.PointLight[],
  detail: boolean,
) {
  const g = new THREE.Group();
  g.position.set(0, -0.38, 0.22);
  arm.add(g);
  add(g, geo.cyl, mats.dark, 0.48, 0.32, 0.48, 0, 0.2, 0.02);
  add(g, geo.box, mats.dark, 0.36, 0.28, 0.55, 0, 0.12, 0.08);
  add(g, geo.cyl, mats.hyd, 0.14, 0.14, 0.28, 0, 0.08, 0.18, Math.PI / 2, 0, 0);
  add(g, geo.plate, mats.armor, 0.42, 0.24, 0.48, 0, 0.14, 0.02);

  if (id === "assault" || id === "smg") {
    const compact = id === "smg";
    add(g, geo.box, mats.dark, 0.22, 0.22, compact ? 0.8 : 1.05, 0, 0, 0.18);
    add(g, geo.plate, mats.armor, 0.34, 0.28, compact ? 0.7 : 0.95, 0, 0.02, 0.02);
    add(g, geo.cyl, mats.dark, 0.12, 0.12, compact ? 0.85 : 1.15, 0, 0.02, compact ? 0.72 : 0.92, Math.PI / 2, 0, 0);
    add(g, geo.cyl, mats.trim, 0.16, 0.16, 0.18, 0, 0.02, compact ? 1.12 : 1.48, Math.PI / 2, 0, 0);
    add(g, geo.box, mats.emit, 0.07, 0.05, 0.42, 0, 0.18, 0.22);
    add(g, geo.box, mats.dark, 0.12, 0.28, 0.22, 0, -0.22, -0.05);
    if (detail) {
      add(g, geo.cyl, mats.lens, 0.08, 0.08, 0.22, 0.12, 0.16, 0.15, Math.PI / 2, 0, 0);
      add(g, geo.hard, mats.trim, 0.28, 0.04, compact ? 0.7 : 1.0, 0, 0.16, 0.35);
    }
    muzzle.position.set(0, 0.02, compact ? 1.22 : 1.58);
  } else if (id === "rail") {
    add(g, geo.cyl, mats.dark, 0.16, 0.16, 2.65, 0, 0, 0.7, Math.PI / 2, 0, 0);
    add(g, geo.cyl, mats.hyd, 0.1, 0.1, 2.4, 0, 0.12, 0.7, Math.PI / 2, 0, 0);
    add(g, geo.plate, mats.armor, 0.46, 0.4, 0.82, 0, 0, -0.12);
    add(g, geo.box, mats.emit, 0.08, 0.08, 1.15, 0, 0.18, 0.8);
    for (let i = 0; i < 4; i++) {
      add(g, geo.torus, mats.trim, 0.28, 0.28, 0.28, 0, 0, 0.15 + i * 0.48, Math.PI / 2, 0, 0);
    }
    add(g, geo.cyl, mats.lens, 0.12, 0.12, 0.1, 0, 0.22, 0.05, Math.PI / 2, 0, 0);
    muzzle.position.set(0, 0, 2.12);
  } else if (id === "cannon") {
    add(g, geo.cyl, mats.dark, 0.48, 0.48, 1.75, 0, 0, 0.55, Math.PI / 2, 0, 0);
    add(g, geo.cylR, mats.armor, 0.58, 0.58, 0.7, 0, 0, -0.08, Math.PI / 2, 0, 0);
    add(g, geo.cyl, mats.trim, 0.36, 0.36, 0.22, 0, 0, 1.22, Math.PI / 2, 0, 0);
    add(g, geo.cyl, mats.emit, 0.2, 0.2, 0.16, 0, 0, 1.42, Math.PI / 2, 0, 0);
    add(g, geo.box, mats.dark, 0.55, 0.42, 0.55, 0, -0.12, -0.22);
    if (detail) {
      add(g, geo.torus, mats.hyd, 0.52, 0.52, 0.52, 0, 0, 0.35, Math.PI / 2, 0, 0);
      add(g, geo.hex, mats.trim, 0.18, 0.1, 0.18, 0.28, 0.12, 0.05);
    }
    muzzle.position.set(0, 0, 1.62);
  } else if (id === "missiles") {
    add(g, geo.plate, mats.armor, 0.82, 0.52, 1.05, 0, 0.08, 0.12);
    const tubes = [
      [-0.22, 0.16],
      [0.22, 0.16],
      [-0.22, -0.04],
      [0.22, -0.04],
    ];
    for (const [tx, ty] of tubes) {
      add(g, geo.cyl, mats.dark, 0.18, 0.18, 1.05, tx, ty, 0.48, Math.PI / 2, 0, 0);
      add(g, geo.cone, mats.trim, 0.18, 0.2, 0.18, tx, ty, 1.04, Math.PI / 2, 0, 0);
      add(g, geo.cyl, mats.emit, 0.06, 0.06, 0.06, tx, ty, 0.14, Math.PI / 2, 0, 0);
    }
    if (detail) add(g, geo.hard, mats.mark, 0.32, 0.32, 0.02, 0, 0.34, 0.28, -0.4);
    muzzle.position.set(0, 0.08, 1.12);
  } else if (id === "plasma") {
    add(g, geo.plate, mats.armor, 0.38, 0.38, 1.22, 0, 0, 0.32);
    add(g, geo.cyl, mats.dark, 0.22, 0.22, 0.85, 0, 0, 0.55, Math.PI / 2, 0, 0);
    add(g, geo.torus, mats.hyd, 0.32, 0.32, 0.32, 0, 0, 0.85, Math.PI / 2, 0, 0);
    add(g, geo.sphere, mats.emit, 0.36, 0.36, 0.36, 0, 0, 1.12);
    add(g, geo.cyl, mats.lens, 0.14, 0.14, 0.1, 0, 0, 1.32, Math.PI / 2, 0, 0);
    if (detail) {
      add(g, geo.cyl, mats.trim, 0.08, 0.08, 0.55, 0.16, 0.12, 0.4, Math.PI / 2, 0, 0);
      add(g, geo.cyl, mats.trim, 0.08, 0.08, 0.55, -0.16, 0.12, 0.4, Math.PI / 2, 0, 0);
    }
    muzzle.position.set(0, 0, 1.38);
  } else if (id === "blade") {
    add(g, geo.box, mats.dark, 0.18, 0.24, 0.48, 0, 0, 0.08);
    add(g, geo.cyl, mats.hyd, 0.1, 0.1, 0.22, 0, 0, 0.32, Math.PI / 2, 0, 0);
    add(g, geo.plate, mats.emit, 0.06, 0.78, 1.85, 0, 0.08, 1.1);
    add(g, geo.hard, mats.accent, 0.03, 0.7, 1.7, 0, 0.08, 1.1);
    add(g, geo.box, mats.emit, 0.08, 0.08, 0.16, 0, 0.08, 0.42);
    muzzle.position.set(0, 0.08, 1.88);
  } else if (id === "rotary") {
    add(g, geo.cyl, mats.trim, 0.52, 0.52, 0.42, 0, 0, 0.08, Math.PI / 2, 0, 0);
    add(g, geo.cyl, mats.dark, 0.38, 0.38, 1.15, 0, 0, 0.7, Math.PI / 2, 0, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add(g, geo.cyl, mats.trim, 0.09, 0.09, 1.05, Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.78, Math.PI / 2, 0, 0);
    }
    add(g, geo.cyl, mats.emit, 0.08, 0.08, 0.08, 0, 0, 1.28, Math.PI / 2, 0, 0);
    muzzle.position.set(0, 0, 1.38);
  } else if (id === "core") {
    add(g, geo.cyl, mats.dark, 0.42, 0.42, 0.55, 0, 0, 0.18, Math.PI / 2, 0, 0);
    add(g, geo.torus, mats.emit, 0.38, 0.38, 0.38, 0, 0, 0.55, Math.PI / 2, 0, 0);
    add(g, geo.sphere, mats.lens, 0.32, 0.32, 0.18, 0, 0, 0.72);
    add(g, geo.sphere, mats.emit, 0.12, 0.12, 0.12, 0, 0, 0.82);
    muzzle.position.set(0, 0, 0.95);
  } else if (id === "flak") {
    add(g, geo.plate, mats.armor, 0.64, 0.46, 1.02, 0, 0, 0.22);
    add(g, geo.cyl, mats.dark, 0.2, 0.2, 0.85, -0.16, 0.02, 0.76, Math.PI / 2, 0, 0);
    add(g, geo.cyl, mats.dark, 0.2, 0.2, 0.85, 0.16, 0.02, 0.76, Math.PI / 2, 0, 0);
    add(g, geo.cyl, mats.trim, 0.24, 0.24, 0.14, -0.16, 0.02, 1.16, Math.PI / 2, 0, 0);
    add(g, geo.cyl, mats.trim, 0.24, 0.24, 0.14, 0.16, 0.02, 1.16, Math.PI / 2, 0, 0);
    add(g, geo.cyl, mats.dark, 0.42, 0.22, 0.42, 0, -0.22, 0);
    if (detail) add(g, geo.box, mats.emit, 0.5, 0.04, 0.12, 0, 0.24, 0.4);
    muzzle.position.set(0, 0, 1.26);
  } else {
    add(g, geo.box, mats.dark, 0.28, 0.28, 1.2, 0, 0, 0.35);
    muzzle.position.set(0, 0, 1.05);
  }

  const flash = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: muzzleTex,
      color: 0xffe6b0,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  flash.scale.set(1.8, 1.8, 1);
  flash.position.copy(muzzle.position);
  flash.visible = false;
  const flash2 = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: muzzleTex,
      color: 0xffc878,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  flash2.scale.set(0.55, 2.4, 1);
  flash2.position.copy(muzzle.position);
  flash2.visible = false;
  g.add(muzzle);
  g.add(flash);
  g.add(flash2);
  flashes.push(flash, flash2);
  const light = new THREE.PointLight(0xffe2b0, 0, 8, 2);
  light.position.copy(muzzle.position);
  light.visible = false;
  g.add(light);
  muzzleLights.push(light);
  return g;
}

export function poseMech(
  rig: MechRig,
  walk: number,
  speed: number,
  torso: number,
  pitch: number,
  boost: boolean,
  fire: number,
  jumping = false,
  alt = 0,
  time = 0,
  special = 0,
  shieldUp = false,
  shield = 0,
) {
  const reverse = rig.chassis === "reaper";
  const moving = Math.abs(speed) > 0.45;
  const stride = moving ? walk : 0;
  const L = Math.sin(stride);
  const R = Math.sin(stride + Math.PI);
  const passL = Math.max(0, -Math.cos(stride));
  const passR = Math.max(0, -Math.cos(stride + Math.PI));
  const amp = jumping ? 0.14 : moving ? Math.min(0.5, 0.2 + Math.abs(speed) * 0.02) : 0;
  const idle = !moving && !jumping ? Math.sin(time * 1.12) : 0;
  const breath = Math.sin(time * 1.35) * 0.016;
  const aim = -pitch * 0.38;

  // +Y up, +Z forward. Hip/knee rotation.x: +X swings a downward limb FORWARD.
  // Humanoid knees must flex BACKWARD (negative X). Reverse-joint (Reaper)
  // knees flex FORWARD (positive X).
  const stanceHip = reverse ? -0.26 : 0.16;
  const stanceKnee = reverse ? 0.82 : -0.52;
  const jumpHip = jumping ? 0.38 : boost ? 0.16 : 0;
  const jumpKnee = jumping ? (reverse ? 0.22 : -0.42) : 0;

  rig.leftHip.position.y = 0.02 + passL * (moving ? 0.14 : 0) + (jumping ? 0.08 : 0);
  rig.rightHip.position.y = 0.02 + passR * (moving ? 0.14 : 0) + (jumping ? 0.08 : 0);
  rig.leftHip.rotation.set(
    stanceHip + L * amp + jumpHip + idle * 0.035,
    L * amp * 0.1,
    reverse ? 0.06 : 0.04,
  );
  rig.rightHip.rotation.set(
    stanceHip + R * amp + jumpHip - idle * 0.035,
    R * amp * 0.1,
    reverse ? -0.06 : -0.04,
  );

  const kneeFlex = reverse ? 1.05 : -1.45;
  rig.leftKnee.rotation.x = stanceKnee + passL * amp * kneeFlex + jumpKnee;
  rig.rightKnee.rotation.x = stanceKnee + passR * amp * kneeFlex + jumpKnee;
  rig.leftFoot.rotation.x =
    -rig.leftHip.rotation.x * 0.55 - rig.leftKnee.rotation.x * 0.45 + (moving ? passL * 0.12 : 0.04);
  rig.rightFoot.rotation.x =
    -rig.rightHip.rotation.x * 0.55 - rig.rightKnee.rotation.x * 0.45 + (moving ? passR * 0.12 : 0.04);

  rig.body.position.y = breath + (moving ? Math.abs(L) * 0.1 : 0) + (jumping ? 0.1 : 0);
  rig.body.rotation.y = moving ? L * 0.05 : 0;
  rig.body.rotation.z = (moving ? L : idle) * 0.055;
  rig.body.rotation.x = boost ? 0.08 : jumping ? -0.04 : 0;

  rig.torso.rotation.y = torso - L * (moving ? 0.04 : 0);
  rig.torso.rotation.x = pitch * 0.2 + (boost ? 0.16 : 0) + (jumping ? 0.05 : 0) + breath;
  rig.torso.rotation.z = L * amp * 0.05 + idle * 0.02;
  rig.head.rotation.x = pitch * 0.42;
  rig.head.rotation.y = torso * 0.18;
  rig.head.rotation.z = 0;

  const swing = moving ? 0.08 : 0;
  const titan = rig.chassis === "titan";
  if (titan) {
    // Hang rotaries beside the spherical torso — matches the planted reference stance.
    rig.rightShoulder.rotation.set(0.06 + aim * 0.36 - fire * 0.08 + R * swing * 0.3, 0.06, 0.16);
    rig.leftShoulder.rotation.set(0.06 + aim * 0.36 - fire * 0.08 + L * swing * 0.3, -0.06, -0.16);
    rig.rightArm.rotation.set(-1.18 + aim * 0.16 - fire * 0.04, 0.02, 0.08);
    rig.leftArm.rotation.set(-1.18 + aim * 0.16 - fire * 0.04, -0.02, -0.08);
    rig.rightFore.rotation.set(0.12 + fire * 0.03, 0, 0.03);
    rig.leftFore.rotation.set(0.12 + fire * 0.03, 0, -0.03);
    rig.rightGun.rotation.set(0.35, 0, 0);
    rig.leftGun.rotation.set(0.35, 0, 0);
  } else {
    const raise = -1.22;
    const crook = 0.82;
    rig.rightShoulder.rotation.set(
      -0.32 + aim * 0.42 - fire * 0.24 + R * swing,
      0.06 + fire * 0.04,
      0.1,
    );
    rig.leftShoulder.rotation.set(
      -0.28 + aim * 0.3 - alt * 0.18 + L * swing,
      -0.06 - alt * 0.04,
      -0.1,
    );
    rig.rightArm.rotation.set(raise + aim * 0.2 - fire * 0.28 + R * swing * 0.35, 0.02, 0.08);
    rig.leftArm.rotation.set(raise + 0.1 + aim * 0.1 - alt * 0.22 + L * swing * 0.35, -0.02, -0.08);
    rig.rightFore.rotation.set(crook + fire * 0.16, 0, 0.04);
    rig.leftFore.rotation.set(crook * 0.92 + alt * 0.12, 0, -0.04);
    rig.rightGun.rotation.set(-fire * 0.72, 0, 0);
    rig.leftGun.rotation.set(-alt * 0.72, 0, 0);
    rig.rightGun.position.z = 0.22 - fire * 0.18;
    rig.leftGun.position.z = 0.22 - alt * 0.18;
  }

  if (rig.antenna) rig.antenna.rotation.z = Math.sin((moving ? stride : time) * 0.7) * 0.12;
  const thrust = boost || jumping;
  for (const t of rig.thrusters) {
    const mat = t.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = thrust ? 3.6 : 0.22 + Math.abs(breath) * 2;
    t.scale.y = thrust ? 1.55 : 1;
  }
  for (let i = 0; i < rig.flashes.length; i++) {
    const v = titan ? (i < 2 ? fire : special) : i < 2 ? fire : alt;
    const f = rig.flashes[i];
    f.visible = v > 0.015;
    if (!f.visible) continue;
    const streak = i % 2 === 1;
    const pulse = 0.75 + Math.sin(time * 90) * 0.25;
    f.scale.set(
      streak ? 0.55 + v * 3.2 : (1.8 + v * 11) * pulse,
      streak ? 3.4 + v * 10 : (1.8 + v * 11) * pulse,
      1,
    );
    f.material.rotation = streak ? 0 : time * 22;
    (f.material as THREE.SpriteMaterial).opacity = Math.min(1, 0.55 + v * 3);
  }
  for (let i = 0; i < rig.muzzleLights.length; i++) {
    const v = titan ? fire : i === 0 ? fire : alt;
    const on = v > 0.015;
    rig.muzzleLights[i].visible = on;
    rig.muzzleLights[i].intensity = on ? 8 + v * 28 : 0;
  }
  if (titan) poseTitanExtras(rig, fire, special, shieldUp, shield, time);
}
