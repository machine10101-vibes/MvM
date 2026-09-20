import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  makeCyclopsIrisMap,
  makeHexCellMap,
  makeMuzzleSprite,
  makeTitanHullMap,
  sharedArmor,
  sharedMetal,
} from "./textures";
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
const hullMap = makeTitanHullMap();
const irisMap = makeCyclopsIrisMap();
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
  const glow = wrecked ? 0x331010 : 0xff2a22;
  // Lambert keeps plate albedo readable on software GL (no IBL / metal crush).
  const lam = (color: number, map: THREE.Texture | null, emit = 0x000000, emitI = 0) =>
    new THREE.MeshLambertMaterial({
      color,
      map: map ?? undefined,
      emissive: emit,
      emissiveIntensity: emitI,
    });
  return {
    armor: lam(wrecked ? 0x3a3a3e : 0x6e767e, hullMap.map, wrecked ? 0x101012 : 0x1a1e22, wrecked ? 0.04 : 0.12),
    armorB: lam(wrecked ? 0x242428 : 0x3a4248, hullMap.map, 0x101214, 0.08),
    armorC: lam(wrecked ? 0x323236 : 0x5c646c, armorT.map, 0x16181c, 0.08),
    plate: lam(0x2c3238, metal.map, 0x0c0e10, 0.06),
    dark: lam(0x1a1c20, metal.map, 0x08090c, 0.04),
    trim: lam(0x6a727a, metal.map, 0x141618, 0.06),
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
      emissiveIntensity: wrecked ? 0.25 : 3.4,
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
    iris: new THREE.MeshStandardMaterial({
      map: irisMap,
      color: 0xffffff,
      emissive: glow,
      emissiveMap: irisMap,
      emissiveIntensity: wrecked ? 0.3 : 2.6,
      metalness: 0.12,
      roughness: 0.28,
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
  add(hips, geo.soft, m.dark, 1.55, 0.44, 1.05, 0, 0.06, 0);
  add(hips, geo.soft, m.armor, 1.72, 0.48, 1.18, 0, 0.3, 0.04);
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
  muzzleChest.position.set(0, 1.54, 1.58);
  torso.add(muzzleChest);

  const head = new THREE.Group();
  head.position.set(0, 1.88, 0.22);
  torso.add(head);

  // Missile pods live on the torso so they stay planted like the reference.
  buildMissilePod(torso, -1, m, detail);
  buildMissilePod(torso, 1, m, detail);

  const lShoulder = new THREE.Group();
  lShoulder.position.set(-1.38, 1.28, 0.1);
  torso.add(lShoulder);
  const rShoulder = new THREE.Group();
  rShoulder.position.set(1.38, 1.28, 0.1);
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
  add(torso, geo.soft, m.dark, 0.72, 0.48, 0.36, 0, 1.12, -1.28);
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
  shieldMesh.position.set(0, 1.5, 0);
  shieldMesh.visible = false;
  body.add(shieldMesh);

  const lights: THREE.PointLight[] = [];
  if (!wrecked) {
    const eye = new THREE.PointLight(m.glow, 3.2, 12);
    eye.position.set(0, 1.54, 1.62);
    torso.add(eye);
    lights.push(eye);
    const crown = new THREE.PointLight(m.glow, 1.4, 8);
    crown.position.set(0, 2.88, 0.04);
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

const HULL = { x: 0, y: 1.42, z: 0.08 };

/** Sphere with inset plate seams so the chassis reads as armored, not a ball. */
function makePaneledHull(radius: number, w: number, h: number, panelsU: number, panelsV: number) {
  const g = new THREE.SphereGeometry(radius, w, h);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const len = v.length() || 1;
    const n = v.clone().multiplyScalar(1 / len);
    const phi = Math.atan2(v.x, v.z);
    const theta = Math.acos(THREE.MathUtils.clamp(v.y / len, -1, 1));
    const u = ((phi + Math.PI) / (Math.PI * 2)) * panelsU;
    const vv = (theta / Math.PI) * panelsV;
    const localU = u - Math.floor(u);
    const localV = vv - Math.floor(vv);
    const checker = (Math.floor(u) + Math.floor(vv)) % 2 === 0 ? 0.08 : 0;
    const seam = localU < 0.12 || localU > 0.88 || localV < 0.12 || localV > 0.88 ? 0.11 : 0;
    v.addScaledVector(n, -checker - seam);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function shellPlate(
  parent: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  radius: number,
  yaw: number,
  pitch: number,
  w: number,
  h: number,
  d: number,
) {
  const x = radius * Math.cos(pitch) * Math.sin(yaw);
  const y = radius * Math.sin(pitch);
  const z = radius * Math.cos(pitch) * Math.cos(yaw);
  const mesh = add(parent, geometry, material, w, h, d, HULL.x + x, HULL.y + y, HULL.z + z);
  mesh.lookAt(HULL.x + x * 2, HULL.y + y * 2, HULL.z + z * 2);
  return mesh;
}

function wrapPi(a: number) {
  let y = a;
  while (y > Math.PI) y -= Math.PI * 2;
  while (y < -Math.PI) y += Math.PI * 2;
  return y;
}

function buildTorso(torso: THREE.Group, m: TitanMats, detail: boolean) {
  // Dark under-hull so plate gaps read as recessed seams.
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.22, 1), m.plate);
  core.position.set(HULL.x, HULL.y, HULL.z);
  core.castShadow = true;
  torso.add(core);
  const hull = new THREE.Mesh(makePaneledHull(1.34, 28, 20, 10, 7), m.armorB);
  hull.position.set(HULL.x, HULL.y, HULL.z);
  hull.castShadow = true;
  hull.receiveShadow = true;
  torso.add(hull);

  // Overlapping brick plates — this is the body from the reference.
  const skins = [m.armor, m.armorB, m.armorC];
  const bands = detail
    ? [
        { pitch: 1.08, n: 8, w: 0.58, h: 0.36, r: 1.28 },
        { pitch: 0.8, n: 11, w: 0.58, h: 0.4, r: 1.38 },
        { pitch: 0.54, n: 13, w: 0.56, h: 0.4, r: 1.42 },
        { pitch: 0.28, n: 14, w: 0.54, h: 0.4, r: 1.44 },
        { pitch: 0.02, n: 15, w: 0.54, h: 0.4, r: 1.45 },
        { pitch: -0.24, n: 14, w: 0.54, h: 0.38, r: 1.43 },
        { pitch: -0.5, n: 12, w: 0.56, h: 0.36, r: 1.38 },
        { pitch: -0.76, n: 10, w: 0.54, h: 0.34, r: 1.3 },
        { pitch: -1.0, n: 8, w: 0.5, h: 0.3, r: 1.18 },
      ]
    : [
        { pitch: 0.7, n: 8, w: 0.5, h: 0.36, r: 1.36 },
        { pitch: 0.15, n: 10, w: 0.48, h: 0.36, r: 1.42 },
        { pitch: -0.45, n: 8, w: 0.48, h: 0.32, r: 1.34 },
      ];

  for (const band of bands) {
    const stagger = band.pitch * 1.7;
    for (let i = 0; i < band.n; i++) {
      const yaw = wrapPi((i / band.n) * Math.PI * 2 - Math.PI + stagger);
      if (Math.abs(yaw) < 0.5 && Math.abs(band.pitch) < 0.4) continue;
      const mat = skins[(i + Math.round(Math.abs(band.pitch) * 10)) % skins.length];
      shellPlate(torso, geo.soft, mat, band.r, yaw, band.pitch, band.w, band.h, 0.09);
      if (detail && i % 3 === 0) {
        shellPlate(torso, geo.hard, m.dark, band.r + 0.01, yaw + 0.03, band.pitch, band.w * 0.9, 0.03, 0.04);
      }
    }
  }

  // Brow arch, cheeks, jaw — face frame around the cyclops well.
  shellPlate(torso, geo.soft, m.armorC, 1.44, 0, 0.52, 1.05, 0.34, 0.16);
  shellPlate(torso, geo.soft, m.plate, 1.46, -0.38, 0.48, 0.42, 0.22, 0.12);
  shellPlate(torso, geo.soft, m.plate, 1.46, 0.38, 0.48, 0.42, 0.22, 0.12);
  shellPlate(torso, geo.soft, m.armorB, 1.44, -0.78, 0.12, 0.5, 0.46, 0.14);
  shellPlate(torso, geo.soft, m.armorB, 1.44, 0.78, 0.12, 0.5, 0.46, 0.14);
  shellPlate(torso, geo.soft, m.armor, 1.42, 0, -0.48, 0.82, 0.3, 0.14);
  add(torso, geo.box, m.emit, 0.045, 0.38, 0.05, 0, 0.82, 1.4);

  // Side slat banks flush to the sphere.
  for (const side of [-1, 1]) {
    shellPlate(torso, geo.soft, m.plate, 1.44, side * 1.52, 0.06, 0.38, 0.72, 0.12);
    for (let v = 0; v < 5; v++) {
      shellPlate(torso, geo.hard, m.trim, 1.46, side * 1.52, -0.2 + v * 0.12, 0.3, 0.045, 0.07);
    }
    shellPlate(torso, geo.hard, m.emit, 1.47, side * 1.52, 0.06, 0.04, 0.58, 0.045);
  }

  if (detail) {
    for (const [yaw, pitch] of [
      [-0.95, 0.62],
      [0.95, 0.62],
      [-1.35, 0.22],
      [1.35, 0.22],
      [-0.75, -0.38],
      [0.75, -0.38],
      [2.35, 0.32],
      [-2.35, 0.32],
      [3.05, -0.15],
    ]) {
      shellPlate(torso, geo.hex, m.trim, 1.48, yaw, pitch, 0.16, 0.16, 0.05);
    }
  }

  buildCyclops(torso, m);
  buildCrown(torso, m);
}

function buildCyclops(torso: THREE.Group, m: TitanMats) {
  const y = HULL.y + 0.08;
  const z = HULL.z + 1.14;
  // Recessed camera well — dark metal, not a glowing speaker.
  add(torso, geo.cyl, m.dark, 1.02, 0.72, 1.02, 0, y, z - 0.32, Math.PI / 2, 0, 0);
  add(torso, geo.cyl, m.plate, 1.2, 0.18, 1.2, 0, y, z - 0.04, Math.PI / 2, 0, 0);
  add(torso, geo.cyl, m.armorB, 1.04, 0.12, 1.04, 0, y, z + 0.06, Math.PI / 2, 0, 0);
  add(torso, geo.torusFat, m.plate, 1.18, 1.18, 1.18, 0, y, z + 0.04);
  add(torso, geo.torus, m.dark, 0.98, 0.98, 0.98, 0, y, z + 0.1);
  add(torso, geo.torus, m.emit, 0.72, 0.72, 0.72, 0, y, z + 0.16);
  add(torso, geo.cyl, m.dark, 0.62, 0.1, 0.62, 0, y, z + 0.2, Math.PI / 2, 0, 0);

  const iris = new THREE.Mesh(new THREE.CircleGeometry(0.32, 32), m.iris);
  iris.position.set(0, y, z + 0.26);
  iris.castShadow = true;
  torso.add(iris);
  add(torso, geo.sphere, m.lens, 0.48, 0.48, 0.18, 0, y, z + 0.24);
  add(torso, geo.sphere, m.emit, 0.18, 0.18, 0.16, 0, y, z + 0.34);
  add(torso, geo.cyl, m.emit, 0.07, 0.06, 0.07, 0, y, z + 0.44, Math.PI / 2, 0, 0);

  // Bezel bolts around the well.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    add(torso, geo.cyl, m.trim, 0.07, 0.05, 0.07, Math.cos(a) * 0.52, y + Math.sin(a) * 0.52, z + 0.08, Math.PI / 2, 0, 0);
  }
}

function buildCrown(torso: THREE.Group, m: TitanMats) {
  const y = HULL.y + 1.2;
  add(torso, geo.hex, m.armorC, 1.62, 0.16, 1.62, 0, y, 0);
  add(torso, geo.hex, m.plate, 1.46, 0.1, 1.46, 0, y + 0.1, 0);
  add(torso, geo.hex, m.dark, 1.32, 0.14, 1.32, 0, y + 0.12, 0);
  add(torso, geo.hex, m.emit, 1.22, 0.03, 1.22, 0, y + 0.18, 0);
  const well = new THREE.Mesh(new THREE.CircleGeometry(0.64, 6), m.hex);
  well.rotation.x = -Math.PI / 2;
  well.position.set(0, y + 0.2, 0.02);
  well.castShadow = true;
  torso.add(well);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    add(torso, geo.cyl, m.trim, 0.08, 0.05, 0.08, Math.cos(a) * 0.74, y + 0.18, Math.sin(a) * 0.74);
  }
}

function buildMissilePod(torso: THREE.Group, side: number, m: TitanMats, detail: boolean) {
  const pod = new THREE.Group();
  pod.position.set(side * 1.48, 2.48, 0.02);
  torso.add(pod);
  add(pod, geo.soft, m.plate, 0.92, 0.48, 0.86, 0, 0, 0);
  add(pod, geo.soft, m.dark, 0.8, 0.16, 0.74, 0, 0.22, 0);
  add(pod, geo.soft, m.armor, 0.86, 0.2, 0.64, 0, -0.18, 0.02);
  const cols = [-0.24, 0, 0.24];
  const rows = [-0.2, 0, 0.2];
  for (const x of cols) {
    for (const z of rows) {
      add(pod, geo.cyl, m.dark, 0.22, 0.3, 0.22, x, 0.3, z);
      add(pod, geo.cyl, m.plate, 0.17, 0.08, 0.17, x, 0.44, z);
      add(pod, geo.cyl, m.emit, 0.09, 0.04, 0.09, x, 0.48, z);
    }
  }
  if (detail) {
    add(pod, geo.box, m.emit, 0.78, 0.03, 0.04, 0, 0.02, 0.46);
    add(pod, geo.hex, m.trim, 0.12, 0.04, 0.12, side * 0.4, -0.1, 0.4);
  }
}

function buildPauldron(sh: THREE.Group, side: number, m: TitanMats) {
  add(sh, geo.sphere, m.plate, 0.82, 0.78, 0.8, 0, 0.06, 0);
  add(sh, geo.soft, m.armor, 1.05, 0.62, 0.98, -side * 0.14, 0.16, 0.04);
  add(sh, geo.cyl, m.dark, 0.46, 0.58, 0.46, 0, -0.3, 0.02);
  add(sh, geo.box, m.emit, 0.06, 0.04, 0.48, side * 0.42, 0.26, 0.1);
}

function buildTitanArm(arm: THREE.Group, side: number, m: TitanMats, detail: boolean) {
  add(arm, geo.sphere, m.plate, 0.64, 0.64, 0.64, 0, 0.16, 0);
  add(arm, geo.cap, m.dark, 0.42, 0.78, 0.42, 0, -0.3, 0.02);
  add(arm, geo.soft, m.armor, 0.62, 1.05, 0.58, side * 0.04, -0.24, 0.04);
  add(arm, geo.soft, m.armorB, 0.28, 0.72, 0.2, side * 0.28, -0.26, 0.16);
  if (detail) add(arm, geo.box, m.emit, 0.045, 0.4, 0.04, side * 0.32, -0.2, 0.24);
  const fore = new THREE.Group();
  fore.position.set(0, -0.82, 0.04);
  arm.add(fore);
  add(fore, geo.sphere, m.plate, 0.52, 0.52, 0.52, 0, 0.06, 0);
  add(fore, geo.soft, m.armorC, 0.56, 0.7, 0.5, 0, -0.24, 0.06);
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
  g.position.set(0, -0.32, 0.38);
  arm.add(g);
  add(g, geo.cyl, m.plate, 0.64, 0.64, 0.42, 0, 0.06, 0.02, Math.PI / 2, 0, 0);
  add(g, geo.cyl, m.dark, exposed ? 0.44 : 0.5, exposed ? 0.44 : 0.5, 1.42, 0, 0.02, 0.76, Math.PI / 2, 0, 0);
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
