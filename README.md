# alexkafer.com

Single-page, scroll-driven personal site / résumé. The hero is a React Three
Fiber constellation that morphs through layouts as you scroll; the page below
walks through a few short sections (a résumé, demos pulled from
GitHub, and a real A/B test backed by Cloudflare D1).

Built with **Next.js 14** (App Router) + **TypeScript** + **Tailwind** +
**React Three Fiber** + **GSAP** + **Framer Motion** + **Lenis**. Deployed to
**Cloudflare Workers** via [OpenNext][opennext], with **Cloudflare D1** as the
A/B-test source of truth and a **Durable Object** (`StatsAggregator`) for
atomic per-session dedup of impression / click events.

[opennext]: https://opennext.js.org/cloudflare

## Quick start

```bash
npm install
npm run db:migrate:local   # creates the local D1 schema in .wrangler/
npm run dev                # http://localhost:3000
```

Skipping the migrate step will surface as `D1_ERROR: no such table: ab_events`
in the A/B test section — re-run it any time you add a file under
`migrations/` or wipe `.wrangler/`.

### Dev server behind portless (optional)

The author runs the dev server behind [portless][portless], which proxies a
stable HTTPS URL (e.g. `https://alexkafer.localhost:1355`) to whatever random
port Next.js picked. This is convenient for testing things that need real
HTTPS (secure cookies, service workers, OAuth callbacks) without touching
`sudo`.

[portless]: https://portless.sh

```bash
# One-time per machine: start the proxy on an unprivileged HTTPS port.
portless proxy start --port 1355 --https

# Start the app under portless. It assigns a random PORT and proxies to it.
portless alexkafer next dev
```

Plain `npm run dev` on `localhost:3000` continues to work and is the supported
path for everyone else.

### Other scripts

```bash
npm run build              # production build (injects build SHA + time)
npm run start              # serve the production build
npm run lint               # eslint via next lint
npx tsc --noEmit           # type-check
npm run demos:refresh      # rehydrate src/data/demos.json from GitHub
npm run db:migrate:local   # apply migrations/ to local D1 (.wrangler/)
npm run db:migrate:remote  # apply migrations/ to the deployed D1
npm run cf:build           # OpenNext build for Cloudflare Workers
npm run cf:preview         # cf:build + wrangler local preview (D1 + DO bound)
npm run cf:deploy          # cf:build + wrangler deploy
```

## Local D1 + Durable Object caveats

- **Local D1 schema.** `next dev` connects to a local D1 instance via
  OpenNext's dev hook. That database lives under `.wrangler/state/v3/d1/` and
  starts empty — `npm run db:migrate:local` populates it.
- **Durable Object in `next dev`.** Wrangler's `getPlatformProxy()` (the dev
  hook used by `next dev`) registers DO bindings but cannot run custom DO
  classes — it prints _"These will not work in local development, but they
  should work in production"_ at startup. The A/B routes detect this
  (`NODE_ENV !== "production"`) and write directly to local D1 instead of
  through the `StatsAggregator` DO. Dedup is best-effort in dev. To exercise
  the full DO path locally, use `npm run cf:preview` (real OpenNext bundle in
  `wrangler dev`). See [opennextjs-cloudflare#690][do-issue].

[do-issue]: https://github.com/opennextjs/opennextjs-cloudflare/issues/690

## Deploy to Cloudflare

The site builds for Cloudflare Workers via `@opennextjs/cloudflare`. All
Next.js routes (RSC + App Router + route handlers) run inside a single
Worker, with D1 + a Durable Object bound in.

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
npm run db:migrate:local    # for next dev + cf:preview (.wrangler/ local D1)
npm run db:migrate:remote   # for production
```

The `StatsAggregator` Durable Object class binding + its `v1` migration are
declared in `wrangler.toml` and applied automatically on first `cf:deploy`.

### Local preview against the Cloudflare runtime

```bash
npm run cf:preview
```

Runs `opennextjs-cloudflare build` then boots wrangler's local Workers
runtime with D1 + the DO bound to local SQLite/state in `.wrangler/`.

### Deploy

```bash
npm run cf:deploy
```

Equivalent to `opennextjs-cloudflare build && opennextjs-cloudflare deploy` —
builds the Worker bundle and uploads it via wrangler.

## Environment variables

`NEXT_PUBLIC_BUILD_*` are injected automatically by `npm run build` from
local git state. In production the D1 database and Durable Object are exposed
to the Worker as **bindings** declared in `wrangler.toml` — there are no
external DB credentials to set.

| Name                     | Used for                                            |
| ------------------------ | --------------------------------------------------- |
| `NEXT_PUBLIC_BUILD_SHA`  | Short git SHA shown in the `?`-key devtools overlay |
| `NEXT_PUBLIC_BUILD_TIME` | ISO build timestamp shown in the devtools overlay   |

Cloudflare bindings (auto-provided in production via `wrangler.toml`):

| Binding             | Type                  | Purpose                                         |
| ------------------- | --------------------- | ----------------------------------------------- |
| `DB`                | D1 database           | `ab_events` source of truth                     |
| `STATS_AGGREGATOR`  | Durable Object class  | Atomic per-session dedup + D1 write coordinator |

### A/B test section

The final page section is a real A/B test. Each visitor is randomly assigned
to variant A or B (cookie-persisted), and the impression + conversion are
stored in D1's `ab_events` table.

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
  `src/lib/ab.ts`) is the one that produced the displayed numbers.

Locally (`npm run dev`) writes go through OpenNext's local D1 with
best-effort SELECT-then-INSERT dedup; there's no DO outside the Cloudflare
runtime.

## Easter eggs

- Press <kbd>?</kbd> → devtools-style overlay (live FPS, scroll %, viewport,
  build SHA).
- Konami code (↑ ↑ ↓ ↓ ← → ← → B A) → unlocks a hidden console-log section
  under the footer.
- View-source the document → ASCII art comment in `<head>`.
- Hover hero nodes → mock service metadata (svc-id, region, p99).

## Accessibility

- Skip-to-content link (Tab on page load).
- Focus-visible rings (2 px cyan, `#7dd3fc`).
- `prefers-reduced-motion: reduce` disables pinned scroll triggers and heavy
  WebGL/scroll animations; a screen-reader narrative under `<main>`
  summarizes the story.

## Project layout

```
src/
  app/                    # Next.js App Router (layout, page, globals, OG image, /api/ab/*)
  components/
    hero/                 # R3F canvas, constellation, HUD chrome, tooltips
    sections/             # resume, demos, ab-test
    chrome/               # footer, devtools overlay, konami egg
    section.tsx           # reusable <Section> primitive (pin + progress)
  data/                   # demos.json (refreshed via scripts/refresh-demos.mjs)
  hooks/                  # useScrollTrigger, useReducedMotion
  labs/                   # lab manifest + types
  lib/                    # ab.ts, ab-context, lenis-provider, db, session, cf-env, cta-variants
migrations/               # D1 SQL migrations
scripts/                  # refresh-demos.mjs
worker.ts                 # OpenNext worker entry (exports StatsAggregator DO)
wrangler.toml             # Cloudflare bindings + DO migration
```

## Quality gates

Before shipping, run:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run cf:build
```

Then walk the [BROWSER_QA.md](BROWSER_QA.md) and
[LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) checklists.

## License

No license file is included yet. Until one is added, all rights are reserved
by the author. If you'd like to reuse a piece of this code, please open an
issue.
