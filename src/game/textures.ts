import * as THREE from "three";

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2d");
  return { c, ctx };
}

function hash2(ix: number, iy: number, period: number) {
  const x = ((ix % period) + period) % period;
  const y = ((iy % period) + period) % period;
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function valueNoise(x: number, y: number, period: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const xf = x - x0;
  const yf = y - y0;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const n00 = hash2(x0, y0, period);
  const n10 = hash2(x0 + 1, y0, period);
  const n01 = hash2(x0, y0 + 1, period);
  const n11 = hash2(x0 + 1, y0 + 1, period);
  return n00 * (1 - u) * (1 - v) + n10 * u * (1 - v) + n01 * (1 - u) * v + n11 * u * v;
}

function fbm(x: number, y: number, period: number, oct = 5) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * valueNoise(x * freq, y * freq, Math.max(2, period * freq));
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function tex(c: HTMLCanvasElement, opts: { repeat?: number; color?: boolean; aniso?: number }) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(opts.repeat ?? 1, opts.repeat ?? 1);
  t.anisotropy = opts.aniso ?? 4;
  t.colorSpace = opts.color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

function heightToNormal(height: Float32Array, size: number, strength: number) {
  const { c, ctx } = canvas(size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = height[y * size + ((x + size - 1) % size)];
      const r = height[y * size + ((x + 1) % size)];
      const u = height[((y + size - 1) % size) * size + x];
      const dn = height[((y + 1) % size) * size + x];
      const nx = (l - r) * strength;
      const ny = (u - dn) * strength;
      const nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      d[i] = (nx * inv * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
      d[i + 2] = (nz * inv * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function fillRgb(ctx: CanvasRenderingContext2D, size: number, fn: (x: number, y: number) => [number, number, number]) {
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * size + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function makeGroundTextures(cheap = false) {
  const size = cheap ? 128 : 256;
  const period = 8;
  const height = new Float32Array(size * size);
  const { c: albedoC, ctx } = canvas(size);
  fillRgb(ctx, size, (x, y) => {
    const u = (x / size) * period;
    const v = (y / size) * period;
    const n = fbm(u, v, period, cheap ? 3 : 5);
    const cracks = cheap ? 0 : Math.pow(Math.abs(fbm(u * 2.4, v * 2.4, period * 2, 3) - 0.5) * 2, 6);
    const stain = cheap ? n : fbm(u * 0.6 + 20, v * 0.6, period, 4);
    height[y * size + x] = n * 0.7 + cracks * 0.45;
    const ash = 38 + n * 42 + stain * 18;
    const r = ash + 8 - cracks * 28;
    const g = ash - 2 - cracks * 24;
    const b = ash - 8 - cracks * 20;
    return [r, g, b];
  });
  if (cheap) {
    return { map: tex(albedoC, { repeat: 28, color: true }), normalMap: null, roughnessMap: null };
  }
  const { c: roughC, ctx: rctx } = canvas(size);
  fillRgb(rctx, size, (x, y) => {
    const n = height[y * size + x];
    const g = 150 + n * 90;
    return [g, g, g];
  });
  return {
    map: tex(albedoC, { repeat: 28, color: true }),
    normalMap: tex(heightToNormal(height, size, 8), { repeat: 28 }),
    roughnessMap: tex(roughC, { repeat: 28 }),
  };
}

export function makeAsphaltTextures(cheap = false) {
  const size = cheap ? 128 : 256;
  const period = 4;
  const height = new Float32Array(size * size);
  const { c, ctx } = canvas(size);
  fillRgb(ctx, size, (x, y) => {
    const u = (x / size) * period;
    const v = (y / size) * period;
    const n = fbm(u, v, period, cheap ? 3 : 5);
    const oil = cheap ? 0 : Math.max(0, fbm(u * 1.8 + 9, v * 1.8, period, 3) - 0.62) * 3;
    height[y * size + x] = n + oil * 0.2;
    let r = 28 + n * 22;
    let g = 28 + n * 20;
    let b = 30 + n * 18;
    const dash = Math.abs(x - size / 2) < 6 && y % 48 < 22;
    if (dash) {
      r = g = b = 168;
    }
    r = r * (1 - oil * 0.35);
    g = g * (1 - oil * 0.28);
    b = b * (1 - oil * 0.15);
    return [r, g, b];
  });
  if (cheap) {
    return { map: tex(c, { repeat: 2, color: true }), normalMap: null, roughnessMap: null };
  }
  const { c: roughC, ctx: rctx } = canvas(size);
  fillRgb(rctx, size, (x, y) => {
    const oil = Math.max(0, fbm((x / size) * 4 * 1.8 + 9, (y / size) * 4 * 1.8, 8, 3) - 0.62);
    const g = 210 - oil * 400;
    return [g, g, g];
  });
  return {
    map: tex(c, { repeat: 2, color: true }),
    normalMap: tex(heightToNormal(height, size, 6), { repeat: 2 }),
    roughnessMap: tex(roughC, { repeat: 2 }),
  };
}

export function makeFacadeTextures(ruined: boolean, cheap = false) {
  const size = cheap ? 128 : 256;
  const cols = 6;
  const rows = 10;
  const height = new Float32Array(size * size);
  const { c, ctx } = canvas(size);
  const { c: emitC, ctx: ectx } = canvas(size);
  const { c: roughC, ctx: rctx } = canvas(size);
  ectx.fillStyle = "#000";
  ectx.fillRect(0, 0, size, size);
  rctx.fillStyle = "#c8c8c8";
  rctx.fillRect(0, 0, size, size);
  ctx.fillStyle = ruined ? "#3a3733" : "#2c3036";
  ctx.fillRect(0, 0, size, size);

  if (!cheap) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const n = fbm((x / size) * 6, (y / size) * 6, 6, 4);
        height[y * size + x] = n * 0.25;
      }
    }
  }

  const cellW = size / cols;
  const cellH = size / rows;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const dead = ruined && Math.random() < 0.4;
      if (dead) continue;
      const lit = Math.random() < (ruined ? 0.14 : 0.38);
      const wx = 10 + col * cellW;
      const wy = 8 + row * cellH;
      const ww = cellW * 0.52;
      const hh = cellH * 0.46;
      const warm = Math.random() < 0.35;
      if (lit) {
        ctx.fillStyle = warm ? "#d4a574" : "#b7c4d4";
        ectx.fillStyle = warm ? "#e8b07a" : "#c5d4e6";
      } else {
        ctx.fillStyle = "#0b0d10";
        ectx.fillStyle = "#000";
      }
      ctx.fillRect(wx, wy, ww, hh);
      if (lit) ectx.fillRect(wx, wy, ww, hh);
      rctx.fillStyle = lit ? "#3a3a3a" : "#8a8a8a";
      rctx.fillRect(wx, wy, ww, hh);
      for (let yy = 0; yy < hh; yy++) {
        for (let xx = 0; xx < ww; xx++) {
          const px = Math.floor(wx + xx);
          const py = Math.floor(wy + yy);
          if (px >= 0 && py >= 0 && px < size && py < size) height[py * size + px] = 0.02;
        }
      }
    }
  }

  if (ruined) {
    ctx.fillStyle = "rgba(12,10,8,0.5)";
    ctx.beginPath();
    ctx.moveTo(0, 300);
    ctx.lineTo(size, 160);
    ctx.lineTo(size, size);
    ctx.lineTo(0, size);
    ctx.fill();
  }

  if (!cheap) {
    const frame = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < size * size; i++) {
      const n = (fbm((i % size) / 40, Math.floor(i / size) / 40, 8, 2) - 0.5) * 18;
      frame.data[i * 4] = Math.max(0, Math.min(255, frame.data[i * 4] + n));
      frame.data[i * 4 + 1] = Math.max(0, Math.min(255, frame.data[i * 4 + 1] + n));
      frame.data[i * 4 + 2] = Math.max(0, Math.min(255, frame.data[i * 4 + 2] + n));
    }
    ctx.putImageData(frame, 0, 0);
  }

  return {
    map: tex(c, { color: true, aniso: 4 }),
    normalMap: cheap ? null : tex(heightToNormal(height, size, 12), {}),
    roughnessMap: cheap ? null : tex(roughC, {}),
    emissiveMap: tex(emitC, { color: true }),
  };
}

