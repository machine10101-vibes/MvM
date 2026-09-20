import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { Sky } from "three/addons/objects/Sky.js";
import { HALF, MAP_SIZE } from "./city";
import { buildMech } from "./mech-mesh";
import type { Quality } from "./postfx";
import {
  makeAsphaltTextures,
  makeConcreteTextures,
  makeFacadeTextures,
  makeFlameSprite,
  makeFlareSprite,
  makeGroundTextures,
  makeSmokeSprite,
  sharedMetal,
} from "./textures";
import type { ChassisId } from "./types";
import type { CityData } from "./city";

const CHASSIS_IDS: ChassisId[] = ["vanguard", "reaper", "colossus", "phantom"];

export class World {
  group = new THREE.Group();
  hangar = new THREE.Group();
  sky: Sky;
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
  metal: ReturnType<typeof sharedMetal>;

  constructor(
    private scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    city: CityData,
    quality: Quality,
  ) {
    RectAreaLightUniformsLib.init();
    const groundT = makeGroundTextures();
    const asphaltT = makeAsphaltTextures();
    const facade = makeFacadeTextures(false);
    const facadeRuin = makeFacadeTextures(true);
    const concrete = makeConcreteTextures();
    this.metal = sharedMetal();
    const flame = makeFlameSprite();
    const smoke = makeSmokeSprite();
    const flare = makeFlareSprite();
    this.textures.push(
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
      concrete.map,
      concrete.normalMap,
      concrete.roughnessMap,
      this.metal.map,
      this.metal.normalMap,
      this.metal.roughnessMap,
      this.metal.metalnessMap!,
      flame,
      smoke,
      flare,
    );

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
    const phi = THREE.MathUtils.degToRad(90 - 11);
    const theta = THREE.MathUtils.degToRad(214);
    this.sunDir.setFromSphericalCoords(1, phi, theta);
    uniforms.sunPosition.value.copy(this.sunDir);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(this.sky);
    uniforms.showSunDisc.value = 0;
    this.env = pmrem.fromScene(envScene, 0.02, 0.1, 300).texture;
    uniforms.showSunDisc.value = 1;
    scene.add(this.sky);
    scene.environment = this.env;
    scene.environmentIntensity = 0.92;
    scene.fog = new THREE.FogExp2(0x5a4638, 0.0084);
    scene.background = new THREE.Color(0x1a1614);

    this.hemi = new THREE.HemisphereLight(0xb7c4d8, 0x2c241c, 0.58);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffc9a0, quality.mobile ? 1.55 : 2.05);
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
      new THREE.MeshStandardMaterial({
        map: groundT.map,
        normalMap: groundT.normalMap,
        roughnessMap: groundT.roughnessMap,
        roughness: 0.95,
        metalness: 0.04,
        color: 0x9a9aa0,
        envMapIntensity: 0.35,
      }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.group.add(this.ground);

    const plaza = new THREE.Mesh(
      new THREE.CircleGeometry(22, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0x3a3c42,
        metalness: 0.18,
        roughness: 0.22,
        clearcoat: 0.55,
        clearcoatRoughness: 0.28,
        envMapIntensity: 1.1,
        map: asphaltT.map,
        normalMap: asphaltT.normalMap,
        roughnessMap: asphaltT.roughnessMap,
      }),
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.03;
    plaza.receiveShadow = true;
    this.group.add(plaza);

    const roadMat = new THREE.MeshStandardMaterial({
      map: asphaltT.map,
      normalMap: asphaltT.normalMap,
      roughnessMap: asphaltT.roughnessMap,
      roughness: 0.72,
      metalness: 0.08,
      color: 0x888990,
      envMapIntensity: 0.45,
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

    this.buildBuildings(city, facade, facadeRuin);
    this.buildLamps(city, flare);
    this.buildCars(city);
    this.buildDebris(city);
    this.buildFires(city, flame, smoke, quality);
    this.buildWrecks(city);
    this.buildHangar(concrete);
    this.buildRim();
  }

  private buildBuildings(
    city: CityData,
    facade: ReturnType<typeof makeFacadeTextures>,
    ruin: ReturnType<typeof makeFacadeTextures>,
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
      if (!b.ruined && b.h > 22 && b.tier > 1) {
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
    }
    const intact = boxes.filter((b) => !b.ruined);
    const ruined = boxes.filter((b) => b.ruined);
    const wallMat = new THREE.MeshStandardMaterial({
      map: facade.map,
      normalMap: facade.normalMap,
      roughnessMap: facade.roughnessMap,
      emissiveMap: facade.emissiveMap,
      emissive: 0xffe0c0,
      emissiveIntensity: 0.85,
      roughness: 0.72,
      metalness: 0.08,
      color: 0xc4c8ce,
      envMapIntensity: 0.55,
    });
    const ruinMat = wallMat.clone();
    ruinMat.map = ruin.map;
    ruinMat.normalMap = ruin.normalMap;
    ruinMat.roughnessMap = ruin.roughnessMap;
    ruinMat.emissiveMap = ruin.emissiveMap;
    ruinMat.emissiveIntensity = 0.4;
    ruinMat.color = new THREE.Color(0xb0a89c);
    const roofMat = new THREE.MeshStandardMaterial({
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

    for (let i = 0; i < 4; i++) {
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
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2a2c30,
      metalness: 0.72,
      roughness: 0.38,
      envMapIntensity: 0.9,
    });
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x12151a,
      metalness: 0.2,
      roughness: 0.12,
      envMapIntensity: 1.2,
    });
    for (const car of city.cars) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 4.1), bodyMat);
      body.position.y = 0.45;
      body.castShadow = true;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.6), cabinMat);
      cabin.position.set(0, 0.9, -0.3);
      g.add(body, cabin);
      g.position.set(car.x, 0, car.z);
      g.rotation.y = car.yaw;
      g.rotation.z = 0.18;
      this.group.add(g);
    }
  }

  private buildDebris(city: CityData) {
    const mat = new THREE.MeshStandardMaterial({
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
    city.fires.forEach((f, i) => {
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

  private buildWrecks(city: CityData) {
    city.wrecks.forEach((w) => {
      const rig = buildMech(CHASSIS_IDS[w.chassis] ?? "vanguard", true, true);
      rig.root.position.set(w.x, 0, w.z);
      rig.root.rotation.y = w.yaw;
      this.group.add(rig.root);
    });
  }

  private buildHangar(concrete: ReturnType<typeof makeConcreteTextures>) {
    const wallMat = new THREE.MeshStandardMaterial({
      map: concrete.map,
      normalMap: concrete.normalMap,
      roughness: 0.86,
      metalness: 0.08,
      color: 0x8a8e94,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      map: this.metal.map,
      normalMap: this.metal.normalMap,
      roughnessMap: this.metal.roughnessMap,
      metalnessMap: this.metal.metalnessMap,
      color: 0x6a7078,
      metalness: 0.82,
      roughness: 0.32,
      envMapIntensity: 1.1,
    });
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9.5, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0x3e4248,
        metalness: 0.35,
        roughness: 0.28,
        clearcoat: 0.4,
        clearcoatRoughness: 0.35,
        map: concrete.map,
        normalMap: concrete.normalMap,
        envMapIntensity: 1.15,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.06;
    floor.receiveShadow = true;
    this.hangar.add(floor);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(7.2, 0.06, 8, 48),
      new THREE.MeshStandardMaterial({
        color: 0xd8dee8,
        emissive: 0xc5d0dc,
        emissiveIntensity: 1.1,
        roughness: 0.25,
        metalness: 0.4,
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

    for (let i = -2; i <= 2; i++) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.08, 0.45),
        new THREE.MeshStandardMaterial({
          color: 0xf2efe8,
          emissive: 0xfff3dc,
          emissiveIntensity: 2.4,
          roughness: 0.2,
        }),
      );
      strip.position.set(i * 4.6, 13.85, -2);
      this.hangar.add(strip);
      const area = new THREE.RectAreaLight(0xfff1dc, 4.5, 4.5, 0.5);
      area.position.copy(strip.position);
      area.position.y -= 0.2;
      area.lookAt(0, 0, 0);
      this.hangar.add(area);
    }

    const key = new THREE.SpotLight(0xffe6c8, 22, 28, 0.52, 0.42, 1.35);
    key.position.set(-6, 11, 8);
    key.target.position.set(0, 2.4, 0);
    this.hangar.add(key);
    this.hangar.add(key.target);
    const rim = new THREE.SpotLight(0xa8c4e0, 14, 24, 0.65, 0.48, 1.15);
    rim.position.set(8, 9, -6);
    rim.target.position.set(0, 3, 0);
    this.hangar.add(rim);
    this.hangar.add(rim.target);

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
    this.hangar.visible = true;
    this.group.visible = true;
    this.sky.visible = true;
    if (on) {
      this.scene.fog = new THREE.FogExp2(0x3a322c, 0.012);
      this.sun.intensity = 0.85;
      this.hemi.intensity = 0.32;
      this.fill.intensity = 0.12;
      this.scene.environmentIntensity = 0.7;
    } else {
      this.scene.fog = new THREE.FogExp2(0x5a4638, 0.0084);
      this.sun.intensity = this.sun.castShadow ? 2.05 : 1.55;
      this.hemi.intensity = 0.58;
      this.fill.intensity = 0.28;
      this.scene.environmentIntensity = 0.92;
    }
  }

  update(dt: number, time: number, px: number, pz: number) {
    this.sky.material.uniforms.time.value = time * 0.001;
    this.sun.target.position.set(px, 0, pz);
    this.sun.position.set(px + this.sunDir.x * 80, this.sunDir.y * 80, pz + this.sunDir.z * 80);
    this.sun.target.updateMatrixWorld();
    this.sun.shadow.camera.updateProjectionMatrix();

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
