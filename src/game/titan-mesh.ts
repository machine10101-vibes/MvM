import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { makeHexCellMap, makeMuzzleSprite, sharedArmor, sharedMetal } from "./textures";
import type { MechRig } from "./mech-mesh";
import type { WeaponId } from "./types";

const segs = 16;
const geo = {
  box: new RoundedBoxGeometry(1, 1, 1, 3, 0.07),
  hard: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, segs),
  cylR: new THREE.CylinderGeometry(0.5, 0.28, 1, segs),
  sphere: new THREE.SphereGeometry(0.5, 20, 16),
  hex: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  torus: new THREE.TorusGeometry(0.5, 0.1, 10, 22),
  cone: new THREE.ConeGeometry(0.5, 1, 8),
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

/**
 * Titan-class heavy assault frame — hulking dark chassis with red hex crown,
 * cyclops core, dual rotary arms, and twin shoulder missile pods.
 */
export function buildTitanMech(
  wrecked: boolean,
  lowDetail: boolean,
  weapons: { primary: WeaponId; secondary: WeaponId },
): MechRig {
  const detail = !wrecked && !lowDetail;
  const paint = wrecked ? 0x2a2a2c : 0x1b1d22;
  const accent = wrecked ? 0x3a2020 : 0x5a181c;
  const glow = wrecked ? 0x331010 : 0xff2a22;

  const armor = new THREE.MeshPhysicalMaterial({
    color: paint,
    map: armorT.map,
    normalMap: armorT.normalMap,
    roughnessMap: armorT.roughnessMap,
    metalnessMap: armorT.metalnessMap,
    metalness: wrecked ? 0.55 : 0.78,
    roughness: wrecked ? 0.62 : 0.32,
    clearcoat: wrecked ? 0.04 : 0.22,
    clearcoatRoughness: 0.45,
    envMapIntensity: wrecked ? 0.35 : 1.15,
    normalScale: new THREE.Vector2(1.15, 1.15),
  });
  const plate = new THREE.MeshPhysicalMaterial({
    color: 0x14161a,
    map: metal.map,
    normalMap: metal.normalMap,
    metalness: 0.88,
    roughness: 0.28,
    envMapIntensity: 1.2,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x0a0b0e,
    map: metal.map,
    metalness: 0.82,
    roughness: 0.4,
  });
  const trim = new THREE.MeshPhysicalMaterial({
    color: 0x2a2e34,
    map: metal.map,
    metalness: 0.7,
    roughness: 0.38,
  });
  const emit = new THREE.MeshStandardMaterial({
    color: glow,
    emissive: glow,
    emissiveIntensity: wrecked ? 0.35 : 3.4,
    metalness: 0.15,
    roughness: 0.2,
  });
  const hexMat = new THREE.MeshStandardMaterial({
    map: hexMap,
    color: 0xffffff,
    emissive: glow,
    emissiveMap: hexMap,
    emissiveIntensity: wrecked ? 0.2 : 1.8,
    metalness: 0.25,
    roughness: 0.35,
  });
  const lens = new THREE.MeshPhysicalMaterial({
    color: 0x180408,
    metalness: 0.15,
    roughness: 0.05,
    emissive: glow,
    emissiveIntensity: wrecked ? 0.2 : 2.4,
    transparent: true,
    opacity: 0.94,
    envMapIntensity: 1.6,
  });

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const hips = new THREE.Group();
  hips.position.y = 2.42;
  body.add(hips);
  add(hips, geo.box, dark, 2.15, 0.55, 1.35, 0, 0.08, 0);
  add(hips, geo.box, armor, 2.35, 0.62, 1.55, 0, 0.38, 0.04);
  add(hips, geo.hex, trim, 0.22, 0.08, 0.22, -0.72, 0.55, 0.55);
  add(hips, geo.hex, trim, 0.22, 0.08, 0.22, 0.72, 0.55, 0.55);
  add(hips, geo.box, emit, 0.55, 0.04, 0.08, 0, 0.62, 0.72);

  const leftHip = new THREE.Group();
  leftHip.position.set(-0.72, 0.02, 0.02);
  hips.add(leftHip);
  const rightHip = new THREE.Group();
  rightHip.position.set(0.72, 0.02, 0.02);
  hips.add(rightHip);
  const L = buildTitanLeg(leftHip, -1, armor, plate, dark, trim, emit, detail);
  const R = buildTitanLeg(rightHip, 1, armor, plate, dark, trim, emit, detail);

  const torso = new THREE.Group();
  torso.position.set(0, 0.12, 0);
  hips.add(torso);

  // Barrel chest — sloped composite + reactive hex tiles. The cyclops IS the face.
  add(torso, geo.sphere, armor, 2.85, 2.55, 2.42, 0, 1.28, 0.04);
  add(torso, geo.box, armor, 2.48, 1.95, 1.85, 0, 1.18, 0.1);
  add(torso, geo.box, plate, 2.22, 0.38, 1.95, 0, 2.18, 0.02);
  add(torso, geo.box, dark, 1.62, 1.22, 0.48, 0, 1.28, 0.92);
  add(torso, geo.box, armor, 2.05, 0.62, 1.62, 0, 0.38, 0.14);
  add(torso, geo.box, emit, 1.15, 0.03, 0.06, 0, 0.72, 0.98);
  add(torso, geo.box, emit, 0.08, 0.85, 0.05, -1.05, 1.22, 0.72);
  add(torso, geo.box, emit, 0.08, 0.85, 0.05, 1.05, 1.22, 0.72);
  if (detail) {
    for (const [x, y] of [
      [-0.62, 0.68],
      [0.62, 0.68],
      [-0.82, 1.28],
      [0.82, 1.28],
      [-0.42, 1.72],
      [0.42, 1.72],
    ]) {
      add(torso, geo.hex, trim, 0.3, 0.05, 0.3, x, y, 1.02, Math.PI / 2, 0, 0);
    }
  }

  // Cyclops core + chest plasma aperture.
  add(torso, geo.torus, dark, 0.92, 0.92, 0.92, 0, 1.38, 1.02, 0, 0, 0);
  add(torso, geo.torus, emit, 0.68, 0.68, 0.68, 0, 1.38, 1.08);
  add(torso, geo.torus, dark, 0.48, 0.48, 0.48, 0, 1.38, 1.14);
  add(torso, geo.sphere, lens, 0.52, 0.52, 0.2, 0, 1.38, 1.16);
  add(torso, geo.sphere, emit, 0.18, 0.18, 0.16, 0, 1.38, 1.26);
  const muzzleChest = new THREE.Object3D();
  muzzleChest.position.set(0, 1.38, 1.42);
  torso.add(muzzleChest);

  // Hex crown on the spherical upper mass — no separate humanoid head.
  add(torso, geo.hex, plate, 1.85, 0.28, 1.85, 0, 2.48, -0.04);
  add(torso, geo.hex, hexMat, 1.55, 0.1, 1.55, 0, 2.64, -0.04);
  add(torso, geo.hex, dark, 0.72, 0.08, 0.72, 0, 2.72, -0.04);

  const head = new THREE.Group();
  head.position.set(0, 1.85, 0.22);
  torso.add(head);

  const lShoulder = new THREE.Group();
  lShoulder.position.set(-1.22, 1.82, 0.02);
  torso.add(lShoulder);
  const rShoulder = new THREE.Group();
  rShoulder.position.set(1.22, 1.82, 0.02);
  torso.add(rShoulder);
  buildTitanPauldron(lShoulder, -1, armor, plate, dark, emit);
  buildTitanPauldron(rShoulder, 1, armor, plate, dark, emit);
  buildMissilePod(lShoulder, -1, "hex", plate, dark, emit, detail);
  buildMissilePod(rShoulder, 1, "tubes", plate, dark, emit, detail);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.08, -0.28, 0.06);
  lShoulder.add(leftArm);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.08, -0.28, 0.06);
  rShoulder.add(rightArm);
  const leftFore = buildTitanArm(leftArm, -1, armor, plate, dark, trim);
  const rightFore = buildTitanArm(rightArm, 1, armor, plate, dark, trim);

  const flashes: THREE.Sprite[] = [];
  const muzzleLights: THREE.PointLight[] = [];
  const muzzle = new THREE.Object3D();
  const muzzle2 = new THREE.Object3D();
  const rightGun = attachRotary(rightFore, 1, dark, trim, emit, plate, muzzle, flashes, wrecked ? [] : muzzleLights);
  const leftGun = attachRotary(leftFore, -1, dark, trim, emit, plate, muzzle2, flashes, wrecked ? [] : muzzleLights);

  const thrusters: THREE.Mesh[] = [];
  add(torso, geo.box, dark, 1.15, 0.85, 0.55, 0, 1.05, -1.05);
  const bellL = add(torso, geo.cylR, emit, 0.42, 0.55, 0.42, -0.38, 0.72, -1.18, Math.PI / 2, 0, 0);
  const bellR = add(torso, geo.cylR, emit, 0.42, 0.55, 0.42, 0.38, 0.72, -1.18, Math.PI / 2, 0, 0);
  thrusters.push(bellL, bellR);

  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(3.6, 24, 16),
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
  shieldMesh.position.set(0, 1.4, 0);
  shieldMesh.visible = false;
  body.add(shieldMesh);

  const lights: THREE.PointLight[] = [];
  if (!wrecked) {
    const pl = new THREE.PointLight(glow, 1.8, 12);
    pl.position.set(0, 1.45, 1.35);
    torso.add(pl);
    lights.push(pl);
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
    glow: [emit],
    chassis: "titan",
    primary: weapons.primary,
    secondary: weapons.secondary,
    shieldMesh,
    muzzleChest,
    barrels: [...rightGun.userData.barrels, ...leftGun.userData.barrels] as THREE.Object3D[],
  };
}