export function makeMetalTextures() {
  const size = 128;
  const period = 6;
  const height = new Float32Array(size * size);
  const { c, ctx } = canvas(size);
  fillRgb(ctx, size, (x, y) => {
    const u = (x / size) * period;
    const v = (y / size) * period;
    const brush = valueNoise(u * 18, v * 0.4, period * 18);
    const panelX = Math.abs(Math.sin((x / size) * Math.PI * 8));
    const panelY = Math.abs(Math.sin((y / size) * Math.PI * 6));
    const seam = panelX < 0.06 || panelY < 0.06 ? 0.35 : 0;
    const scratch = Math.pow(valueNoise(u * 30, v * 4, period * 16), 8);
    const n = fbm(u, v, period, 3);
    height[y * size + x] = n * 0.4 + seam * 0.8 + scratch * 0.3 + brush * 0.12;
    const base = 92 + brush * 40 + n * 20 - seam * 50;
    return [base + 4, base, base - 6];
  });
  const { c: roughC, ctx: rctx } = canvas(size);
  fillRgb(rctx, size, (x, y) => {
    const g = 70 + height[y * size + x] * 120;
    return [g, g, g];
  });
  const { c: metalC, ctx: mctx } = canvas(size);
  fillRgb(mctx, size, (x, y) => {
    const g = 200 - height[y * size + x] * 80;
    return [g, g, g];
  });
  return {
    map: tex(c, { repeat: 3, color: true }),
    normalMap: tex(heightToNormal(height, size, 10), { repeat: 3 }),
    roughnessMap: tex(roughC, { repeat: 3 }),
    metalnessMap: tex(metalC, { repeat: 3 }),
  };
}

