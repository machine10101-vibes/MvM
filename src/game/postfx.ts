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
  software: boolean;
  cheap: boolean;
  shadows: boolean;
  bloom: boolean;
  aa: boolean;
  pixelRatio: number;
  shadowSize: number;
}

function detectSoftwareGl() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2", { powerPreference: "low-power" }) || c.getContext("webgl");
    if (!gl) return true;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    return /swiftshader|llvmpipe|softpipe|microsoft basic render|virtualbox/i.test(name);
  } catch {
    return false;
  }
}

export function detectQuality(): Quality {
  const mobile =
    window.innerWidth < 740 ||
    (typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
  const software = detectSoftwareGl();
  const low = mobile || software;
  return {
    mobile,
    software,
    cheap: low,
    shadows: !low,
    bloom: !low,
    aa: !low,
    pixelRatio: Math.min(window.devicePixelRatio || 1, low ? 1 : 1.25),
    shadowSize: low ? 512 : 1024,
  };
}

export class PostFx {
  composer: EffectComposer;
  private bloom: UnrealBloomPass | null = null;
  private smaa: SMAAPass | null = null;
  private grade: ShaderPass;
  private cheap = false;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private quality: Quality,
  ) {
    this.cheap = !quality.bloom && !quality.aa;
    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(quality.pixelRatio);
    this.composer.addPass(new RenderPass(scene, camera));
    if (quality.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), quality.mobile ? 0.12 : 0.18, 0.4, 0.86);
      this.composer.addPass(this.bloom);
    }
    if (quality.aa) {
      this.smaa = new SMAAPass();
      this.composer.addPass(this.smaa);
    }
    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms.vignette.value = quality.mobile ? 0.22 : 0.3;
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
  }

  setCheap(on: boolean) {
    this.cheap = on;
    if (this.bloom) this.bloom.enabled = !on;
    if (this.smaa) this.smaa.enabled = !on;
  }

  resize(w: number, h: number) {
    this.composer.setSize(w, h);
    this.bloom?.resolution.set(w, h);
  }

  render() {
    if (this.cheap) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.composer.render();
  }

  dispose() {
    this.composer.dispose();
  }
}