function buildTitanLeg(
  hip: THREE.Group,
  side: number,
  armor: THREE.Material,
  plate: THREE.Material,
  dark: THREE.Material,
  trim: THREE.Material,
  emit: THREE.Material,
  detail: boolean,
) {
  add(hip, geo.sphere, plate, 0.85, 0.85, 0.85, 0, 0.06, 0);
  add(hip, geo.box, armor, 0.95, 0.72, 0.88, side * 0.06, -0.22, 0.04);
  const thigh = new THREE.Group();
  hip.add(thigh);
  add(thigh, geo.box, dark, 0.52, 1.35, 0.55, 0, -0.55, 0);
  add(thigh, geo.box, armor, 0.78, 1.28, 0.82, side * 0.06, -0.52, 0.06);
  add(thigh, geo.box, plate, 0.28, 0.85, 0.22, side * 0.38, -0.62, 0.22);
  if (detail) add(thigh, geo.hex, trim, 0.18, 0.05, 0.18, side * 0.12, -0.35, 0.42, Math.PI / 2, 0, 0);

  const knee = new THREE.Group();
  knee.position.set(0, -1.22, 0.02);
  thigh.add(knee);
  add(knee, geo.sphere, plate, 0.58, 0.58, 0.58, 0, 0, 0);
  add(knee, geo.box, armor, 0.62, 0.42, 0.28, 0, 0.02, 0.28);
  add(knee, geo.box, dark, 0.38, 1.15, 0.4, 0, -0.55, 0);
  add(knee, geo.box, armor, 0.62, 1.12, 0.62, 0, -0.52, 0.06);
  add(knee, geo.box, emit, 0.12, 0.04, 0.22, 0, -0.28, 0.36);

  const foot = new THREE.Group();
  foot.position.set(0, -1.18, 0.08);
  knee.add(foot);
  add(foot, geo.box, dark, 0.82, 0.22, 1.15, 0, 0.1, 0.12);
  add(foot, geo.box, armor, 0.95, 0.28, 1.35, 0, 0.16, 0.18);
  add(foot, geo.cone, plate, 0.18, 0.28, 0.18, -0.28, 0.08, 0.72, Math.PI / 2, 0, 0);
  add(foot, geo.cone, plate, 0.18, 0.28, 0.18, 0.28, 0.08, 0.72, Math.PI / 2, 0, 0);
  add(foot, geo.cone, plate, 0.16, 0.22, 0.16, 0, 0.08, 0.82, Math.PI / 2, 0, 0);
  add(foot, geo.box, armor, 0.28, 0.14, 0.38, 0, 0.18, -0.48);
  return { knee, foot };
}

