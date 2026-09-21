import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { HALF, MAP_SIZE } from "./city";
import { buildMech } from "./mech-mesh";
import type { Quality } from "./postfx";
import {
  makeAsphaltTextures,
  makeFacadeTextures,
  makeFlameSprite,
  makeFlareSprite,
  makeGroundTextures,
  makeSmokeSprite,
  sharedMetal,
} from "./textures";
import type { ChassisId } from "./types";
import type { CityData } from "./city";

const CHASSIS_IDS: ChassisId[] = ["titan", "reaper", "colossus", "phantom", "valkyrie"];

export class World {
  group = new THREE.Group();
  hangar = new THREE.Group();
  sky: Sky | null = null;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  fill: THREE.DirectionalLight;
  lampLights: THREE.PointLight[] = [];
  fireLights: THREE.PointLight[] = [];
  fireSprites: THREE.Sprite[] = [];
  smokeSprites: THREE.Sprite[] = [];
  private env: THREE.Texture;
  private disposables: THREE.Object3D[] = [];
  private textures: THREE.Texture[] = [];
  private sunDir = new THREE.Vector3();
  private _dummy = new THREE.Object3D();
  private ground: THREE.Mesh;
  metal!: ReturnType<typeof sharedMetal>;
  private playReady = false;
  private pendingCity: CityData;
  private pendingQuality: Quality;
  private pendingRenderer: THREE.WebGLRenderer;

  constructor(
    private scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    city: CityData,
    quality: Quality,
  ) {
    this.pendingCity = city;
    this.pendingQuality = quality;
    this.pendingRenderer = renderer;
    const phi = THREE.MathUtils.degToRad(90 - 11);
    const theta = THREE.MathUtils.degToRad(214);
    this.sunDir.setFromSphericalCoords(1, phi, theta);

    if (!quality.cheap) {
      this.sky = new Sky();
      this.sky.scale.setScalar(450);
      const uniforms = this.sky.material.uniforms;
      uniforms.turbidity.value = 6.5;
      uniforms.rayleigh.value = 2.4;
      uniforms.mieCoefficient.value = 0.0045;
      uniforms.mieDirectionalG.value = 0.82;
      uniforms.cloudCoverage.value = 0.48;
      uniforms.cloudDensity.value = 0.38;
      uniforms.cloudScale.value = 0.00022;
      uniforms.cloudSpeed.value = 0.000018;
      uniforms.sunPosition.value.copy(this.sunDir);

      if (!quality.software && !quality.mobile) {
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envScene = new THREE.Scene();
        envScene.add(this.sky);
        uniforms.showSunDisc.value = 0;
        this.env = pmrem.fromScene(envScene, 0.04, 0.2, 200).texture;
        uniforms.showSunDisc.value = 1;
        scene.environment = this.env;
        scene.environmentIntensity = 0.78;
        pmrem.dispose();
      } else {
        this.env = new THREE.Texture();
        scene.environment = null;
        scene.environmentIntensity = 0.2;
      }
      scene.add(this.sky);
    } else {
      this.env = new THREE.Texture();
      scene.environment = null;
      scene.environmentIntensity = 0.2;
    }
    scene.fog = new THREE.FogExp2(0x2a221c, 0.0062);
    scene.background = new THREE.Color(0x121014);

    this.hemi = new THREE.HemisphereLight(0x8a96a8, 0x1c1814, 0.42);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffb888, quality.mobile ? 1.2 : 1.55);
    this.sun.position.copy(this.sunDir).multiplyScalar(80);
    this.sun.castShadow = quality.shadows;
    if (quality.shadows) {
      this.sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
      this.sun.shadow.camera.near = 10;
      this.sun.shadow.camera.far = 220;
      this.sun.shadow.camera.left = -48;
      this.sun.shadow.camera.right = 48;
      this.sun.shadow.camera.top = 48;
      this.sun.shadow.camera.bottom = -48;
      this.sun.shadow.bias = -0.0006;
      this.sun.shadow.normalBias = 0.035;
      this.sun.shadow.radius = 2.2;
    }
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.fill = new THREE.DirectionalLight(0x6a7c94, 0.28);
    this.fill.position.set(40, 22, -50);
    scene.add(this.fill);

