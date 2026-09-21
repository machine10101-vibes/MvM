import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { makeMuzzleSprite } from "./textures";
import type { MechRig } from "./mech-mesh";
import type { WeaponId } from "./types";

const segs = 16;
const geo = {
  box: new RoundedBoxGeometry(1, 1, 1, 3, 0.08),
  soft: new RoundedBoxGeometry(1, 1, 1, 4, 0.12),
  hard: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, segs),
  cylR: new THREE.CylinderGeometry(0.5, 0.22, 1, segs),
  sphere: new THREE.SphereGeometry(0.5, 18, 14),
  torus: new THREE.TorusGeometry(0.5, 0.08, 10, 22),
  cone: new THREE.ConeGeometry(0.5, 1, 10),
  cap: new THREE.CapsuleGeometry(0.5, 1, 5, 12),
  disk: new THREE.CircleGeometry(0.5, 22),
};

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
  const glow = wrecked ? 0x102030 : 0x3aa8ff;
  const lam = (color: number, emit = 0x000000, emitI = 0) =>
    new THREE.MeshLambertMaterial({ color, emissive: emit, emissiveIntensity: emitI });
  return {
    armor: lam(wrecked ? 0x6a6e74 : 0xe8eef4, wrecked ? 0x101214 : 0x1a222c, wrecked ? 0.04 : 0.1),
    navy: lam(wrecked ? 0x22262c : 0x1a2744, 0x081018, 0.08),
    gold: lam(wrecked ? 0x4a4434 : 0xc4b078, 0x2a2410, 0.12),
    dark: lam(0x12161c, 0x06080c, 0.05),
    plate: lam(wrecked ? 0x3a3e44 : 0xb8c2ce, 0x12161c, 0.06),
    emit: new THREE.MeshStandardMaterial({
      color: glow,
      emissive: glow,
      emissiveIntensity: wrecked ? 0.3 : 3.6,
      metalness: 0.08,
      roughness: 0.22,
    }),
    visor: new THREE.MeshStandardMaterial({
      color: 0x061018,
      emissive: glow,
      emissiveIntensity: wrecked ? 0.2 : 2.8,
      metalness: 0.15,
      roughness: 0.18,
    }),
    glow,
  };
}

