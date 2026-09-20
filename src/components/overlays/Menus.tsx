import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CHASSIS, CHASSIS_LIST, WEAPON_LIST, WEAPONS } from "@/game/catalog";
import { useGame } from "@/game/store";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, SignInGate, UserButton } from "@/lib/auth/gates";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  claimUsername,
  getHangar,
  getProfile,
  listFriends,
  respondFriendRequest,
  saveHangar,
  saveRun,
  searchPlayers,
  sendFriendRequest,
  sendInvite,
} from "@/lib/game/api";
import { useP2PRoom } from "@/lib/multiplayer";
import type { ChassisId, ItemDef, MatchMode, WeaponId } from "@/game/types";
import { cn } from "@/lib/utils";
import type { Engine } from "@/game/engine";

export function TitleOverlay({ engine, onStart }: { engine: Engine | null; onStart: () => void }) {
  const setScreen = useGame((s) => s.setScreen);
  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between bg-gradient-to-b from-bg/70 via-transparent to-bg/80 p-6 pt-[max(3rem,calc(env(safe-area-inset-top)+2.5rem))] pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))]">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-xs tracking-[0.4em] text-muted">MECH VS MECH</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-6xl">MVM</h1>
        </div>
        <AuthChip />
      </header>
      <div className="max-w-md space-y-4">
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          Helix is ash. Salvage weapons and plating from the wrecks. One chassis. Endless hostiles — or three friends.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button size="lg" onClick={onStart} disabled={!engine}>
            Start Survival
          </Button>
          <Button size="lg" variant="secondary" onClick={() => { engine?.setView("hangar"); setScreen("hangar"); }}>
            Hangar
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setScreen("lobby")}>
            Multiplayer
          </Button>
        </div>
        <p className="hidden text-xs text-subtle sm:block">
          W/S throttle · A/D turn · Q/C strafe · mouse aim · LMB fire · RMB/E alt · R vent · Shift boost · Space jets
        </p>
      </div>
    </div>
  );
}

