/** Local guest identity — no cloud session on GitHub Pages. */
export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  isDevFallback: boolean;
};

export const DEV_USER: AppUser = {
  id: "guest",
  displayName: "Guest",
  primaryEmail: null,
  profileImageUrl: null,
  isDevFallback: true,
};

export type CurrentUserState = {
  user: AppUser | null;
  isPending: boolean;
};

export function useCurrentUserState(): CurrentUserState {
  return { user: DEV_USER, isPending: false };
}

export function useCurrentUser(): AppUser | null {
  return DEV_USER;
}
