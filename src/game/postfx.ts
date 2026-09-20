import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    vignette: { value: 0.32 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = length(vUv - 0.5);
      float v = smoothstep(0.38, 1.05, d);
      c.rgb *= 1.0 - v * vignette;
      gl_FragColor = c;
    }
  `,
};

export interface Quality {
  mobile: boolean;
  shadows: boolean;
  bloom: boolean;
  aa: boolean;
  pixelRatio: number;
  shadowSize: number;
}

export function detectQuality(): Quality {
  const mobile =
    window.innerWidth < 740 ||
    (typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
  return {
    mobile,
    shadows: !mobile,
    bloom: true,
    aa: !mobile,
    pixelRatio: Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75),
    shadowSize: mobile ? 512 : 2048,
  };
}

export class PostFx {
  composer: EffectComposer;
  private bloom: UnrealBloomPass | null = null;
  private smaa: SMAAPass | null = null;
  private grade: ShaderPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    private quality: Quality,
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(quality.pixelRatio);
    this.composer.addPass(new RenderPass(scene, camera));
    if (quality.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), quality.mobile ? 0.22 : 0.34, 0.48, 0.78);
      this.composer.addPass(this.bloom);
    }
    if (quality.aa) {
      this.smaa = new SMAAPass();
      this.composer.addPass(this.smaa);
    }
    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms.vignette.value = quality.mobile ? 0.22 : 0.34;
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
  }

  resize(w: number, h: number) {
    this.composer.setSize(w, h);
    this.bloom?.resolution.set(w, h);
  }

  render() {
    this.composer.render();
  }

  dispose() {
    this.composer.dispose();
  }
}