export function HangarOverlay({ engine }: { engine: Engine | null }) {
  const { loadout, setChassis, setWeapons, setScreen, setLoadout } = useGame();
  const user = useCurrentUser();
  const def = CHASSIS[loadout.chassis];
  const [walk, setWalk] = useState(false);

  useEffect(() => {
    engine?.setView("hangar");
    engine?.setHangar(loadout.chassis);
  }, [engine, loadout.chassis]);

  useEffect(() => {
    if (!user) return;
    void getHangar()
      .then((row) => {
        if (!row) return;
        const chassis = (row.chassis_id as ChassisId) || loadout.chassis;
        setChassis(chassis);
        const stored = row.loadout;
        setLoadout({
          chassis,
          primary: (stored.primary as WeaponId) ?? CHASSIS[chassis].primary,
          secondary: (stored.secondary as WeaponId) ?? CHASSIS[chassis].secondary,
          items: (stored.items ?? []) as ItemDef[],
        });
      })
      .catch(() => undefined);
  }, [user]);

  function pick(id: ChassisId) {
    setChassis(id);
    engine?.setHangar(id);
  }

  function pickWeapon(slot: "primary" | "secondary", id: WeaponId) {
    setWeapons(slot, id);
    const next = { ...useGame.getState().loadout, [slot]: id };
    engine?.applyLoadout(next);
  }

  function persist() {
    if (!user) return;
    void saveHangar({
      data: {
        chassisId: loadout.chassis,
        loadout,
        inventory: loadout.items,
      },
    }).catch(() => undefined);
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(5rem,calc(env(safe-area-inset-bottom)+4rem))]">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-display text-xs tracking-[0.3em] text-muted">HANGAR</p>
          <h2 className="font-display text-3xl">{def.name}</h2>
          <p className="text-sm text-muted">{def.role} — {def.blurb}</p>
        </div>
        <Button variant="ghost" onClick={() => { if (engine) engine.hangarWalk = false; engine?.setView("title"); setScreen("title"); }}>
          Back
        </Button>
      </header>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CHASSIS_LIST.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c.id)}
              className={cn(
                "min-h-11 rounded-[var(--radius-md)] border px-3 py-2 text-left",
                c.id === loadout.chassis ? "border-fg bg-elevated" : "border-border bg-bg/60",
              )}
            >
              <p className="font-display text-sm">{c.name}</p>
              <p className="text-xs text-muted">{c.role}</p>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="space-y-1">
              <span className="uppercase tracking-widest text-muted">Primary</span>
              <select
                className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-bg/80 px-2 text-fg"
                value={loadout.primary}
                onChange={(e) => pickWeapon("primary", e.target.value as WeaponId)}
              >
                {WEAPON_LIST.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="uppercase tracking-widest text-muted">Secondary</span>
              <select
                className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-bg/80 px-2 text-fg"
                value={loadout.secondary}
                onChange={(e) => pickWeapon("secondary", e.target.value as WeaponId)}
              >
                {WEAPON_LIST.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="tabular text-xs text-muted">{def.hp} hull · {def.armor} plate · {def.speed} m/s</p>
          <div className="flex gap-2">
            <Button
              variant={walk ? "primary" : "secondary"}
              onClick={() => {
                const next = !walk;
                setWalk(next);
                if (engine) engine.hangarWalk = next;
              }}
            >
              {walk ? "Stop gait" : "Cycle gait"}
            </Button>
            <Button
              size="lg"
              onClick={() => {
                persist();
                if (engine) engine.hangarWalk = false;
                setScreen("title");
                engine?.setView("title");
              }}
            >
              Confirm Frame
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LobbyOverlay({ engine, onLaunch }: { engine: Engine | null; onLaunch: (opts: { room: string; mode: MatchMode }) => void }) {
  const { matchMode, setMatchMode, setScreen, roomCode, setRoom, callsign } = useGame();
  const [join, setJoin] = useState("");
  const code = useMemo(() => roomCode || makeCode(), [roomCode]);

  useEffect(() => {
    if (!roomCode) setRoom(code);
  }, [code, roomCode, setRoom]);

  return (
    <div className="absolute inset-0 z-10 overflow-y-auto bg-bg/55 p-5 pt-[max(1.25rem,env(safe-area-inset-top))] backdrop-blur-sm">
      <div className="mx-auto max-w-lg space-y-5 rounded-[var(--radius-xl)] border border-border bg-surface p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-xs tracking-[0.3em] text-muted">MULTIPLAYER</p>
            <h2 className="font-display text-3xl">Drop with friends</h2>
            <p className="text-sm text-muted">
              Up to four frames. Casual — no ranking. Host starts the drop. This Pages host has no
              signaling server, so peer links will stay idle unless you self-host `/api/rtc`.
            </p>
          </div>
          <Button variant="ghost" onClick={() => setScreen("title")}>Back</Button>
        </div>
        <SignInGate
          fallback={
            <div className="space-y-3">
              <p className="text-sm text-muted">Sign in to use callsigns, friends, and cross-device rooms.</p>
              <Link to="/login" className="inline-flex h-11 items-center rounded-[var(--radius-md)] bg-primary px-5 font-display text-sm uppercase tracking-wide text-primary-fg">
                Sign in
              </Link>
            </div>
          }
        >
          <CallsignGate>
            <div className="flex gap-2">
              <Button variant={matchMode === "ffa" ? "primary" : "secondary"} onClick={() => setMatchMode("ffa")}>
                Free for all
              </Button>
              <Button variant={matchMode === "tdm" ? "primary" : "secondary"} onClick={() => setMatchMode("tdm")}>
                2 versus 2
              </Button>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-elevated p-4">
              <p className="text-xs uppercase tracking-widest text-muted">Room code</p>
              <p className="font-mono text-3xl tracking-[0.3em]">{code}</p>
              <p className="mt-1 text-xs text-subtle">Share with up to three friends. Same code, same city.</p>
            </div>
            <Button size="lg" className="w-full" onClick={() => onLaunch({ room: code, mode: matchMode })}>
              Open room as {callsign}
            </Button>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const c = join.trim().toUpperCase();
                if (c) onLaunch({ room: c, mode: matchMode });
              }}
            >
              <input
                className="h-11 flex-1 rounded-[var(--radius-sm)] border border-border bg-bg px-3 font-mono uppercase tracking-widest outline-none"
                placeholder="Join code"
                value={join}
                onChange={(e) => setJoin(e.target.value)}
                maxLength={8}
              />
              <Button type="submit" variant="secondary">Join</Button>
            </form>
            <Button variant="ghost" className="w-full" onClick={() => setScreen("friends")}>
              Friends
            </Button>
          </CallsignGate>
        </SignInGate>
      </div>
    </div>
  );
}

