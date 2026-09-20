import { useEffect, useRef, useState } from "react";
import { Hud } from "@/components/overlays/Hud";
import {
  FriendsOverlay,
  HangarOverlay,
  LobbyOverlay,
  PauseOverlay,
  PortraitHint,
  ResultsOverlay,
  RoomOverlay,
  TitleOverlay,
} from "@/components/overlays/Menus";
import { MobileControls } from "@/components/overlays/MobileControls";
import { audio } from "./audio";
import type { Engine } from "./engine";
import { useGame } from "./store";
import type { MatchMode } from "./types";

export default function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [session, setSession] = useState<{ room: string; mode: MatchMode } | null>(null);
  const screen = useGame((s) => s.screen);
  const setScreen = useGame((s) => s.setScreen);
  const setHud = useGame((s) => s.setHud);
  const setResult = useGame((s) => s.setResult);
  const loadout = useGame((s) => s.loadout);
  const muted = useGame((s) => s.muted);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let off = () => {};
    let eng: Engine | null = null;

    void (async () => {
      const mod = await import("./engine");
      if (cancelled || !canvas.isConnected) return;
      eng = new mod.Engine(canvas);
      engineRef.current = eng;
      setEngine(eng);
      eng.setView("title");
      eng.start();
      off = eng.onHud((h) => {
        setHud(h);
        if (!h.alive && h.mode === "survival" && useGame.getState().screen === "play") {
          setResult({ wave: h.wave, kills: h.kills });
          setScreen("results");
          eng?.setView("title");
        }
      });
    })();

    const block = (e: Event) => e.preventDefault();
    canvas.addEventListener("contextmenu", block);
    return () => {
      cancelled = true;
      off();
      canvas.removeEventListener("contextmenu", block);
      eng?.dispose();
      engineRef.current = null;
    };
  }, [setHud, setResult, setScreen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      const s = useGame.getState().screen;
      if (s === "play") {
        if (engineRef.current) engineRef.current.sim.paused = true;
        setScreen("paused");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setScreen]);

  useEffect(() => {
    audio.setMuted(muted);
  }, [muted]);

  function startSurvival() {
    audio.unlock();
    const eng = engineRef.current;
    if (!eng) return;
    eng.startSurvival(useGame.getState().loadout);
    setScreen("play");
  }

  const playing = screen === "play" || screen === "paused";

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg" data-engine={engine ? "ready" : "loading"}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 h-full w-full touch-none"
        onPointerDown={() => {
          audio.unlock();
          if (screen === "play") engineRef.current && inputLock();
        }}
      />
      {screen === "title" ? <TitleOverlay engine={engine} onStart={startSurvival} /> : null}
      {screen === "hangar" ? <HangarOverlay engine={engine} /> : null}
      {screen === "lobby" && !session ? (
        <LobbyOverlay
          engine={engine}
          onLaunch={(opts) => {
            audio.unlock();
            setSession(opts);
          }}
        />
      ) : null}
      {session && screen === "lobby" ? (
        <RoomOverlay
          room={session.room}
          mode={session.mode}
          engine={engine}
          onExit={() => {
            setSession(null);
            setScreen("lobby");
          }}
        />
      ) : null}
      {screen === "friends" ? <FriendsOverlay /> : null}
      {playing ? <Hud /> : null}
      {playing ? <MobileControls /> : null}
      {screen === "paused" ? (
        <PauseOverlay
          onResume={() => {
            if (engineRef.current) engineRef.current.sim.paused = false;
            setScreen("play");
          }}
          onAbort={() => {
            const current = engineRef.current;
            if (current) {
              current.sim.paused = false;
              current.setView("title");
            }
            setSession(null);
            setScreen("title");
          }}
        />
      ) : null}
      {screen === "results" ? <ResultsOverlay engine={engine} /> : null}
      <PortraitHint />
      {playing ? (
        <button
          type="button"
          className="absolute right-4 z-20 hidden h-11 rounded-[var(--radius-sm)] border border-border bg-bg/70 px-3 text-xs uppercase tracking-widest text-muted md:block top-[max(1rem,env(safe-area-inset-top))]"
          onClick={() => {
            if (!engineRef.current) return;
            engineRef.current.sim.paused = true;
            setScreen("paused");
          }}
        >
          Pause
        </button>
      ) : null}
      <span className="sr-only">{loadout.chassis}</span>
    </div>
  );
}

function inputLock() {
  const el = document.querySelector("canvas");
  el?.requestPointerLock?.();
}