function buildTitanPauldron(
  sh: THREE.Group,
  side: number,
  armor: THREE.Material,
  plate: THREE.Material,
  dark: THREE.Material,
  emit: THREE.Material,
) {
  add(sh, geo.sphere, plate, 0.82, 0.82, 0.82, 0, 0.04, 0);
  add(sh, geo.box, armor, 1.15, 0.72, 1.15, -side * 0.18, 0.18, 0.02);
  add(sh, geo.box, dark, 0.55, 0.72, 0.55, 0, -0.28, 0.02);
  add(sh, geo.box, emit, 0.08, 0.05, 0.55, side * 0.42, 0.32, 0.08);
}

function buildMissilePod(
  sh: THREE.Group,
  side: number,
  kind: "hex" | "tubes",
  plate: THREE.Material,
  dark: THREE.Material,
  emit: THREE.Material,
  detail: boolean,
) {
  const pod = new THREE.Group();
  pod.position.set(-side * 0.08, 0.78, -0.04);
  sh.add(pod);
  add(pod, geo.box, plate, 1.22, 0.62, 1.05, 0, 0, 0);
  add(pod, geo.box, dark, 1.05, 0.42, 0.28, 0, 0.02, 0.42);
  if (kind === "hex") {
    add(pod, geo.hex, emit, 0.98, 0.08, 0.98, 0, 0.34, 0);
    if (detail) {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        add(pod, geo.cyl, dark, 0.12, 0.14, 0.12, Math.cos(a) * 0.28, 0.28, Math.sin(a) * 0.22);
      }
      add(pod, geo.cyl, dark, 0.12, 0.14, 0.12, 0, 0.28, 0);
    }
  } else {
    const cols = [-0.28, 0, 0.28];
    const rows = [-0.12, 0.12];
    for (const x of cols) {
      for (const y of rows) {
        add(pod, geo.cyl, dark, 0.16, 0.16, 0.72, x, y, 0.18, Math.PI / 2, 0, 0);
        add(pod, geo.cyl, emit, 0.07, 0.07, 0.1, x, y, 0.52, Math.PI / 2, 0, 0);
      }
    }
  }
}