export function RoomOverlay({
  room,
  mode,
  engine,
  onExit,
}: {
  room: string;
  mode: MatchMode;
  engine: Engine | null;
  onExit: () => void;
}) {
  const { loadout, callsign, setScreen } = useGame();
  const p2p = useP2PRoom({ room, name: callsign });
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    return p2p.onMessage((from, data) => {
      const msg = data as { t?: string; chassis?: ChassisId; mode?: MatchMode; roster?: { id: string; name: string; chassis: ChassisId; team: number }[] };
      if (msg?.t === "start" && msg.roster && engine && !started) {
        engine.sim.localId = p2p.selfId;
        engine.startMatch(msg.mode ?? mode, loadout, msg.roster);
        setStarted(true);
        setScreen("play");
      }
      if (msg?.t === "s" && engine && started) {
        engine.sim.applyRemoteState(from, msg as never);
      }
    });
  }, [p2p, engine, loadout, mode, setScreen, started]);

  useEffect(() => {
    if (!started || !engine) return;
    let last = 0;
    let raf = 0;
    const loop = (now: number) => {
      if (now - last > 50) {
        const m = engine.sim.local;
        p2p.broadcast({
          t: "s",
          x: m.x,
          y: m.y,
          z: m.z,
          yaw: m.yaw,
          torso: m.torso,
          pitch: m.pitch,
          hp: m.hp,
          speed: m.speed,
          chassis: m.chassis,
          fire: m.fireFlash > 0,
          name: callsign,
        });
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [started, engine, p2p, callsign]);

  const ids = [p2p.selfId, ...p2p.peers.map((p) => p.id)].sort();
  const host = ids[0] === p2p.selfId;
  const canStart = p2p.peers.some((p) => p.connectionState === "connected") && p2p.peers.length + 1 <= 4;

  function launch() {
    if (!engine) return;
    const roster = [
      { id: p2p.selfId, name: callsign, chassis: loadout.chassis, team: 0 },
      ...p2p.peers.map((p, i) => ({
        id: p.id,
        name: p.name,
        chassis: loadout.chassis,
        team: mode === "tdm" ? ((i + 1) % 2 === 0 ? 0 : 1) : i + 1,
      })),
    ];
    if (mode === "tdm") roster[0].team = 0;
    p2p.send({ t: "start", mode, roster });
    engine.sim.localId = p2p.selfId;
    engine.startMatch(mode, loadout, roster);
    setStarted(true);
    setScreen("play");
  }

  if (started) return null;

  return (
    <div className="absolute inset-0 z-10 overflow-y-auto bg-bg/60 p-5 pt-[max(1.25rem,env(safe-area-inset-top))] backdrop-blur-sm">
      <div className="mx-auto max-w-lg space-y-4 rounded-[var(--radius-xl)] border border-border bg-surface p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-xs tracking-[0.3em] text-muted">ROOM {room}</p>
            <h2 className="font-display text-2xl">{mode === "tdm" ? "2 versus 2" : "Free for all"}</h2>
            <p className="text-sm text-muted">{p2p.joined ? "Linked" : "Linking peers…"} · {p2p.peers.length + 1}/4</p>
          </div>
          <Button variant="ghost" onClick={onExit}>Leave</Button>
        </div>
        <ul className="space-y-2">
          <li className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-elevated px-3 py-2">
            <span>{callsign} (you)</span>
            <span className="text-xs text-ok">{host ? "Host" : "Ready"}</span>
          </li>
          {p2p.peers.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-elevated px-3 py-2">
              <span>{p.name}</span>
              <span className="text-xs text-muted">
                {p.connectionState}
                {p.rttMs != null ? ` · ${Math.round(p.rttMs)}ms` : ""}
              </span>
            </li>
          ))}
        </ul>
        <Button className="w-full" size="lg" disabled={!host || !canStart} onClick={launch}>
          {host ? (canStart ? "Drop in" : "Need another pilot") : "Waiting on host"}
        </Button>
        <p className="text-xs text-subtle">Direct connection. A few networks will fail — that peer shows as failed, not frozen.</p>
        <Button variant={ready ? "primary" : "secondary"} onClick={() => { setReady(true); p2p.send({ t: "ready", chassis: loadout.chassis }); }}>
          Frame ready
        </Button>
      </div>
    </div>
  );
}