let _metal: ReturnType<typeof makeMetalTextures> | null = null;
export function sharedMetal() {
  if (!_metal) _metal = makeMetalTextures();
  return _metal;
}

export function makeArmorTextures() {
  const size = 128;
  const period = 8;
  const height = new Float32Array(size * size);
  const { c, ctx } = canvas(size);
  const { c: roughC, ctx: rctx } = canvas(size);
  const { c: metalC, ctx: mctx } = canvas(size);

  const panelsX = 8;
  const panelsY = 8;
  const pw = size / panelsX;
  const ph = size / panelsY;

  fillRgb(ctx, size, (x, y) => {
    const u = (x / size) * period;
    const v = (y / size) * period;
    const n = fbm(u, v, period, 3);
    const brush = valueNoise(u * 22, v * 0.35, period * 16);
    const px = x % pw;
    const py = y % ph;
    const inset = 7;
    const seam = px < inset || py < inset || px > pw - inset || py > ph - inset ? 1 : 0;
    const innerSeam = px < 3 || py < 3 || px > pw - 3 || py > ph - 3 ? 1 : 0;
    const scratch = Math.pow(valueNoise(u * 36, v * 3.2, period * 20), 10);
    const chip = Math.pow(valueNoise(u * 14 + 8, v * 14, period * 10), 7);
    const dirt = fbm(u * 0.8 + 4, v * 0.8, period, 3);
    const nearRivet =
      ((px > 10 && px < 16) || (px > pw - 16 && px < pw - 10)) &&
      ((py > 10 && py < 16) || (py > ph - 16 && py < ph - 10));
    const rx = px < pw / 2 ? px - 13 : px - (pw - 13);
    const ry = py < ph / 2 ? py - 13 : py - (ph - 13);
    const rivetH = nearRivet ? Math.max(0, 1 - Math.hypot(rx, ry) / 3.2) : 0;
    height[y * size + x] =
      n * 0.22 + seam * 0.55 + innerSeam * 0.35 + scratch * 0.28 + rivetH * 0.85 + chip * 0.2 + brush * 0.08;

    const panelShade = 188 + n * 22 + brush * 16 - dirt * 14;
    let r = panelShade + 8;
    let g = panelShade + 4;
    let b = panelShade - 2;
    if (seam) {
      r -= 52;
      g -= 48;
      b -= 42;
    }
    if (innerSeam) {
      r -= 24;
      g -= 22;
      b -= 18;
    }
    r -= scratch * 36;
    g -= scratch * 34;
    b -= scratch * 28;
    r -= chip * 18;
    g -= chip * 14;
    if (rivetH > 0.2) {
      r = 220 + rivetH * 20;
      g = 222 + rivetH * 20;
      b = 226 + rivetH * 20;
    }
    return [r, g, b];
  });

  fillRgb(rctx, size, (x, y) => {
    const h = height[y * size + x];
    const g = 58 + h * 150;
    return [g, g, g];
  });
  fillRgb(mctx, size, (x, y) => {
    const h = height[y * size + x];
    const g = 210 - h * 70;
    return [g, g, g];
  });

  return {
    map: tex(c, { repeat: 2.4, color: true, aniso: 8 }),
    normalMap: tex(heightToNormal(height, size, 14), { repeat: 2.4, aniso: 8 }),
    roughnessMap: tex(roughC, { repeat: 2.4 }),
    metalnessMap: tex(metalC, { repeat: 2.4 }),
  };
}

