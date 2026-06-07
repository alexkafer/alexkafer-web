---
name: publish-lab
description: Use when publishing, shipping, porting, or submitting a new alexkafer.com lab from a prototype or idea. Covers repo-specific lab wiring, prototype intake, Next.js routes, metadata/SEO surfaces, validation commands, browser QA, git branch/commit/PR flow, and examples like Terminal UI or shadcn-tui prototypes.
---

# Publish Lab

Use this skill to take a lab idea or external prototype and ship it into
`alexkafer/alexkafer-web` in one pass, including code, metadata, validation, and
a pull request.

## Operating mode

1. Treat the current repo as the source of truth. Re-read the files listed below
   before changing code because the lab system is still evolving.
2. If a prototype path is given, inspect it read-only first. Copy only the code,
   assets, and dependencies needed for the published lab; do not vendor an entire
   app unless the user explicitly asks.
3. Prefer a production-quality, self-contained lab route over an index-only card
   when the user says "publish", "ship", "launch", or provides a working
   prototype.
4. Preserve the alexkafer.com look unless the lab intentionally owns a custom
   theme. For themed labs, scope tokens and global CSS to the lab route/component
   instead of changing site-wide theme variables unless the shared design system
   genuinely needs a new primitive.
5. Follow existing repo instructions, especially the portless dev-server flow in
   `.github/copilot-instructions.md`.

## Current lab surfaces

Check these files at the start of every publish:

| Surface | Purpose |
| --- | --- |
| `src/lib/labs/registry.ts` | Lab metadata and card ordering for `/labs`. |
| `src/lib/labs/registry.test.ts` | Registry invariants and named lab assertions. |
| `src/app/labs/page.tsx` | Lab index page and card rendering. |
| `src/app/sitemap.ts` | Public URL discovery. Add `/labs` and published lab routes when missing. |
| `src/app/llms.txt/route.ts` | Concise LLM-facing link index. Add a Labs section/link when relevant. |
| `src/app/llms-full.txt/route.ts` | Full LLM-facing content. Summarize published labs when relevant. |
| `src/app/globals.css` | Shared CSS variables. Avoid lab-specific globals unless intentionally shared. |
| `tailwind.config.ts` | Shared Tailwind tokens and content globs. Extend only for reusable primitives. |
| `README.md` | Scripts, quality gates, and project layout. Update only when workflow changes. |
| `.github/workflows/deploy.yml` | CI/preview behavior. PR previews share production D1. |

## Intake checklist

Before implementing, establish:

1. **Slug and title**: route-safe slug, display title, one-sentence summary, and
   desired status (`prototype`, `concept`, or `field-note` unless the registry
   type has changed).
2. **Prototype source**: path such as `~/Development/shadcn-tui`, target files to
   port, package manager, and whether generated/shadcn code needs attribution or
   simplification.
3. **Interaction model**: single screen, multi-step, keyboard-driven, canvas/WebGL,
   server-backed, or static field note.
4. **Dependencies**: reuse existing dependencies first. Add packages only when the
   lab cannot be reasonably implemented with current Next/React/Tailwind code.
5. **Data/runtime needs**: static-only by default. If a lab needs APIs, D1,
   Durable Objects, or external services, surface the deployment impact clearly
   and update Cloudflare config/tests.
6. **QA criteria**: at minimum, the lab route renders, `/labs` links to it, reduced
   motion/focus states are acceptable, and the build remains green.

If any of these are missing, make a reasonable assumption for straightforward
content or ask a targeted question before changing code when the choice affects
architecture, dependencies, licensing, or production services.

## Implementation workflow

1. **Create a branch**
   ```bash
   git switch -c lab/<slug>
   ```

2. **Inspect the prototype**
   - Read its package manifest, main route/component files, Tailwind/CSS config,
     and assets.
   - Identify the minimum viable published slice.
   - Translate prototype-only conventions into this repo's patterns instead of
     bringing over unrelated tooling.

3. **Add the lab UI**
   - Preferred route for a published lab: `src/app/labs/<slug>/page.tsx`.
   - Put substantial reusable pieces under `src/components/labs/<slug>/`.
   - Co-locate lab-only constants/helpers near the component unless they are
     shared across labs.
   - Export `metadata` with `defaultMetadata({ path, title, description })`.
   - Include a clear `<main id="main-content">` region and keep keyboard/focus
     behavior visible.
   - For terminal/TUI-themed labs:
     - Use `font-mono`, scoped CSS variables, high contrast, and visible focus
       rings.
     - Avoid real destructive terminal affordances unless inert or clearly fake.
     - Respect `prefers-reduced-motion` for cursor blink, scanlines, typing, and
       transition effects.

4. **Wire the registry**
   - Add or update a `LabDefinition` in `src/lib/labs/registry.ts`.
   - Use `href: "/labs/<slug>"` for published routes.
   - Keep `order` values spaced so future labs can be inserted.
   - Set `theme.name`, `theme.accent`, and `theme.background` to match the lab
     card preview without requiring custom logic in the index.

5. **Update discovery surfaces**
   - Ensure `/labs` is in `src/app/sitemap.ts`.
   - Add the new `/labs/<slug>` route to the sitemap.
   - Add or update Labs entries in `llms.txt` and `llms-full.txt` so crawlers can
     discover the lab without JavaScript.
   - Update docs only when the workflow, scripts, or public project description
     changes.

6. **Add/update tests**
   - Extend `src/lib/labs/registry.test.ts` for the new slug and href.
   - Add focused tests for pure helpers if the lab has non-trivial parsing,
     generation, math, or state-machine logic.
   - Do not add a new test framework. Use existing `node:test`/TypeScript
     patterns unless the repo has changed.

7. **Run quality gates**
   Run the smallest useful checks first, then the ship checks:
   ```bash
   npm run test:labs
   npm run lint
   npx tsc --noEmit
   npm run build
   npm run cf:build
   ```
   If `npm run build` flakes with a stale Next artifact, follow the repo guidance:
   remove `.next` and retry up to 2-3 times.

8. **Browser QA**
   Reuse an existing portless dev server when healthy:
   ```bash
   portless ls 2>/dev/null
   curl -skI https://alexkafer.localhost:1355/ | head -1
   pgrep -fl "next dev" || echo "no next dev running"
   ```
   Start only if needed:
   ```bash
   nohup npm run dev > /tmp/portless-dev.log 2>&1 &
   ```
   Check:
   - `/labs` shows the card and links to the route.
   - `/labs/<slug>` renders the intended lab.
   - Focus states, reduced motion, mobile layout, and theme contrast are usable.
   - No console errors or hydration mismatches.

9. **Commit and open the PR**
   ```bash
   git status --short
   git add <changed files>
   git commit -m "Publish <Title> lab"
   git push -u origin lab/<slug>
   gh pr create --fill
   ```
   Include validation results and manual QA notes in the PR body. If using the
   Copilot CLI to create the commit, include the required co-author trailer:
   ```text
   Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
   ```

## PR body template

```markdown
## Summary
- Published the <Title> lab at `/labs/<slug>`
- Added lab registry/discovery wiring

## Validation
- `npm run test:labs`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run cf:build`

## Browser QA
- `/labs`
- `/labs/<slug>`
- reduced motion / keyboard focus / mobile smoke
```

## Stop conditions

Stop and ask before proceeding if:

- The prototype license or ownership is unclear.
- Publishing requires new production credentials, paid services, or destructive
  data migrations.
- The lab depends on a large package/runtime that would significantly affect the
  main site's bundle or Cloudflare Worker constraints.
- The current worktree has user changes that conflict with the lab files you
  need to edit.
