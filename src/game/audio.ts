export class GameAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  muted = false;
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private started = false;

  unlock() {
    if (this.started) {
      void this.ctx?.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.28;
    this.master.connect(this.ctx.destination);
    this.started = true;
    this.startEngine();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) void this.ctx?.suspend();
      else void this.ctx?.resume();
    });
  }

  setMuted(v: boolean) {
    this.muted = v;
    if (this.master) this.master.gain.value = v ? 0 : 0.28;
  }

  private startEngine() {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 48;
    g.gain.value = 0.04;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 220;
    osc.connect(f);
    f.connect(g);
    g.connect(this.master);
    osc.start();
    this.engine = osc;
    this.engineGain = g;
  }

  setEngine(speed: number, boost: boolean) {
    if (!this.ctx || !this.engine || !this.engineGain) return;
    const t = this.ctx.currentTime;
    this.engine.frequency.setTargetAtTime(42 + Math.abs(speed) * 1.6 + (boost ? 18 : 0), t, 0.08);
    this.engineGain.gain.setTargetAtTime(0.03 + Math.abs(speed) * 0.002 + (boost ? 0.03 : 0), t, 0.1);
  }

  fire(kind: "hitscan" | "heavy" | "missile" | "plasma") {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    o.connect(f);
    f.connect(g);
    g.connect(this.master);
    if (kind === "hitscan") {
      o.type = "square";
      o.frequency.value = 420;
      f.frequency.value = 1800;
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.07);
      o.start(t);
      o.stop(t + 0.08);
    } else if (kind === "heavy") {
      o.type = "sawtooth";
      o.frequency.value = 90;
      f.frequency.value = 500;
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.start(t);
      o.stop(t + 0.3);
    } else if (kind === "missile") {
      o.type = "triangle";
      o.frequency.value = 180;
      f.frequency.value = 800;
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.4);
      o.start(t);
      o.stop(t + 0.42);
    } else {
      o.type = "sine";
      o.frequency.value = 240;
      f.frequency.value = 1200;
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.start(t);
      o.stop(t + 0.18);
    }
  }

  explode() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  hit() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    o.frequency.value = 160;
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.1);
  }

  ui() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.09);
  }
}

export const audio = new GameAudio();