export function FriendsOverlay() {
  const setScreen = useGame((s) => s.setScreen);
  const roomCode = useGame((s) => s.roomCode);
  const matchMode = useGame((s) => s.matchMode);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ user_id: string; username: string }[]>([]);
  const [data, setData] = useState<Awaited<ReturnType<typeof listFriends>> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() {
    void listFriends().then(setData).catch(() => setData(null));
  }
  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="absolute inset-0 z-10 overflow-y-auto bg-bg/70 p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-lg space-y-4 rounded-[var(--radius-xl)] border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Friends</h2>
          <Button variant="ghost" onClick={() => setScreen("lobby")}>Back</Button>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void searchPlayers({ data: { q } }).then(setHits).catch(() => setHits([]));
          }}
        >
          <input
            className="h-11 flex-1 rounded-[var(--radius-sm)] border border-border bg-bg px-3 outline-none"
            placeholder="Search callsign"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button type="submit" variant="secondary">Find</Button>
        </form>
        {hits.map((h) => (
          <div key={h.user_id} className="flex items-center justify-between text-sm">
            <span className="font-mono">{h.username}</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void sendFriendRequest({ data: { userId: h.user_id } }).then(() => { setMsg("Request sent"); refresh(); })}
            >
              Add
            </Button>
          </div>
        ))}
        {data?.incoming.length ? (
          <section>
            <p className="text-xs uppercase tracking-widest text-muted">Requests</p>
            {data.incoming.map((r) => (
              <div key={r.id} className="mt-2 flex items-center justify-between gap-2">
                <span>{r.username}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void respondFriendRequest({ data: { id: r.id, accept: true } }).then(refresh)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void respondFriendRequest({ data: { id: r.id, accept: false } }).then(refresh)}>
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </section>
        ) : null}
        <section>
          <p className="text-xs uppercase tracking-widest text-muted">Squad</p>
          {data?.friends.length ? (
            data.friends.map((f) => (
              <div key={f.user_id} className="mt-2 flex items-center justify-between">
                <span className="font-mono">{f.username}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const code = roomCode || makeCode();
                    void sendInvite({ data: { toUserId: f.user_id, roomCode: code, mode: matchMode } }).then(() => setMsg(`Invite sent · ${code}`));
                  }}
                >
                  Invite
                </Button>
              </div>
            ))
          ) : (
            <p className="mt-2 text-sm text-muted">No friends yet. Search a callsign.</p>
          )}
        </section>
        {data?.invites.length ? (
          <section>
            <p className="text-xs uppercase tracking-widest text-muted">Invites</p>
            {data.invites.map((i) => (
              <div key={i.id} className="mt-2 flex items-center justify-between">
                <span>{i.username} · {i.room_code}</span>
                <Button size="sm" onClick={() => { useGame.getState().setRoom(i.room_code); useGame.getState().setMatchMode(i.mode as MatchMode); setScreen("lobby"); }}>
                  Join
                </Button>
              </div>
            ))}
          </section>
        ) : null}
        {msg ? <p className="text-sm text-ok">{msg}</p> : null}
      </div>
    </div>
  );
}