function buildTitanArm(
  arm: THREE.Group,
  side: number,
  armor: THREE.Material,
  plate: THREE.Material,
  dark: THREE.Material,
  trim: THREE.Material,
) {
  add(arm, geo.sphere, plate, 0.62, 0.62, 0.62, 0, 0.22, 0);
  add(arm, geo.box, dark, 0.42, 1.05, 0.42, 0, -0.22, 0.02);
  add(arm, geo.box, armor, 0.58, 1.0, 0.55, side * 0.04, -0.18, 0.04);
  add(arm, geo.box, trim, 0.18, 0.7, 0.18, side * 0.28, -0.2, 0.16);
  const fore = new THREE.Group();
  fore.position.set(0, -0.72, 0.04);
  arm.add(fore);
  add(fore, geo.sphere, plate, 0.5, 0.5, 0.5, 0, 0.08, 0);
  add(fore, geo.box, armor, 0.52, 0.72, 0.48, 0, -0.22, 0.06);
  return fore;
}

function attachRotary(
  arm: THREE.Group,
  _side: number,
  dark: THREE.Material,
  trim: THREE.Material,
  emit: THREE.Material,
  plate: THREE.Material,
  muzzle: THREE.Object3D,
  flashes: THREE.Sprite[],
  lights: THREE.PointLight[],
) {
  const g = new THREE.Group();
  g.position.set(0, -0.42, 0.28);
  arm.add(g);
  add(g, geo.cyl, plate, 0.52, 0.52, 0.42, 0, 0.08, 0, Math.PI / 2, 0, 0);
  add(g, geo.cyl, dark, 0.38, 0.38, 1.15, 0, 0.02, 0.62, Math.PI / 2, 0, 0);
  const barrels: THREE.Object3D[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const b = add(g, geo.cyl, trim, 0.09, 0.09, 1.05, Math.cos(a) * 0.12, 0.02 + Math.sin(a) * 0.12, 0.7, Math.PI / 2, 0, 0);
    barrels.push(b);
  }
  add(g, geo.cyl, emit, 0.08, 0.08, 0.08, 0, 0.02, 1.22, Math.PI / 2, 0, 0);
  g.userData.barrels = barrels;
  muzzle.position.set(0, 0.02, 1.32);
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
    rig.glow[0].emissiveIntensity = 5.2;
  } else if (rig.glow[0]) {
    rig.glow[0].emissiveIntensity = 3.2 + Math.sin(time * 3) * 0.25;
  }
}
