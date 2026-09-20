import { WEAPONS } from "@/game/catalog";
import { useGame } from "@/game/store";
import { cn } from "@/lib/utils";

export function Hud() {
  const hud = useGame((s) => s.hud);
  if (!hud) return null;
  const hp = hud.maxHp ? hud.hp / hud.maxHp : 0;
  const armor = hud.maxArmor ? hud.armor / hud.maxArmor : 0;
  const heat = hud.heatCap ? hud.heat / hud.heatCap : 0;
  const primary = WEAPONS[hud.primary];
  const secondary = WEAPONS[hud.secondary];

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-hud">
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3 pt-[env(safe-area-inset-top)]">
        <div className="min-w-0 max-w-xs space-y-2 rounded-[var(--radius-md)] border border-border bg-bg/70 px-3 py-2 backdrop-blur-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-xs tracking-[0.2em] uppercase">{hud.chassis}</span>
            <span className="font-mono text-xs tabular text-muted">{Math.round(hud.speed)} m/s</span>
          </div>
          <Meter label="Hull" value={hp} danger={hp < 0.3} />
          <Meter label="Plate" value={armor} />
          <Meter label="Heat" value={heat} heat />
          <div className="grid grid-cols-2 gap-2">
            <Meter label="Boost" value={hud.boost} />
            <Meter label="Jets" value={hud.jump} />
          </div>
        </div>
        <Radar contacts={hud.contacts} />
        <div className="rounded-[var(--radius-md)] border border-border bg-bg/70 px-3 py-2 text-right backdrop-blur-sm">
          {hud.mode === "survival" ? (
            <>
              <p className="font-display text-xs tracking-[0.2em] uppercase text-muted">Wave</p>
              <p className="font-mono text-2xl tabular leading-none">{hud.wave}</p>
            </>
          ) : (
            <p className="font-display text-xs tracking-[0.2em] uppercase">{hud.mode}</p>
          )}
          <p className="mt-1 font-mono text-xs tabular text-muted">{hud.kills} kills</p>
        </div>
      </div>

      <div className="absolute inset-0 grid place-items-center">
        <div className="relative h-16 w-16">
          <span className="absolute top-0 left-1/2 h-2 w-px -translate-x-1/2 bg-hud/80" />
          <span className="absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 bg-hud/80" />
          <span className="absolute left-0 top-1/2 h-px w-2 -translate-y-1/2 bg-hud/80" />
          <span className="absolute right-0 top-1/2 h-px w-2 -translate-y-1/2 bg-hud/80" />
          <span className="absolute top-1/2 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hud" />
          {hud.hitFlash > 0.15 ? (
            <>
              <span className="absolute top-2 left-2 h-3 w-3 border-t border-l border-hud" />
              <span className="absolute top-2 right-2 h-3 w-3 border-t border-r border-hud" />
              <span className="absolute bottom-2 left-2 h-3 w-3 border-b border-l border-hud" />
              <span className="absolute right-2 bottom-2 h-3 w-3 border-r border-b border-hud" />
            </>
          ) : null}
        </div>
      </div>

      {hud.lock > 0 ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-10 text-center">
          <p className="font-mono text-xs tracking-widest uppercase">
            {hud.lock >= 1 ? "LOCK" : `ACQ ${Math.round(hud.lock * 100)}`}
          </p>
          {hud.lockName ? <p className="text-xs text-muted">{hud.lockName}</p> : null}
        </div>
      ) : null}

      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 pb-[env(safe-area-inset-bottom)] max-md:bottom-28">
        <div className="rounded-[var(--radius-md)] border border-border bg-bg/70 px-3 py-2 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-widest text-muted">Primary</p>
          <p className="font-display text-sm">{primary.name}</p>
          <Cooldown frac={hud.cdPrimary} />
        </div>
        <div className="hidden max-w-sm text-center font-mono text-[10px] tracking-widest text-muted uppercase sm:block">
          WASD move · mouse aim · LMB fire · RMB alt · shift boost · space jets
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-bg/70 px-3 py-2 text-right backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-widest text-muted">Secondary</p>
          <p className="font-display text-sm">{secondary.name}</p>
          <Cooldown frac={hud.cdSecondary} />
        </div>
      </div>

      {hud.overheat ? (
        <p className="absolute top-[28%] left-1/2 -translate-x-1/2 font-display text-sm tracking-[0.25em] text-heat uppercase">
          Overheat
        </p>
      ) : null}
      {hud.toast ? (
        <p className="absolute top-[22%] left-1/2 -translate-x-1/2 font-display text-xl tracking-[0.2em] uppercase">
          {hud.toast}
        </p>
      ) : null}
      {hud.pickupName ? (
        <p className="absolute top-[32%] left-1/2 -translate-x-1/2 text-sm text-fg">Salvaged {hud.pickupName}</p>
      ) : null}
    </div>
  );
}

function Cooldown({ frac }: { frac: number }) {
  const v = Math.max(0, Math.min(1, frac));
  if (v <= 0) return null;
  return <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-elevated"><div className="h-full bg-muted" style={{ width: `${(1 - v) * 100}%` }} /></div>;
}

function Radar({ contacts }: { contacts: { x: number; z: number; foe: boolean }[] }) {
  const range = 90;
  return (
    <div className="relative hidden h-24 w-24 shrink-0 overflow-hidden rounded-full border border-border bg-bg/70 backdrop-blur-sm md:block">
      <span className="absolute inset-[18%] rounded-full border border-border/80" />
      <span className="absolute top-1/2 left-1/2 h-px w-full -translate-y-1/2 bg-border" />
      <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-border" />
      <span className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hud" />
      {contacts.map((c, i) => {
        const nx = c.x / range;
        const nz = c.z / range;
        const m = Math.hypot(nx, nz);
        const k = m > 1 ? 1 / m : 1;
        const left = 50 + nx * k * 42;
        const top = 50 - nz * k * 42;
        return (
          <span
            key={i}
            className={cn("absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full", c.foe ? "bg-heat" : "bg-ok")}
            style={{ left: `${left}%`, top: `${top}%` }}
          />
        );
      })}
    </div>
  );
}

function Meter({
  label,
  value,
  danger,
  heat,
}: {
  label: string;
  value: number;
  danger?: boolean;
  heat?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between font-mono text-[10px] tracking-widest text-muted uppercase">
        <span>{label}</span>
        <span className="tabular">{Math.round(value * 100)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
        <div
          className={cn(
            "h-full rounded-full bg-hud transition-[width] duration-150",
            danger && "bg-danger",
            heat && value > 0.75 && "bg-heat",
          )}
          style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        />
      </div>
    </div>
  );
}