/**
 * Valkyrie-class aerial interceptor — white/navy Gundam-like fighter
 * with binder wings, backpack thruster rings, arm pulse/rotary, chin gatling.
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
  hips.position.y = 2.02;
  body.add(hips);
  add(hips, geo.soft, m.navy, 0.72, 0.28, 0.48, 0, 0.04, 0.02);
  add(hips, geo.soft, m.armor, 0.86, 0.22, 0.52, 0, 0.22, 0.04);
  add(hips, geo.box, m.gold, 0.18, 0.04, 0.36, 0, 0.34, 0.18);

  const leftHip = new THREE.Group();
  leftHip.position.set(-0.38, 0.02, 0.02);
  hips.add(leftHip);
  const rightHip = new THREE.Group();
  rightHip.position.set(0.38, 0.02, 0.02);
  hips.add(rightHip);
  const L = buildLeg(leftHip, -1, m, detail);
  const R = buildLeg(rightHip, 1, m, detail);

  const torso = new THREE.Group();
  torso.position.set(0, 0.16, 0);
  hips.add(torso);
  buildChest(torso, m, detail);

  const chin = new THREE.Group();
  chin.position.set(0, 0.42, 0.72);
  torso.add(chin);
  const muzzleChest = buildChinGatling(chin, m, detail);

  const head = new THREE.Group();
  head.position.set(0, 1.72, 0.18);
  torso.add(head);
  const antenna = buildHead(head, m, detail);

  const pack = new THREE.Group();
  pack.position.set(0, 1.28, -0.42);
  torso.add(pack);
  const { wings, thrusters } = buildBackpack(pack, m, detail);

  const lShoulder = new THREE.Group();
  lShoulder.position.set(-0.78, 1.38, 0.06);
  torso.add(lShoulder);
  const rShoulder = new THREE.Group();
  rShoulder.position.set(0.78, 1.38, 0.06);
  torso.add(rShoulder);
  const pdL = buildPauldron(lShoulder, -1, m, detail);
  const pdR = buildPauldron(rShoulder, 1, m, detail);

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
  const rightGun = attachRotary(rightFore, 1, m, muzzle, flashes, wrecked ? [] : muzzleLights);
  const leftGun = attachPulse(leftFore, -1, m, muzzle2, flashes, wrecked ? [] : muzzleLights);

  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 22, 14),
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
  shieldMesh.position.set(0, 1.35, 0);
  shieldMesh.visible = false;
  body.add(shieldMesh);

  const lights: THREE.PointLight[] = [];
  if (!wrecked) {
    const visor = new THREE.PointLight(m.glow, 2.2, 8);
    visor.position.set(0, 1.68, 0.55);
    torso.add(visor);
    lights.push(visor);
    const packL = new THREE.PointLight(m.glow, 1.6, 7);
    packL.position.set(-0.42, 1.55, -0.2);
    torso.add(packL);
    lights.push(packL);
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
    wings[0].rotation.z = 0.4;
  }

  root.scale.setScalar(1.02);
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
  add(torso, geo.soft, m.navy, 0.92, 1.18, 0.62, 0, 0.92, 0.02);
  add(torso, geo.soft, m.armor, 1.08, 0.72, 0.7, 0, 1.22, 0.08);
  add(torso, geo.soft, m.armor, 0.82, 0.52, 0.58, 0, 0.62, 0.1);
  add(torso, geo.soft, m.plate, 0.55, 0.42, 0.22, 0, 1.18, 0.38);
  add(torso, geo.box, m.gold, 0.06, 0.62, 0.04, 0, 1.05, 0.46);
  add(torso, geo.soft, m.navy, 0.28, 0.18, 0.16, 0, 0.86, 0.42);
  add(torso, geo.box, m.emit, 0.16, 0.03, 0.05, 0, 0.86, 0.5);
  if (detail) {
    add(torso, geo.soft, m.armor, 0.34, 0.28, 0.22, -0.42, 1.28, 0.22);
    add(torso, geo.soft, m.armor, 0.34, 0.28, 0.22, 0.42, 1.28, 0.22);
    add(torso, geo.box, m.gold, 0.04, 0.22, 0.18, -0.52, 1.18, 0.16);
    add(torso, geo.box, m.gold, 0.04, 0.22, 0.18, 0.52, 1.18, 0.16);
  }
  add(torso, geo.soft, m.navy, 0.7, 0.38, 0.36, 0, 1.42, -0.22);
}

function buildHead(head: THREE.Group, m: ValkMats, detail: boolean) {
  add(head, geo.soft, m.armor, 0.42, 0.36, 0.46, 0, 0.08, 0.04);
  add(head, geo.soft, m.navy, 0.34, 0.16, 0.28, 0, -0.04, 0.08);
  add(head, geo.soft, m.visor, 0.3, 0.08, 0.18, 0, 0.08, 0.24);
  add(head, geo.hard, m.dark, 0.22, 0.03, 0.16, 0, 0.08, 0.28);
  const fin = add(head, geo.soft, m.armor, 0.08, 0.42, 0.22, 0, 0.32, -0.02, 0.35, 0, 0);
  add(head, geo.soft, m.navy, 0.05, 0.28, 0.12, 0, 0.34, -0.04, 0.35, 0, 0);
  if (detail) {
    add(head, geo.box, m.gold, 0.03, 0.12, 0.08, -0.16, 0.18, 0.12);
    add(head, geo.box, m.gold, 0.03, 0.12, 0.08, 0.16, 0.18, 0.12);
  }
  return fin;
}

function buildBackpack(pack: THREE.Group, m: ValkMats, detail: boolean) {
  add(pack, geo.soft, m.navy, 0.82, 0.72, 0.48, 0, 0.08, 0);
  add(pack, geo.soft, m.armor, 0.62, 0.42, 0.28, 0, 0.18, 0.08);
  const thrusters: THREE.Mesh[] = [];
  const wings: THREE.Group[] = [];

  for (const side of [-1, 1]) {
    const pod = new THREE.Group();
    pod.position.set(side * 0.48, 0.42, 0.12);
    pack.add(pod);
    add(pod, geo.cyl, m.armor, 0.42, 0.22, 0.42, 0, 0, 0, Math.PI / 2, 0, 0);
    add(pod, geo.torus, m.navy, 0.46, 0.46, 0.46, 0, 0, 0.06);
    add(pod, geo.disk, m.emit, 0.28, 0.28, 0.28, 0, 0, 0.12);
    const bell = add(pod, geo.cylR, m.emit, 0.22, 0.28, 0.22, 0, 0, -0.22, Math.PI / 2, 0, 0);
    thrusters.push(bell);
    if (detail) add(pod, geo.box, m.gold, 0.04, 0.18, 0.08, side * 0.18, 0.12, 0);

    const wing = new THREE.Group();
    wing.position.set(side * 0.62, 0.38, -0.04);
    pack.add(wing);
    add(wing, geo.soft, m.armor, 0.18, 1.55, 0.72, side * 0.55, 0.72, -0.12, 0.18, 0, side * -0.55);
    add(wing, geo.soft, m.navy, 0.08, 1.42, 0.58, side * 0.48, 0.68, -0.16, 0.18, 0, side * -0.55);
    add(wing, geo.soft, m.armor, 0.12, 0.55, 0.95, side * 0.92, 1.18, -0.22, 0.28, 0, side * -0.72);
    add(wing, geo.box, m.emit, 0.06, 0.08, 0.08, side * 0.38, 0.22, 0.22);
    if (detail) {
      add(wing, geo.box, m.gold, 0.03, 1.1, 0.04, side * 0.42, 0.7, 0.18, 0.18, 0, side * -0.55);
    }
    const rack = new THREE.Group();
    rack.position.set(side * 0.42, 0.12, 0.18);
    wing.add(rack);
    add(rack, geo.hard, m.dark, 0.22, 0.16, 0.62, 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      add(rack, geo.cyl, m.navy, 0.07, 0.42, 0.07, side * 0.02, -0.02, -0.18 + i * 0.18, 0, 0, Math.PI / 2);
    }
    const pulse = add(wing, geo.cyl, m.dark, 0.1, 0.55, 0.1, side * 0.22, 0.05, 0.42, Math.PI / 2, 0, 0);
    add(pulse, geo.cyl, m.emit, 0.06, 0.12, 0.06, 0, 0.28, 0);
    wings.push(wing);
  }

  const vent = add(pack, geo.cylR, m.emit, 0.2, 0.32, 0.2, 0, -0.12, -0.18, Math.PI / 2, 0, 0);
  thrusters.push(vent);
  return { wings, thrusters };
}

function buildPauldron(sh: THREE.Group, side: number, m: ValkMats, detail: boolean) {
  add(sh, geo.soft, m.armor, 0.52, 0.32, 0.48, side * 0.12, 0.12, 0);
  add(sh, geo.soft, m.navy, 0.28, 0.18, 0.32, side * 0.18, 0.22, -0.04);
  const pd = new THREE.Group();
  pd.position.set(side * 0.22, 0.28, 0.12);
  sh.add(pd);
  add(pd, geo.sphere, m.dark, 0.16, 0.16, 0.16, 0, 0, 0);
  add(pd, geo.cyl, m.emit, 0.05, 0.16, 0.05, 0, 0.02, 0.1, Math.PI / 2, 0, 0);
  if (detail) add(sh, geo.box, m.gold, 0.04, 0.16, 0.2, side * 0.28, 0.08, 0.1);
  return pd;
}

function buildArm(arm: THREE.Group, side: number, m: ValkMats, detail: boolean) {
  add(arm, geo.soft, m.armor, 0.28, 0.72, 0.28, 0, -0.38, 0.02);
  add(arm, geo.cyl, m.navy, 0.2, 0.16, 0.2, 0, -0.72, 0.02);
  const fore = new THREE.Group();
  fore.position.set(0, -0.78, 0.02);
  arm.add(fore);
  add(fore, geo.soft, m.armor, 0.24, 0.62, 0.24, 0, -0.28, 0.02);
  add(fore, geo.soft, m.navy, 0.2, 0.22, 0.2, 0, -0.52, 0.04);
  if (detail) add(fore, geo.box, m.gold, 0.04, 0.28, 0.08, side * 0.1, -0.22, 0.08);
  return fore;
}

function buildLeg(hip: THREE.Group, side: number, m: ValkMats, detail: boolean) {
  add(hip, geo.soft, m.armor, 0.36, 0.82, 0.36, 0, -0.42, 0.02);
  add(hip, geo.soft, m.navy, 0.22, 0.18, 0.22, 0, -0.78, 0.02);
  const knee = new THREE.Group();
  knee.position.set(0, -0.86, 0.02);
  hip.add(knee);
  add(knee, geo.soft, m.armor, 0.3, 0.22, 0.3, 0, 0, 0.02);
  add(knee, geo.soft, m.navy, 0.28, 0.92, 0.28, 0, -0.52, 0.02);
  add(knee, geo.soft, m.armor, 0.22, 0.42, 0.22, 0, -0.72, 0.04);
  if (detail) add(knee, geo.box, m.gold, 0.04, 0.36, 0.08, side * 0.12, -0.4, 0.08);
  const foot = new THREE.Group();
  foot.position.set(0, -1.02, 0.04);
  knee.add(foot);
  add(foot, geo.soft, m.navy, 0.28, 0.14, 0.62, 0, 0.06, 0.12);
  add(foot, geo.soft, m.armor, 0.34, 0.12, 0.72, 0, 0.1, 0.16);
  add(foot, geo.soft, m.armor, 0.16, 0.1, 0.22, 0, 0.1, 0.46);
  add(foot, geo.box, m.emit, 0.08, 0.03, 0.04, 0, 0.16, 0.28);
  return { knee, foot };
}

function buildChinGatling(chin: THREE.Group, m: ValkMats, detail: boolean) {
  add(chin, geo.soft, m.navy, 0.22, 0.16, 0.28, 0, 0, 0);
  add(chin, geo.cyl, m.dark, 0.14, 0.55, 0.14, 0, -0.08, 0.28, Math.PI / 2, 0, 0);
  if (detail) {
    for (const x of [-0.04, 0.04]) {
      add(chin, geo.cyl, m.dark, 0.04, 0.42, 0.04, x, -0.08, 0.3, Math.PI / 2, 0, 0);
    }
  }
  add(chin, geo.cyl, m.emit, 0.05, 0.08, 0.05, 0, -0.08, 0.54, Math.PI / 2, 0, 0);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -0.08, 0.62);
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
  g.position.set(side * 0.06, -0.62, 0.22);
  fore.add(g);
  add(g, geo.cyl, m.dark, 0.16, 0.82, 0.16, 0, 0, 0.18, Math.PI / 2, 0, 0);
  add(g, geo.soft, m.navy, 0.2, 0.18, 0.28, 0, 0.02, 0);
  add(g, geo.cyl, m.emit, 0.08, 0.14, 0.08, 0, 0, 0.58, Math.PI / 2, 0, 0);
  muzzle.position.set(0, 0, 0.68);
  g.add(muzzle);
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
    const light = new THREE.PointLight(m.glow, 0, 6);
    light.position.copy(muzzle.position);
    g.add(light);
    lights.push(light);
  }
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
  g.position.set(0.06, -0.62, 0.22);
  fore.add(g);
  add(g, geo.soft, m.navy, 0.26, 0.2, 0.32, 0, 0.02, 0);
  add(g, geo.cyl, m.dark, 0.22, 0.55, 0.22, 0, 0, 0.28, Math.PI / 2, 0, 0);
  const barrels: THREE.Object3D[] = [];
  const spin = new THREE.Group();
  spin.position.set(0, 0, 0.42);
  g.add(spin);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const b = add(spin, geo.cyl, m.dark, 0.05, 0.38, 0.05, Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0.08, Math.PI / 2, 0, 0);
    barrels.push(b);
  }
  g.userData.barrels = barrels;
  add(g, geo.cyl, m.emit, 0.08, 0.08, 0.08, 0, 0, 0.68, Math.PI / 2, 0, 0);
  muzzle.position.set(0, 0, 0.74);
  g.add(muzzle);
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
    const light = new THREE.PointLight(m.glow, 0, 6);
    light.position.copy(muzzle.position);
    g.add(light);
    lights.push(light);
  }
  return g;
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
  const flare = boost || jumping ? 0.42 : 0.12;
  if (rig.wings) {
    rig.wings[0]?.rotation.set(0.06, 0.08, -0.18 - flare);
    rig.wings[1]?.rotation.set(0.06, -0.08, 0.18 + flare);
  }
  if (rig.barrels) {
    for (const b of rig.barrels) b.rotation.z += (fire + special) * 2.2;
  }
  if (rig.pdTurrets) {
    rig.pdTurrets.forEach((t, i) => {
      t.rotation.y = Math.sin(time * 1.6 + i) * 0.55;
      t.rotation.x = 0.15 + Math.sin(time * 1.1 + i * 2) * 0.2;
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
    rig.glow[0].emissiveIntensity = special > 0.02 || fire > 0.02 ? 5.2 : 3.2 + Math.sin(time * 4) * 0.35;
  }
  void alt;
}
