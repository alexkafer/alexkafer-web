# alexkafer.com

Single-page, scroll-driven personal site. "Shows, not tells" the story of a
senior PM with deep platform-engineering instincts.

Built with Next.js 14 (App Router) + TypeScript + Tailwind + React Three Fiber
+ GSAP + Framer Motion + Lenis. Deployed to Cloudflare Workers via
[OpenNext](https://opennext.js.org/cloudflare), with **Cloudflare D1** as the
A/B-test source of truth and a **Durable Object** (`StatsAggregator`) for
atomic per-session dedup of impression / click events.

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
npm run cf:build   # OpenNext build for Cloudflare Workers
npm run cf:preview # cf:build + wrangler local preview (D1 + DO bound)
npm run cf:deploy  # cf:build + wrangler deploy
```

## Deploy to Cloudflare

The site builds for Cloudflare Workers via `@opennextjs/cloudflare`. All Next.js
routes (RSC + App Router + route handlers) run inside a single Worker, with
D1 + a Durable Object bound in.

### Prerequisites

```bash
npm i -g wrangler   # if you don't have it
wrangler login
```

### One-time provisioning

```bash
# Create the D1 database. Copy the printed database_id into wrangler.toml
# (replace REPLACE_WITH_D1_ID).
wrangler d1 create alexkafer-ab

# Apply schema migrations (migrations/0001_init.sql).
wrangler d1 migrations apply alexkafer-ab --local    # for cf:preview
wrangler d1 migrations apply alexkafer-ab --remote   # for production
```

The `StatsAggregator` Durable Object class binding + its `v1` migration are
declared in `wrangler.toml` and applied automatically on first `cf:deploy`.

### Local preview against Cloudflare runtime

```bash
npm run cf:preview
```

This runs `opennextjs-cloudflare build` then boots wrangler's local Workers
runtime with D1 + the DO bound to local SQLite/state in `.wrangler/`.

### Deploy

```bash
npm run cf:deploy
```

Equivalent to `opennextjs-cloudflare build && opennextjs-cloudflare deploy` —
builds the Worker bundle and uploads it via wrangler.

### Local Next dev (no Cloudflare runtime)

```bash
npm run dev
```

`next dev` still works as before; the lab section falls back to a local
`./local.db` libsql file. There's no Durable Object in this mode, so dedup is
best-effort SELECT-1-then-INSERT — fine for single-process development.

## Environment variables

`NEXT_PUBLIC_BUILD_*` are optional and injected automatically by `npm run build`
from local git state. In production the D1 database and Durable Object are
exposed to the Worker as **bindings** declared in `wrangler.toml` — there are
no Turso vars to set.

| Name                     | Used for                                                                          |
| ------------------------ | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BUILD_SHA`  | Short git SHA shown in `?`-key devtools overlay                                   |
| `NEXT_PUBLIC_BUILD_TIME` | ISO build timestamp shown in devtools overlay                                     |
| `TURSO_DATABASE_URL`     | _Local dev only._ libsql URL fallback (defaults to `file:./local.db`)             |
| `TURSO_AUTH_TOKEN`       | _Local dev only._ libsql auth token (only needed if pointing at a hosted Turso)   |

Cloudflare bindings (auto-provided in production via `wrangler.toml`):

| Binding             | Type                  | Purpose                                       |
| ------------------- | --------------------- | --------------------------------------------- |
| `DB`                | D1 database           | `ab_events` source of truth                   |
| `STATS_AGGREGATOR`  | Durable Object class  | Atomic per-session dedup + D1 write coordinator |

### Lab: live A/B test

Section 10 (`Lab`) is a real A/B test. Each visitor is randomly assigned to
variant A or B (cookie-persisted), and the impression + conversion are stored
in D1's `ab_events` table.

Architecture in production:

- **Writes** (`/api/ab/impression`, `/api/ab/click`) call into the
  `StatsAggregator` Durable Object (one DO instance per experiment, addressed
  by `idFromName(EXPERIMENT_ID)`). The DO holds in-memory `Set<sessionId>`
  bitmaps for impressions and conversions, persists them incrementally to DO
  storage, and runs each dedup-check + D1 INSERT inside
  `state.blockConcurrencyWhile` so concurrent requests for the same session
  can't double-write.
- **Reads** (`/api/ab/stats`) run the canonical SQL query directly against
  D1 — the query you see displayed in the UI (`STATS_QUERY` in
  `src/lib/ab.ts`) is the query that produces the displayed numbers.

Locally (`npm run dev`) writes go to `./local.db` via libsql with best-effort
dedup; there's no DO outside the Cloudflare runtime.

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
npm run cf:build
```

Then walk the `BROWSER_QA.md` and `LAUNCH_CHECKLIST.md` checklists.
