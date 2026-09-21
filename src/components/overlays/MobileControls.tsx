import { useEffect, useRef } from "react";
import { input } from "@/game/input";
import { useGame } from "@/game/store";

export function MobileControls() {
  const chassis = useGame((s) => s.hud?.chassis ?? s.loadout.chassis);
  const aerial = chassis === "valkyrie";
  return (
    <div className="pointer-events-none absolute inset-0 z-20 md:hidden">
      <Stick side="left" />
      <Stick side="right" />
      <div className="pointer-events-auto absolute right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex gap-3">
        <HoldButton label={aerial ? "Field" : "Dome"} on="shield" />
        <HoldButton label={aerial ? "Chin" : "Core"} on="special" />
        <HoldButton label="Jets" on="jump" />
        <HoldButton label="Boost" on="boost" />
        <HoldButton label="Alt" on="alt" />
        <HoldButton label="Fire" on="fire" primary />
      </div>
    </div>
  );
}

function HoldButton({
  label,
  on,
  primary,
}: {
  label: string;
  on: "fire" | "alt" | "boost" | "jump" | "special" | "shield";
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={`h-14 min-w-14 rounded-full border px-3 font-display text-xs uppercase tracking-wide ${
        primary ? "border-fg/40 bg-primary text-primary-fg" : "border-border bg-bg/70 text-fg backdrop-blur-sm"
      }`}
      onPointerDown={(e) => {
        e.preventDefault();
        input.touch[on] = true;
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
      }}
      onPointerUp={() => {
        input.touch[on] = false;
      }}
      onPointerCancel={() => {
        input.touch[on] = false;
      }}
    >
      {label}
    </button>
  );
}

function Stick({ side }: { side: "left" | "right" }) {
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  useEffect(() => {
    return () => {
      if (side === "left") {
        input.touch.moveX = 0;
        input.touch.moveY = 0;
      } else {
        input.touch.aimX = 0;
        input.touch.aimY = 0;
      }
    };
  }, [side]);

  return (
    <div
      className={`pointer-events-auto absolute h-36 w-36 ${
        side === "left"
          ? "left-3 bottom-[max(5.5rem,env(safe-area-inset-bottom))]"
          : "right-3 bottom-[max(10.5rem,env(safe-area-inset-bottom))]"
      }`}
      onPointerDown={(e) => {
        origin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const o = origin.current;
        if (!o || o.id !== e.pointerId) return;
        const dx = (e.clientX - o.x) / 48;
        const dy = (e.clientY - o.y) / 48;
        const m = Math.hypot(dx, dy) || 1;
        const nx = (dx / m) * Math.min(1, m);
        const ny = (dy / m) * Math.min(1, m);
        if (side === "left") {
          input.touch.moveX = nx;
          input.touch.moveY = -ny;
        } else {
          input.touch.aimX = nx;
          input.touch.aimY = ny;
        }
      }}
      onPointerUp={() => {
        origin.current = null;
        if (side === "left") {
          input.touch.moveX = 0;
          input.touch.moveY = 0;
        } else {
          input.touch.aimX = 0;
          input.touch.aimY = 0;
        }
      }}
      onPointerCancel={() => {
        origin.current = null;
        if (side === "left") {
          input.touch.moveX = 0;
          input.touch.moveY = 0;
        } else {
          input.touch.aimX = 0;
          input.touch.aimY = 0;
        }
      }}
    >
      <div className="grid h-full w-full place-items-center rounded-full border border-border bg-bg/40">
        <div className="h-16 w-16 rounded-full border border-border-strong bg-elevated/80" />
      </div>
    </div>
  );
}
