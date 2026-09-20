import { clamp } from "@/lib/utils";
import type { Actions } from "./types";

const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyE",
  "KeyQ",
  "KeyR",
  "KeyF",
  "Escape",
  "KeyP",
]);

function radialDeadzone(x: number, y: number, dz = 0.16) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export class Input {
  keys = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  firing = false;
  altFiring = false;
  lookSense = 0.0022;
  qaKeys: string[] | null = null;
  qaSteer: number | null = null;
  touch = {
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    fire: false,
    alt: false,
    boost: false,
    jump: false,
  };
  locked = false;
  private canvas: HTMLElement | null = null;

  attach(el: HTMLElement) {
    this.canvas = el;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clear);
    document.addEventListener("visibilitychange", this.onVis);
    el.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointermove", this.onPointerMove);
    document.addEventListener("pointerlockchange", this.onLock);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clear);
    document.removeEventListener("visibilitychange", this.onVis);
    this.canvas?.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerlockchange", this.onLock);
  }

  requestLock() {
    this.canvas?.requestPointerLock?.();
  }

  private onLock = () => {
    this.locked = document.pointerLockElement === this.canvas;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      return;
    }
    this.keys.add(e.code);
    if (GAME_KEYS.has(e.code)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onVis = () => {
    if (document.hidden) this.clear();
  };

  private clear = () => {
    this.keys.clear();
    this.firing = false;
    this.altFiring = false;
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.button === 0) this.firing = true;
    if (e.button === 2) this.altFiring = true;
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.button === 0) this.firing = false;
    if (e.button === 2) this.altFiring = false;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.locked) return;
    this.mouseDX += e.movementX;
    this.mouseDY += e.movementY;
  };

  consumeLook() {
    const x = this.mouseDX;
    const y = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { x, y };
  }

  getActions(): Actions {
    const keys = this.qaKeys ? new Set(this.qaKeys) : this.keys;
    const look = this.consumeLook();

    let throttle = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) throttle += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) throttle -= 1;
    throttle += this.touch.moveY;
    throttle = clamp(throttle, -1, 1);

    let steer = 0;
    if (this.qaSteer != null) {
      steer = this.qaSteer;
    } else {
      if (keys.has("KeyA") || keys.has("ArrowLeft")) steer += 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) steer -= 1;
      steer -= this.touch.moveX;
    }
    steer = clamp(steer, -1, 1);

    const rawPads = typeof navigator !== "undefined" ? navigator.getGamepads?.() : null;
    const pads = rawPads ? Array.from(rawPads) : [];
    for (const pad of pads) {
      if (!pad || pad.mapping !== "standard") continue;
      const ls = radialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      const rs = radialDeadzone(pad.axes[2] ?? 0, pad.axes[3] ?? 0);
      throttle += -ls.y;
      steer += -ls.x;
      look.x += rs.x * 14;
      look.y += rs.y * 10;
      if (pad.buttons[7]?.value) throttle = Math.max(throttle, pad.buttons[7].value);
      if (pad.buttons[6]?.pressed) this.touch.boost = true;
      if (pad.buttons[0]?.pressed) this.touch.jump = true;
      if (pad.buttons[5]?.pressed) this.firing = true;
      if (pad.buttons[4]?.pressed) this.altFiring = true;
    }

    return {
      throttle: clamp(throttle, -1, 1),
      steer: clamp(steer, -1, 1),
      aimX: look.x * this.lookSense + this.touch.aimX * 0.045,
      aimY: look.y * this.lookSense + this.touch.aimY * 0.03,
      fire: this.firing || this.touch.fire || keys.has("KeyF"),
      alt: this.altFiring || this.touch.alt || keys.has("KeyE"),
      boost: keys.has("ShiftLeft") || keys.has("ShiftRight") || this.touch.boost,
      jump: keys.has("Space") || this.touch.jump,
      pause: keys.has("Escape") || keys.has("KeyP"),
    };
  }
}

export const input = new Input();