let _armor: ReturnType<typeof makeArmorTextures> | null = null;
export function sharedArmor() {
  if (!_armor) _armor = makeArmorTextures();
  return _armor;
}

export function makeHazardTexture() {
  const size = 128;
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#1a1408";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#e0b43a";
  ctx.lineWidth = 28;
  for (let i = -size; i < size * 2; i += 46) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }
  return tex(c, { repeat: 2, color: true, aniso: 4 });
}

let _hazard: THREE.CanvasTexture | null = null;
export function sharedHazard() {
  if (!_hazard) _hazard = makeHazardTexture();
  return _hazard;
}

export function makeVisorTexture() {
  const size = 128;
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#071018";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(90, 200, 230, 0.28)";
  ctx.lineWidth = 1;
  for (let i = 16; i < size; i += 16) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(180, 240, 255, 0.55)";
  ctx.strokeRect(18, 40, size - 36, size - 80);
  ctx.fillStyle = "rgba(120, 220, 255, 0.18)";
  ctx.fillRect(28, 118, 80, 6);
  ctx.fillRect(28, 132, 48, 4);
  ctx.fillRect(160, 118, 56, 10);
  const t = tex(c, { repeat: 1, color: true, aniso: 4 });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

let _visor: THREE.CanvasTexture | null = null;
export function sharedVisor() {
  if (!_visor) _visor = makeVisorTexture();
  return _visor;
}

const markCache = new Map<string, THREE.CanvasTexture>();
export function chassisMark(letter: string, ink: string) {
  const key = letter + ink;
  const hit = markCache.get(key);
  if (hit) return hit;
  const size = 256;
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#0c0e12";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, size - 28, size - 28);
  ctx.strokeRect(28, 28, size - 56, size - 56);
  ctx.fillStyle = ink;
  ctx.font = "bold 148px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, size / 2, size / 2 + 8);
  const t = tex(c, { repeat: 1, color: true, aniso: 4 });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  markCache.set(key, t);
  return t;
}

export function makeRubberTextures() {
  const size = 256;
  const period = 4;
  const height = new Float32Array(size * size);
  const { c, ctx } = canvas(size);
  fillRgb(ctx, size, (x, y) => {
    const n = fbm((x / size) * period, (y / size) * period, period, 4);
    const rib = Math.abs(Math.sin((y / size) * Math.PI * 18));
    height[y * size + x] = n * 0.4 + rib * 0.35;
    const g = 22 + n * 14 + rib * 8;
    return [g + 4, g, g - 2];
  });
  return {
    map: tex(c, { repeat: 4, color: true }),
    normalMap: tex(heightToNormal(height, size, 8), { repeat: 4 }),
  };
}

let _rubber: ReturnType<typeof makeRubberTextures> | null = null;
export function sharedRubber() {
  if (!_rubber) _rubber = makeRubberTextures();
  return _rubber;
}

export function makeConcreteTextures() {
  const size = 256;
  const period = 4;
  const height = new Float32Array(size * size);
  const { c, ctx } = canvas(size);
  fillRgb(ctx, size, (x, y) => {
    const n = fbm((x / size) * period, (y / size) * period, period, 5);
    height[y * size + x] = n;
    const g = 48 + n * 36;
    return [g + 4, g, g - 4];
  });
  return {
    map: tex(c, { repeat: 6, color: true }),
    normalMap: tex(heightToNormal(height, size, 7), { repeat: 6 }),
    roughnessMap: tex(c, { repeat: 6 }),
  };
}

function glowSprite(inner: string, outer: string, size = 128) {
  const { c, ctx } = canvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.25, outer);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeMuzzleSprite() {
  return glowSprite("rgba(255,244,220,1)", "rgba(255,170,90,0.7)");
}

export function makeExplosionSprite() {
  return glowSprite("rgba(255,230,190,1)", "rgba(210,80,30,0.85)", 256);
}

export function makeFlameSprite() {
  const { c, ctx } = canvas(128);
  const g = ctx.createRadialGradient(64, 90, 4, 64, 50, 70);
  g.addColorStop(0, "rgba(255,240,200,1)");
  g.addColorStop(0.25, "rgba(255,140,40,0.9)");
  g.addColorStop(0.65, "rgba(180,30,10,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeSmokeSprite() {
  return glowSprite("rgba(40,38,36,0.55)", "rgba(20,18,16,0.15)", 128);
}

export function makeFlareSprite() {
  return glowSprite("rgba(255,236,210,1)", "rgba(255,180,80,0.4)", 64);
}

/** Red honeycomb used on the Titan crown — matches the reference hex cell panel. */
export function makeHexCellMap() {
  const size = 256;
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#080305";
  ctx.fillRect(0, 0, size, size);
  const r = 28;
  const h = r * Math.sqrt(3);
  for (let row = -1; row < size / h + 2; row++) {
    for (let col = -1; col < size / (r * 1.5) + 2; col++) {
      const x = col * r * 1.5;
      const y = row * h + (col % 2 === 0 ? 0 : h * 0.5);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + r * 0.92 * Math.cos(a);
        const py = y + r * 0.92 * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      const pulse = ((col * 17 + row * 31) % 5) === 0 ? 1 : 0.55;
      const grd = ctx.createRadialGradient(x, y, 2, x, y, r * 0.7);
      grd.addColorStop(0, `rgba(255,70,48,${0.95 * pulse})`);
      grd.addColorStop(0.45, `rgba(180,18,22,${0.55 * pulse})`);
      grd.addColorStop(1, "rgba(40,6,8,0.95)");
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,56,40,${0.95 * pulse})`;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
  }
  const t = tex(c, { repeat: 1, color: true, aniso: 8 });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Recessed cyclops — dark metal well, one red ring, hot pupil. */
export function makeCyclopsIrisMap() {
  const size = 256;
  const { c, ctx } = canvas(size);
  const cx = size / 2;
  const cy = size / 2;
  ctx.fillStyle = "#07080a";
  ctx.fillRect(0, 0, size, size);
  const rings: [number, string][] = [
    [1.0, "#121418"],
    [0.9, "#1c2026"],
    [0.78, "#0a0c10"],
    [0.62, "#ff2a22"],
    [0.54, "#140606"],
    [0.38, "#1a0a0a"],
    [0.22, "#ff3a28"],
    [0.1, "#ffe0c0"],
  ];
  for (const [t, color] of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, (size / 2) * t, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,48,36,0.7)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.31, 0, Math.PI * 2);
  ctx.stroke();
  const t = tex(c, { repeat: 1, color: true, aniso: 8 });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** High-contrast plate grid so Titan armor reads even without IBL. */
export function makeTitanHullMap() {
  const size = 256;
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#08090c";
  ctx.fillRect(0, 0, size, size);
  const pw = 48;
  const ph = 36;
  for (let y = 0; y < size; y += ph) {
    const stagger = (Math.floor(y / ph) % 2) * (pw / 2);
    for (let x = -pw; x < size + pw; x += pw) {
      const px = x + stagger;
      const shade = 72 + ((x / pw + y / ph) % 3) * 18;
      ctx.fillStyle = `rgb(${shade + 10},${shade + 6},${shade})`;
      ctx.fillRect(px + 6, y + 6, pw - 12, ph - 12);
      ctx.strokeStyle = "#050608";
      ctx.lineWidth = 7;
      ctx.strokeRect(px + 3, y + 3, pw - 6, ph - 6);
      ctx.strokeStyle = "rgba(255,42,32,0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 10, y + 10, pw - 20, ph - 20);
      ctx.fillStyle = "#d0d6dc";
      ctx.beginPath();
      ctx.arc(px + 16, y + 16, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + pw - 16, y + 16, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + 16, y + ph - 16, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + pw - 16, y + ph - 16, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return {
    map: tex(c, { repeat: 2, color: true, aniso: 4 }),
  };
}

/** Subtle white plates — dark seams greyed the last hangar shot into a waffle. */
export function makeValkyrieHullMap() {
  const size = 256;
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#e8eef4";
  ctx.fillRect(0, 0, size, size);
  const pw = 64;
  const ph = 48;
  for (let y = 0; y < size; y += ph) {
    const stagger = (Math.floor(y / ph) % 2) * (pw / 2);
    for (let x = -pw; x < size + pw; x += pw) {
      const px = x + stagger;
      const n = ((x / pw + y / ph) % 3 + 3) % 3;
      const shade = 232 + n * 6;
      ctx.fillStyle = `rgb(${shade},${shade - 2},${shade - 4})`;
      ctx.fillRect(px + 4, y + 4, pw - 8, ph - 8);
      ctx.strokeStyle = "rgba(20,36,56,0.22)";
      ctx.lineWidth = 2.2;
      ctx.strokeRect(px + 5, y + 5, pw - 10, ph - 10);
      ctx.strokeStyle = "rgba(196,176,110,0.28)";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 12, y + 11, pw - 24, ph - 22);
    }
  }
  return tex(c, { repeat: 2, color: true, aniso: 4 });
}

/** Mid-grey graphene hex cells — dark cells vanished into a black blob. */
export function makePhantomHullMap() {
  const size = 256;
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#14181c";
  ctx.fillRect(0, 0, size, size);
  const r = 16;
  const h = r * Math.sqrt(3);
  let row = 0;
  for (let y = -h; y < size + h; y += h * 0.75) {
    const ox = (row++ % 2) * r * 0.87;
    for (let x = -r; x < size + r; x += r * 1.74) {
      const cx = x + ox;
      const n = ((Math.floor(x) + Math.floor(y)) % 5 + 5) % 5;
      const shade = 108 + n * 14;
      ctx.fillStyle = `rgb(${shade + 8},${shade + 6},${shade})`;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const px = cx + Math.cos(a) * (r - 1.4);
        const py = y + Math.sin(a) * (r - 1.4);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(10,12,14,0.9)";
      ctx.lineWidth = 2.2;
      ctx.stroke();
      if (n === 0) {
        ctx.fillStyle = "rgba(74,212,232,0.35)";
        ctx.beginPath();
        ctx.arc(cx, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return tex(c, { repeat: 2, color: true, aniso: 4 });
}
