import { defaultLoadout } from "@/game/catalog";
import type { Loadout } from "@/game/types";

const PROFILE_KEY = "mvm-profile-v1";
const HANGAR_KEY = "mvm-hangar-cloud-v1";
const FRIENDS_KEY = "mvm-friends-v1";
const RUNS_KEY = "mvm-runs-v1";

type Profile = { user_id: string; username: string };
type FriendRow = { user_id: string; username: string };
type FriendRequest = { id: number; from_user_id: string; to_user_id: string; username: string; status: string };
type Invite = { id: number; room_code: string; mode: string; username: string };
type FriendsState = {
  friends: FriendRow[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  invites: Invite[];
  nextId: number;
};

type HangarRow = {
  chassis_id: string;
  loadout: Loadout;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

function emptyFriends(): FriendsState {
  return { friends: [], incoming: [], outgoing: [], invites: [], nextId: 1 };
}

export async function getProfile(): Promise<Profile | null> {
  return readJson<Profile | null>(PROFILE_KEY, null);
}

export async function claimUsername(input: { data: { username: string } }): Promise<{ username: string }> {
  const username = input.data.username.trim();
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
    throw new Error("Letters, numbers, underscore only (3–16)");
  }
  const profile: Profile = { user_id: "guest", username };
  writeJson(PROFILE_KEY, profile);
  return { username };
}

export async function searchPlayers(_input?: { data: { q: string } }): Promise<Profile[]> {
  return [];
}

export async function listFriends(): Promise<FriendsState> {
  const state = readJson<FriendsState>(FRIENDS_KEY, emptyFriends());
  return {
    friends: state.friends,
    incoming: state.incoming,
    outgoing: state.outgoing,
    invites: state.invites,
    nextId: state.nextId,
  };
}

export async function sendFriendRequest(_input?: { data: { userId: string } }): Promise<{ ok: true }> {
  throw new Error("Friends search is local-only on this static build.");
}

export async function respondFriendRequest(_input?: {
  data: { id: number; accept: boolean };
}): Promise<{ ok: true }> {
  return { ok: true };
}

export async function getHangar(): Promise<HangarRow | null> {
  const stored = readJson<HangarRow | null>(HANGAR_KEY, null);
  if (stored) return stored;
  try {
    const raw = localStorage.getItem("mvm-hangar-v1");
    if (!raw) return null;
    const loadout = { ...defaultLoadout("vanguard"), ...JSON.parse(raw) } as Loadout;
    return { chassis_id: loadout.chassis, loadout };
  } catch {
    return null;
  }
}

export async function saveHangar(input: {
  data: { chassisId: string; loadout: Loadout; inventory: unknown };
}): Promise<{ ok: true }> {
  writeJson(HANGAR_KEY, {
    chassis_id: input.data.chassisId,
    loadout: input.data.loadout,
  });
  return { ok: true };
}

export async function sendInvite(_input?: {
  data: { toUserId: string; roomCode: string; mode: string };
}): Promise<{ ok: true }> {
  throw new Error("Cloud invites need a server. Share the room code instead.");
}

export async function saveRun(input: { data: { wave: number; kills: number } }): Promise<{ ok: true }> {
  const runs = readJson<{ wave: number; kills: number; at: number }[]>(RUNS_KEY, []);
  runs.unshift({ ...input.data, at: Date.now() });
  writeJson(RUNS_KEY, runs.slice(0, 20));
  return { ok: true };
}
