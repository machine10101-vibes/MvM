import { create } from "zustand";
import { CHASSIS, defaultLoadout, hydrateLoadout } from "./catalog";
import type { ChassisId, HudSnap, Loadout, MatchMode, Screen, WeaponId } from "./types";

const SAVE_KEY = "mvm-hangar-v1";

function loadSaved(): Loadout {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultLoadout("titan");
    return hydrateLoadout(JSON.parse(raw));
  } catch {
    return defaultLoadout("titan");
  }
}

export interface GameState {
  screen: Screen;
  loadout: Loadout;
  hud: HudSnap | null;
  roomCode: string;
  matchMode: MatchMode;
  callsign: string;
  lastResult: { wave: number; kills: number } | null;
  muted: boolean;
  setScreen: (s: Screen) => void;
  setChassis: (id: ChassisId) => void;
  setWeapons: (slot: "primary" | "secondary", id: WeaponId) => void;
  setLoadout: (l: Loadout) => void;
  setHud: (h: HudSnap) => void;
  setRoom: (code: string) => void;
  setMatchMode: (m: MatchMode) => void;
  setCallsign: (n: string) => void;
  setResult: (r: { wave: number; kills: number }) => void;
  toggleMute: () => void;
}

export const useGame = create<GameState>((set) => ({
  screen: "title",
  loadout: typeof window === "undefined" ? defaultLoadout("titan") : loadSaved(),
  hud: null,
  roomCode: "",
  matchMode: "ffa",
  callsign: "Pilot",
  lastResult: null,
  muted: false,
  setScreen: (screen) => set({ screen }),
  setChassis: (id) =>
    set((s) => {
      const c = CHASSIS[id];
      const loadout = { ...s.loadout, chassis: id, primary: c.primary, secondary: c.secondary };
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(loadout));
      } catch {
        /* ignore */
      }
      return { loadout };
    }),
  setWeapons: (slot, id) =>
    set((s) => {
      const loadout = { ...s.loadout, [slot]: id };
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(loadout));
      } catch {
        /* ignore */
      }
      return { loadout };
    }),
  setLoadout: (loadout) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(loadout));
    } catch {
      /* ignore */
    }
    set({ loadout });
  },
  setHud: (hud) =>
    set((s) => {
      const prev = s.hud;
      if (
        prev &&
        prev.hp === hud.hp &&
        prev.armor === hud.armor &&
        prev.heat === hud.heat &&
        prev.wave === hud.wave &&
        prev.kills === hud.kills &&
        prev.alive === hud.alive &&
        prev.toast === hud.toast &&
        prev.overheat === hud.overheat &&
        prev.aliveEnemies === hud.aliveEnemies
      ) {
        return s;
      }
      return { hud };
    }),
  setRoom: (roomCode) => set({ roomCode }),
  setMatchMode: (matchMode) => set({ matchMode }),
  setCallsign: (callsign) => set({ callsign }),
  setResult: (lastResult) => set({ lastResult }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
}));
