/** GitHub Pages has no Better Auth / OAuth backend. */
export const authEnabled = false;

export const GROK_PROVIDERS: { providerId: string; label: string }[] = [];

export const authClient = {
  useSession() {
    return { data: null, isPending: false };
  },
  async signOut() {
    return { error: null };
  },
  async getSession() {
    return { data: null, error: null };
  },
  signIn: {
    async email() {
      return { error: { message: "Sign-in is disabled on this static build." } };
    },
    async oauth2() {
      return { error: { message: "Sign-in is disabled on this static build." } };
    },
  },
  signUp: {
    async email() {
      return { error: { message: "Sign-in is disabled on this static build." } };
    },
  },
};

export async function signIn(): Promise<void> {
  throw new Error("Sign-in is disabled on this static GitHub Pages build.");
}

export async function signOut(): Promise<void> {
  window.location.href = `${import.meta.env.BASE_URL}`;
}
