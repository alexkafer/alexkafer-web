# alexkafer.com

Single-page, scroll-driven personal site. "Shows, not tells" the story of a
senior PM with deep platform-engineering instincts.

Built with Next.js 14 (App Router) + TypeScript + Tailwind + React Three Fiber
+ GSAP + Framer Motion + Lenis. Deployed to Vercel.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Other scripts:

```bash
npm run build      # production build (injects build SHA + time)
npm run start      # serve production build
npm run lint       # eslint via next lint
npx tsc --noEmit   # type-check
```

## Deploy to Vercel

### Option A — Import from GitHub (recommended)

1. Push the repo to GitHub.
2. <https://vercel.com/new> → import the repo.
3. Framework preset auto-detected as Next.js. No build/output overrides needed.
4. Click **Deploy**.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel link
vercel --prod
```

## Environment variables

`NEXT_PUBLIC_BUILD_*` are optional and injected automatically by `npm run build`
from local git state. The `TURSO_*` vars are optional locally — when unset, the
A/B test in the **Lab** section writes to a SQLite file at `./local.db` (which
is gitignored). On Vercel, set the Turso vars to point at a hosted libsql DB so
data persists across deploys.

| Name                     | Used for                                                       |
| ------------------------ | -------------------------------------------------------------- |
| `NEXT_PUBLIC_BUILD_SHA`  | Short git SHA shown in `?`-key devtools overlay                |
| `NEXT_PUBLIC_BUILD_TIME` | ISO build timestamp shown in devtools overlay                  |
| `TURSO_DATABASE_URL`     | libsql URL for the A/B test DB (defaults to `file:./local.db`) |
| `TURSO_AUTH_TOKEN`       | libsql auth token (required when using a hosted Turso DB)      |

### Lab: live A/B test

Section 10 (`Lab`) is a real A/B test backed by libsql/Turso. Each visitor is
randomly assigned to variant A or B (cookie-persisted), the impression and
conversion are stored in a `ab_events` table, and the on-page scorecard runs
the same SQL query you can read in the live-query block.

Locally this writes to `./local.db` (a SQLite file). For Vercel deploy,
provision a Turso DB:

```bash
turso db create alexkafer-ab
turso db show alexkafer-ab --url
turso db tokens create alexkafer-ab
```

Then add `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` to Vercel project env vars.

## Easter eggs

- Press `?` → devtools-style overlay (live FPS, scroll %, viewport, build SHA).
- Konami code (↑↑↓↓←→←→BA) → unlocks a hidden console-log section under the footer.
- View-source the document → ASCII art comment in `<head>`.
- Hover hero nodes → mock service metadata (svc-id, region, p99).

## Accessibility

- Skip-to-content link (Tab on page load).
- Focus-visible rings (2px cyan, `#7dd3fc`).
- `prefers-reduced-motion: reduce` disables pinned scroll triggers and heavy
  WebGL/scroll animations; a screen-reader narrative under `<main>` summarizes
  the story.

## Project layout

```
src/
  app/                    # Next.js App Router (layout, page, globals, OG image)
  components/
    hero/                 # R3F canvas, HUD chrome, status pill, tooltips
    sections/             # Disguise, Scale, Velocity, Reliability, Efficiency,
                          #   Reach, Origin, Principles
    chrome/               # Footer, devtools overlay, Konami egg
    section.tsx           # Reusable <Section> primitive (pin + progress)
  hooks/                  # useScrollTrigger, useReducedMotion, etc.
  lib/                    # lenis-provider
```

## Quality gates

Before shipping, run:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Then walk the `BROWSER_QA.md` and `LAUNCH_CHECKLIST.md` checklists.
