# MVM — Mech vs Mech

Browser third-person mech combat in a ruined city. This repo is a **client-only** Vite + React + Three.js app. Play it on GitHub Pages:

**https://machine10101-vibes.github.io/MvM/**

No Roblox / Rojo place file. Survival mode, hangar loadouts, and local callsigns run entirely in the browser (`localStorage`). Cloud auth, Postgres, and the Grok App Builder Nitro/Vercel SSR stack are not part of this host.

## Play

1. Open the Pages URL above (or run locally and go to `/MvM/`).
2. **Start Survival** — fight waves in Helix.
3. **Hangar** — pick a chassis; the choice is saved in this browser.
4. **Multiplayer** — room codes and P2P mesh still exist, but GitHub Pages has no `/api/rtc` signaling server. Peers will not connect on this host. Share the repo and self-host with a signaling backend if you want drops with friends.

Controls: **W/S** throttle · **A/D** turn · **Q/C** strafe · mouse aim · **LMB** fire · **RMB / E** alt · **R** vent heat · **Shift** boost · **Space** jump jets · **Esc** pause. Hangar can swap primary/secondary weapons and preview the walk cycle.

## Local development

```bash
npm install
npm run dev
```

Vite is configured with `base: '/MvM/'` and TanStack Router `basepath: '/MvM'` so local preview matches Pages. Open `http://localhost:8080/MvM/`.

```bash
npm run build    # static files in dist/ (index.html, 404.html, .nojekyll)
npm run preview  # serve the production build
```

Publish `dist/` to the `gh-pages` branch root. Do not enable Jekyll (`.nojekyll` is required).

## Caveats

- **Guest / local only.** No OAuth, no Better Auth, no PGlite/Postgres. Hangar + last survival runs stay on the device.
- **Multiplayer signaling is off** on GitHub Pages (static files only).
- Built from the Grok App Builder TanStack Start workspace, adapted to a static SPA so Pages can serve it.