    scene.add(this.group);
    scene.add(this.hangar);

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_SIZE + 80, MAP_SIZE + 80, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0x2a2c30 }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.group.add(this.ground);

    this.buildHangar();
  }

  ensurePlayWorld() {
    if (this.playReady) return;
    this.playReady = true;
    const city = this.pendingCity;
    const quality = this.pendingQuality;
    this.metal = sharedMetal();
    const cheap = quality.cheap;
    const groundT = makeGroundTextures(cheap);
    const asphaltT = makeAsphaltTextures(cheap);
    const facade = makeFacadeTextures(false, cheap);
    const facadeRuin = makeFacadeTextures(true, cheap);
    const flame = makeFlameSprite();
    const smoke = makeSmokeSprite();
    const flare = makeFlareSprite();
    for (const t of [
      groundT.map,
      groundT.normalMap,
      groundT.roughnessMap,
      asphaltT.map,
      asphaltT.normalMap,
      asphaltT.roughnessMap,
      facade.map,
      facade.normalMap,
      facade.roughnessMap,
      facade.emissiveMap,
      facadeRuin.map,
      facadeRuin.normalMap,
      facadeRuin.roughnessMap,
      facadeRuin.emissiveMap,
      flame,
      smoke,
      flare,
    ]) {
      if (t) this.textures.push(t);
    }
    const groundMat = this.ground.material as THREE.MeshLambertMaterial;
    groundMat.map = groundT.map;
    groundMat.color.set(0x4e4c4a);
    groundMat.needsUpdate = true;

    const plaza = new THREE.Mesh(
      new THREE.CircleGeometry(22, cheap ? 16 : 32),
      cheap
        ? new THREE.MeshLambertMaterial({ color: 0x2a2c30, map: asphaltT.map })
        : new THREE.MeshStandardMaterial({
            color: 0x2a2c30,
            metalness: 0.12,
            roughness: 0.4,
            envMapIntensity: 0.7,
            map: asphaltT.map,
            normalMap: asphaltT.normalMap ?? undefined,
            roughnessMap: asphaltT.roughnessMap ?? undefined,
          }),
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.03;
    plaza.receiveShadow = true;
    this.group.add(plaza);

    const roadMat = cheap
      ? new THREE.MeshLambertMaterial({ map: asphaltT.map, color: 0x3c3e44 })
      : new THREE.MeshStandardMaterial({
          map: asphaltT.map,
          normalMap: asphaltT.normalMap ?? undefined,
          roughnessMap: asphaltT.roughnessMap ?? undefined,
          roughness: 0.72,
          metalness: 0.08,
          color: 0x3c3e44,
          envMapIntensity: 0.35,
        });
    for (let i = -2; i <= 2; i++) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(MAP_SIZE, 0.06, 11), roadMat);
      h.position.set(0, 0.03, i * 36);
      h.receiveShadow = true;
      this.group.add(h);
      const v = new THREE.Mesh(new THREE.BoxGeometry(11, 0.06, MAP_SIZE), roadMat);
      v.position.set(i * 36, 0.03, 0);
      v.receiveShadow = true;
      this.group.add(v);
    }

    this.buildBuildings(city, facade, facadeRuin, quality);
    this.buildLamps(city, flare);
    this.buildCars(city);
    this.buildDebris(city, quality);
    this.buildFires(city, flame, smoke, quality);
    this.buildWrecks(city, quality);
    this.buildRim();
    void this.pendingRenderer;
  }

  private buildBuildings(
    city: CityData,
    facade: ReturnType<typeof makeFacadeTextures>,
    ruin: ReturnType<typeof makeFacadeTextures>,
    quality: Quality,
  ) {
    const boxes: { x: number; y: number; z: number; w: number; h: number; d: number; rot: number; ruined: boolean }[] =
      [];
    const roofs: typeof boxes = [];
    for (const b of city.buildings) {
      boxes.push({ x: b.x, y: b.h * 0.5, z: b.z, w: b.w, h: b.h, d: b.d, rot: b.rot, ruined: b.ruined });
      const roofH = b.ruined ? 0.45 : 0.7;
      roofs.push({
        x: b.x,
        y: b.h + roofH * 0.5,
        z: b.z,
        w: b.w + 0.7,
        h: roofH,
        d: b.d + 0.7,
        rot: b.rot,
        ruined: b.ruined,
      });
      if (!quality.cheap && !b.ruined && b.h > 22 && b.tier > 1) {
        boxes.push({
          x: b.x,
          y: b.h + 3.2,
          z: b.z,
          w: b.w * 0.45,
          h: 5.5,
          d: b.d * 0.45,
          rot: b.rot,
          ruined: false,
        });
      }
      if (!b.ruined) {
        boxes.push({
          x: b.x,
          y: b.h + 0.18,
          z: b.z,
          w: b.w + 1.1,
          h: 0.35,
          d: b.d + 1.1,
          rot: b.rot,
          ruined: false,
        });
      } else {
        boxes.push({
          x: b.x + Math.sin(b.rot) * 2.2,
          y: Math.max(1.1, b.h * 0.22),
          z: b.z + 1.6,
          w: b.w * 0.55,
          h: Math.max(1.4, b.h * 0.28),
          d: b.d * 0.7,
          rot: b.rot + 0.55,
          ruined: true,
        });
      }
    }
    const intact = boxes.filter((b) => !b.ruined);
    const ruined = boxes.filter((b) => b.ruined);
    const wallMat = quality.cheap
      ? new THREE.MeshLambertMaterial({
          map: facade.map,
          emissiveMap: facade.emissiveMap,
          emissive: 0xffe0c0,
          emissiveIntensity: 0.7,
          color: 0x6e7278,
        })
      : new THREE.MeshStandardMaterial({
          map: facade.map,
          normalMap: facade.normalMap ?? undefined,
          roughnessMap: facade.roughnessMap ?? undefined,
          emissiveMap: facade.emissiveMap,
          emissive: 0xffe0c0,
          emissiveIntensity: 0.85,
          roughness: 0.72,
          metalness: 0.08,
          color: 0x6e7278,
          envMapIntensity: 0.42,
        });
    const ruinMat = wallMat.clone();
    ruinMat.map = ruin.map;
    if ("normalMap" in ruinMat) ruinMat.normalMap = ruin.normalMap;
    if ("roughnessMap" in ruinMat) ruinMat.roughnessMap = ruin.roughnessMap;
    ruinMat.emissiveMap = ruin.emissiveMap;
    ruinMat.emissiveIntensity = 0.4;
    ruinMat.color = new THREE.Color(0x6a6258);
    const roofMat = quality.cheap
      ? new THREE.MeshLambertMaterial({ color: 0x2a2c30 })
      : new THREE.MeshStandardMaterial({
          color: 0x2a2c30,
          roughness: 0.82,
          metalness: 0.22,
          envMapIntensity: 0.4,
        });
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.placeInstances(geo, wallMat, intact);
    this.placeInstances(geo, ruinMat, ruined);
    this.placeInstances(geo, roofMat, roofs);
  }

  private placeInstances(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    list: { x: number; y: number; z: number; w: number; h: number; d: number; rot: number }[],
  ) {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((b, i) => {
      this._dummy.position.set(b.x, b.y, b.z);
      this._dummy.rotation.set(0, b.rot, 0);
      this._dummy.scale.set(b.w, b.h, b.d);
      this._dummy.updateMatrix();
      mesh.setMatrixAt(i, this._dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  private buildLamps(city: CityData, flare: THREE.Texture) {
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.11, 5.4, 6);
    poleGeo.translate(0, 2.7, 0);
    const headGeo = new THREE.BoxGeometry(0.55, 0.12, 0.22);
    headGeo.translate(0, 5.45, 0.15);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.75, roughness: 0.35 });
    const pole = new THREE.InstancedMesh(poleGeo, poleMat, city.lamps.length);
    const heads = new THREE.InstancedMesh(
      headGeo,
      new THREE.MeshStandardMaterial({
        color: 0xd8c8a8,
        emissive: 0xffd7a0,
        emissiveIntensity: 1.6,
        roughness: 0.3,
        metalness: 0.2,
      }),
      city.lamps.length,
    );
    city.lamps.forEach((l, i) => {
      this._dummy.position.set(l.x, 0, l.z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.set(1, 1, 1);
      this._dummy.updateMatrix();
      pole.setMatrixAt(i, this._dummy.matrix);
      heads.setMatrixAt(i, this._dummy.matrix);
    });
    pole.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    pole.castShadow = true;
    this.group.add(pole);
    this.group.add(heads);

    for (let i = 0; i < (this.pendingQuality.cheap ? 2 : 4); i++) {
      const pl = new THREE.PointLight(0xffd4a0, 0, 22, 1.8);
      this.scene.add(pl);
      this.lampLights.push(pl);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: flare, color: 0xffe0b0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      spr.scale.set(1.6, 1.6, 1);
      this.group.add(spr);
      this.disposables.push(spr);
    }
    this.lamps = city.lamps;
  }

  lamps: CityData["lamps"] = [];

  private buildCars(city: CityData) {
    if (!city.cars.length) return;
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a2c30 });
    const cabinMat = new THREE.MeshLambertMaterial({ color: 0x12151a });
    const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 0.55, 4.1), bodyMat, city.cars.length);
    const cabins = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.5, 1.6), cabinMat, city.cars.length);
    city.cars.forEach((car, i) => {
      this._dummy.position.set(car.x, 0.45, car.z);
      this._dummy.rotation.set(0, car.yaw, 0.18);
      this._dummy.scale.set(1, 1, 1);
      this._dummy.updateMatrix();
      bodies.setMatrixAt(i, this._dummy.matrix);
      this._dummy.position.set(car.x, 0.9, car.z);
      this._dummy.updateMatrix();
      cabins.setMatrixAt(i, this._dummy.matrix);
    });
    bodies.instanceMatrix.needsUpdate = true;
    cabins.instanceMatrix.needsUpdate = true;
    bodies.castShadow = true;
    this.group.add(bodies, cabins);
  }

  private buildDebris(city: CityData, quality: Quality) {
    const mat = quality.cheap
      ? new THREE.MeshLambertMaterial({ map: this.metal.map, color: 0x6a6e74 })
      : new THREE.MeshStandardMaterial({
          map: this.metal.map,
          normalMap: this.metal.normalMap,
          roughnessMap: this.metal.roughnessMap,
          metalnessMap: this.metal.metalnessMap,
          color: 0x6a6e74,
          metalness: 0.55,
          roughness: 0.62,
        });
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, city.debris.length);
    city.debris.forEach((d, i) => {
      this._dummy.position.set(d.x, d.y, d.z);
      this._dummy.rotation.set(d.s, d.x * 0.01, d.z * 0.01);
      this._dummy.scale.set(d.s, d.s * 0.5, d.s * 0.7);
      this._dummy.updateMatrix();
      mesh.setMatrixAt(i, this._dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    this.group.add(mesh);
  }

  private buildFires(city: CityData, flame: THREE.Texture, smokeTex: THREE.Texture, quality: Quality) {
    const pitGeo = new THREE.CylinderGeometry(1.5, 2.1, 0.35, 10);
    const pitMat = new THREE.MeshStandardMaterial({ color: 0x120e0c, roughness: 1, metalness: 0.05 });
    const flameMat = new THREE.SpriteMaterial({
      map: flame,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffaa66,
    });
    const smokeMat = new THREE.SpriteMaterial({
      map: smokeTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.35,
      color: 0x4a453e,
    });
    const fires = city.fires.slice(0, quality.cheap ? 5 : 10);
    fires.forEach((f, i) => {
      const pit = new THREE.Mesh(pitGeo, pitMat);
      pit.position.set(f.x, 0.12, f.z);
      this.group.add(pit);
      const spr = new THREE.Sprite(flameMat.clone());
      spr.position.set(f.x, 1.4, f.z);
      spr.scale.set(2.8, 3.6, 1);
      this.group.add(spr);
      this.fireSprites.push(spr);
      const sm = new THREE.Sprite(smokeMat.clone());
      sm.position.set(f.x, 3.4, f.z);
      sm.scale.set(3.2, 3.6, 1);
      this.group.add(sm);
      this.smokeSprites.push(sm);
      if (i < (quality.mobile ? 2 : 4)) {
        const light = new THREE.PointLight(0xff6a32, 2.4, 18, 2);
        light.position.set(f.x, 1.6, f.z);
        this.scene.add(light);
        this.fireLights.push(light);
      }
    });
  }

  private buildWrecks(city: CityData, quality: Quality) {
    const n = quality.software || quality.mobile ? 3 : 5;
    city.wrecks.slice(0, n).forEach((w) => {
      const rig = buildMech(CHASSIS_IDS[w.chassis] ?? "titan", true, true);
      rig.root.position.set(w.x, 0, w.z);
      rig.root.rotation.y = w.yaw;
      this.group.add(rig.root);
    });
  }

  private buildHangar() {
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9.5, 48),
      new THREE.MeshStandardMaterial({
        color: 0x12141a,
        metalness: 0.08,
        roughness: 0.82,
        envMapIntensity: 0.15,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.06;
    floor.receiveShadow = true;
    this.hangar.add(floor);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(7.2, 0.06, 8, 48),
      new THREE.MeshStandardMaterial({
        color: 0x2a2e34,
        emissive: 0x1a1c20,
        emissiveIntensity: 0.35,
        roughness: 0.35,
        metalness: 0.55,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    this.hangar.add(ring);

    const mkWall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      this.hangar.add(m);
    };
    mkWall(28, 14, 1.2, 0, 7, -12.4);
    mkWall(1.2, 14, 24, -13.4, 7, -0.5);
    mkWall(1.2, 14, 24, 13.4, 7, -0.5);
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(28, 0.6, 26), metalMat);
    ceiling.position.set(0, 14.2, -0.6);
    this.hangar.add(ceiling);

    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.08, 0.45),
      new THREE.MeshStandardMaterial({
        color: 0xf2efe8,
        emissive: 0xffe8c8,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      }),
    );
    strip.position.set(0, 13.85, -2);
    this.hangar.add(strip);

    const amb = new THREE.AmbientLight(0x7a828c, 0.85);
    this.hangar.add(amb);
    const chest = new THREE.DirectionalLight(0xfff0e4, 1.8);
    chest.position.set(-4, 7, 10);
    chest.target.position.set(0, 3.1, 0.4);
    this.hangar.add(chest);
    this.hangar.add(chest.target);
    const rim = new THREE.DirectionalLight(0xff5533, 0.55);
    rim.position.set(5, 8.2, -6.5);
    this.hangar.add(rim);

    const girderMat = metalMat;
    for (let i = -1; i <= 1; i++) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 24), girderMat);
      g.position.set(i * 6.5, 13.6, -0.5);
      this.hangar.add(g);
    }
  }

  private buildRim() {
    const wall = new THREE.MeshStandardMaterial({ color: 0x24262c, roughness: 0.9, metalness: 0.12 });
    const rimGeo = new THREE.BoxGeometry(MAP_SIZE + 8, 10, 2.4);
    for (const [x, z, rx] of [
      [0, HALF + 2, 0],
      [0, -HALF - 2, 0],
      [HALF + 2, 0, Math.PI / 2],
      [-HALF - 2, 0, Math.PI / 2],
    ] as const) {
      const m = new THREE.Mesh(rimGeo, wall);
      m.position.set(x, 5, z);
      m.rotation.y = rx;
      this.group.add(m);
    }
  }

  setHangarMode(on: boolean) {
    this.hangar.visible = on;
    this.group.visible = !on;
    if (this.sky) this.sky.visible = !on;
    if (on) {
      this.scene.fog = new THREE.FogExp2(0x08090c, 0.005);
      this.sun.intensity = 0.55;
      this.hemi.intensity = 0.7;
      this.fill.intensity = 0.22;
      this.scene.environmentIntensity = 0.28;
    } else {
      this.scene.fog = new THREE.FogExp2(0x2a221c, 0.0062);
      this.sun.intensity = this.sun.castShadow ? 1.55 : 1.2;
      this.hemi.intensity = 0.42;
      this.fill.intensity = 0.22;
      this.scene.environmentIntensity = 0.78;
    }
  }

  update(_dt: number, time: number, px: number, pz: number, hangar = false) {
    if (hangar || !this.playReady) return;
    if (this.sky) this.sky.material.uniforms.time.value = time * 0.001;
    this.sun.target.position.set(px, 0, pz);
    this.sun.position.set(px + this.sunDir.x * 80, this.sunDir.y * 80, pz + this.sunDir.z * 80);
    this.sun.target.updateMatrixWorld();

    const cheap = this.pendingQuality.cheap;
    if (!cheap || ((time / 16) | 0) % 4 === 0) {
      const scored = this.lamps
        .map((l) => ({ l, d: (l.x - px) * (l.x - px) + (l.z - pz) * (l.z - pz) }))
        .sort((a, b) => a.d - b.d);
      this.lampLights.forEach((light, i) => {
        const hit = scored[i];
        if (!hit) {
          light.intensity = 0;
          return;
        }
        light.position.set(hit.l.x, 5.4, hit.l.z);
        light.intensity = 2.1;
        const spr = this.disposables[i] as THREE.Sprite | undefined;
        if (spr?.isSprite) spr.position.set(hit.l.x, 5.5, hit.l.z);
      });
    }

    if (cheap) return;
    for (const f of this.fireLights) {
      f.intensity = 2.0 + Math.sin(time * 0.011 + f.position.x) * 0.7 + Math.sin(time * 0.023) * 0.35;
    }
    this.fireSprites.forEach((s, i) => {
      const wobble = 1 + Math.sin(time * 0.012 + i) * 0.12;
      s.scale.set(2.6 * wobble, 3.4 * wobble, 1);
      s.material.rotation = Math.sin(time * 0.004 + i) * 0.08;
    });
    this.smokeSprites.forEach((s, i) => {
      s.position.y = 3.2 + Math.sin(time * 0.003 + i) * 0.4;
      s.material.rotation = time * 0.00015 * (i % 2 === 0 ? 1 : -1);
    });
  }

  dispose() {
    this.env.dispose();
    for (const t of this.textures) t.dispose();
  }
}
