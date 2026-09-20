import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-5 text-fg">
      <div className="w-full max-w-sm space-y-6 rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <div className="space-y-1">
          <p className="font-display text-xs tracking-[0.28em] text-muted">MECH VS MECH</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Guest hangar</h1>
          <p className="text-sm text-muted">
            This GitHub Pages build is client-only. Callsign, chassis, and scores stay in this
            browser — no cloud accounts.
          </p>
        </div>
        <p className="text-sm text-muted">
          Open the hangar from the title screen and claim a local callsign in Multiplayer if you
          want a name on the roster.
        </p>
        <Link to="/" className="block">
          <Button className="w-full">Back to hangar</Button>
        </Link>
      </div>
    </main>
  );
}