export function ResultsOverlay({ engine }: { engine: Engine | null }) {
  const { lastResult, setScreen, loadout } = useGame();
  const user = useCurrentUser();
  useEffect(() => {
    if (user && lastResult) void saveRun({ data: lastResult }).catch(() => undefined);
    if (user) void saveHangar({ data: { chassisId: loadout.chassis, loadout, inventory: loadout.items } }).catch(() => undefined);
  }, [user, lastResult, loadout]);

  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-bg/70 p-5">
      <div className="w-full max-w-sm space-y-4 rounded-[var(--radius-xl)] border border-border bg-surface p-6 text-center">
        <p className="font-display text-xs tracking-[0.3em] text-muted">FRAME DOWN</p>
        <h2 className="font-display text-3xl">Wave {lastResult?.wave ?? 0}</h2>
        <p className="font-mono text-muted">{lastResult?.kills ?? 0} confirmed kills</p>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              engine?.startSurvival(useGame.getState().loadout);
              setScreen("play");
            }}
          >
            Drop again
          </Button>
          <Button variant="secondary" onClick={() => { engine?.setView("title"); setScreen("title"); }}>
            Title
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PauseOverlay({ onResume, onAbort }: { onResume: () => void; onAbort: () => void }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-bg/60 p-5">
      <div className="w-full max-w-sm space-y-3 rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h2 className="font-display text-2xl">Paused</h2>
        <Button className="w-full" onClick={onResume}>Resume</Button>
        <Button className="w-full" variant="secondary" onClick={onAbort}>
          Abort drop
        </Button>
      </div>
    </div>
  );
}

export function PortraitHint() {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(orientation: portrait) and (pointer: coarse)");
    const apply = () => setPortrait(q.matches);
    apply();
    q.addEventListener("change", apply);
    return () => q.removeEventListener("change", apply);
  }, []);
  if (!portrait) return null;
  return (
    <div className="absolute top-0 right-0 left-0 z-30 border-b border-border bg-bg/90 px-4 py-2 text-center pt-[env(safe-area-inset-top)]">
      <p className="font-display text-sm tracking-wide">Rotate for landscape</p>
    </div>
  );
}

function AuthChip() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="h-8 w-24 animate-pulse rounded-full bg-elevated" />;
  return (
    <div className="flex items-center gap-3">
      <SignedIn>
        <UserButton />
      </SignedIn>
      <SignedOut>
        <Link to="/login" className="text-sm text-muted hover:text-fg">
          Sign in
        </Link>
      </SignedOut>
    </div>
  );
}

function CallsignGate({ children }: { children: ReactNode }) {
  const setCallsign = useGame((s) => s.setCallsign);
  const [name, setName] = useState("");
  const [have, setHave] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void getProfile()
      .then((p) => {
        if (p?.username) {
          setHave(p.username);
          setCallsign(p.username);
        }
      })
      .catch(() => undefined);
  }, [setCallsign]);

  if (have) return <>{children}</>;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        void claimUsername({ data: { username: name } })
          .then((r) => {
            setHave(r.username);
            setCallsign(r.username);
          })
          .catch((ex: unknown) => setErr(ex instanceof Error ? ex.message : "Could not claim"));
      }}
    >
      <p className="text-sm text-muted">Claim a callsign to be found by friends.</p>
      <input
        className="h-11 w-full rounded-[var(--radius-sm)] border border-border bg-bg px-3 outline-none"
        placeholder="Callsign"
        value={name}
        onChange={(e) => setName(e.target.value)}
        minLength={3}
        maxLength={16}
      />
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      <Button type="submit" className="w-full">Claim</Button>
    </form>
  );
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}
