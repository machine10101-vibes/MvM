import { create } from "zustand";
import { defaultLoadout } from "./catalog";
import type { ChassisId, HudSnap, Loadout, MatchMode, Screen } from "./types";

const SAVE_KEY = "mvm-hangar-v1";

function loadSaved(): Loadout {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultLoadout("vanguard");
    return { ...defaultLoadout("vanguard"), ...JSON.parse(raw) };
  } catch {
    return defaultLoadout("vanguard");
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
  loadout: typeof window === "undefined" ? defaultLoadout("vanguard") : loadSaved(),
  hud: null,
  roomCode: "",
  matchMode: "ffa",
  callsign: "Pilot",
  lastResult: null,
  muted: false,
  setScreen: (screen) => set({ screen }),
  setChassis: (id) =>
    set((s) => {
      const loadout = { ...s.loadout, chassis: id };
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
  setHud: (hud) => set({ hud }),
  setRoom: (roomCode) => set({ roomCode }),
  setMatchMode: (matchMode) => set({ matchMode }),
  setCallsign: (callsign) => set({ callsign }),
  setResult: (lastResult) => set({ lastResult }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
}));
