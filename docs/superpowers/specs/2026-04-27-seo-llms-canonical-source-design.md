# SEO + LLM Canonical Source Design

**Status:** Draft, awaiting user review
**Date:** 2026-04-27
**Branch:** `brainstorm/seo-llms`

## Problem

`alexkafer.com` is a single-page Next.js site. Today's SEO surface is solid for a one-pager (per-page metadata, OG/Twitter images, robots, sitemap, an `sr-only` bio fallback), but it has structural ceilings:

- Every query — "Alex Kafer", "Alex Kafer résumé", "Alex Kafer demos" — lands on the same URL with the same `<title>`. Google can't rank topic-specific pages because there aren't any.
- The visible content is heavily client-rendered (Three.js constellation, scroll-driven sections). LLM crawlers that don't execute JS see a near-empty page.
- There is no `llms.txt`, no JSON-LD structured data, and no machine-readable résumé export. LLMs answering "who is Alex Kafer?" have no canonical, parseable ground-truth document to cite.

**Goal:** Make the site the canonical, machine-readable source of truth for who Alex Kafer is — for both search engines (recruiter discovery) and LLM retrieval (accurate, citable answers).

## Approach

Add a small "document layer" alongside the existing SPA "experience layer."

- The SPA at `/` stays untouched as the showcase.
- Two new server-rendered sub-routes (`/resume`, `/about`) become the canonical, plain-voice document version of that content.
- A set of machine-readable artifacts (`llms.txt`, `llms-full.txt`, `resume.json`, JSON-LD) derive from the same data sources so they can never drift from the human-readable pages.
- All content sources are extracted into typed data modules so the SPA, the sub-routes, and the artifact files share a single source of truth.

## Scope

### In scope

- New routes: `/resume`, `/about`
- New artifact routes: `/llms.txt`, `/llms-full.txt`, `/resume.json`
- Per-route metadata + OG images for the new routes
- JSON-LD `Person` (and embedded `WorkExperience` / `EducationalOrganization`) on `/`, `/about`, `/resume`
- Updated `robots.ts` (explicit LLM-bot allow-list, reference `llms.txt`)
- Updated `sitemap.ts` (list new routes)
- Data extraction to `src/data/resume.ts` and `src/data/profile.ts`
- Shared SEO helper at `src/lib/seo.ts`
- Slimming of the `sr-only` block on `/` to avoid duplicating `/about`

### Out of scope (deliberate)

- `/demos` as its own route — current demo descriptions are too thin to justify a crawlable page; they remain an SPA section anchored at `/#demos`.
- Per-demo pages (`/demos/<slug>`).
- A `/writing` blog or any new long-form content.
- PDF résumé generation.
- Analytics / Search Console setup.
- Filling in expanded résumé content. Sub-routes ship with the existing sparse data plus inline `TODO` markers for follow-up prose.

## Architecture

### Routes

| Route | Type | Purpose | Canonical for |
|---|---|---|---|
| `/` | Existing SPA | Brand experience | Identity / homepage queries |
| `/resume` | New, server-rendered | Plain-voice work history | "Alex Kafer résumé" / experience queries |
| `/about` | New, server-rendered | Bio + structured "who I am" | "who is Alex Kafer?" / LLM grounding |
| `/llms.txt` | New, text route | Link index per llmstxt.org | LLM crawlers (discovery) |
| `/llms-full.txt` | New, text route | Inlined full content as Markdown | LLM crawlers (ingestion, no JS needed) |
| `/resume.json` | New, JSON route | JSON Resume schema export | Recruiter tools, parsers, LLMs that recognize the schema |

Canonical strategy:
- `/` declares itself canonical (existing behavior, unchanged).
- `/resume` and `/about` each declare themselves canonical via `metadata.alternates.canonical` in their respective `page.tsx` files.
- We do not add `<link rel="alternate">` from `/` back to the sub-routes — the SPA sections at `/#resume` are anchor links within the homepage, not separate documents. Google + LLMs are expected to pick the sub-route as the topic-canonical when ranking topic queries (because it has the matching `<title>`, content, and a self-canonical), and the homepage as canonical for identity/brand queries.

### Data layer (single source of truth)

- `src/data/resume.ts` — typed export of `RESUME_TIERS` (extracted from `src/components/sections/disguise.tsx`).
- `src/data/profile.ts` — name, current role, employer, location, focus areas, links (GitHub, email, etc.).
- `src/data/demos.json` — already exists, no change.

Consumers:
- `src/components/sections/disguise.tsx` imports from `resume.ts` instead of defining inline.
- `src/app/resume/page.tsx` imports from `resume.ts` + `profile.ts`.
- `src/app/about/page.tsx` imports from `profile.ts`.
- `src/app/llms.txt/route.ts` and `src/app/llms-full.txt/route.ts` import from all three.
- `src/app/resume.json/route.ts` imports from `resume.ts` + `profile.ts` and emits JSON Resume schema.
- `src/lib/seo.ts` imports from `profile.ts` and exposes JSON-LD builders.

### Voice

- SPA: keep the existing stylized voice ("PM by title. Systems engineer by instinct.").
- `/resume`, `/about`: plainer, recruiter-readable. Reads top-to-bottom like a normal résumé / about page. Skim-friendly for both humans and LLMs.

### Machine-readable artifacts

**`/llms.txt`** — link index per [llmstxt.org](https://llmstxt.org):
```
# Alex Kafer

> Senior Product Manager on the Xbox Platform team at Microsoft. Building secure, reliable platform services at billions/day.

## About
- [About](https://alexkafer.com/about): Bio, focus areas, links

## Résumé
- [Résumé](https://alexkafer.com/resume): Work history, education, internships
- [Résumé (JSON)](https://alexkafer.com/resume.json): JSON Resume schema export

## Demos
- [Demos](https://alexkafer.com/#demos): Curated public repositories

## Contact
- [GitHub](https://github.com/alexkafer)
```

**`/llms-full.txt`** — inlined full content in Markdown form:
- `/about` content
- `/resume` content (all tiers, all entries)
- Demos list (name + description + repo URL)
- A polite LLM crawler can fetch this single file and have everything without rendering JS.

**`/resume.json`** — JSON Resume schema (`https://jsonresume.org/schema/`):
- `basics` (name, label, email, url, location, profiles)
- `work` (Xbox Platform, Microsoft intern)
- `education` (UMN)
- `volunteer` / `awards` as appropriate (FIRST 2526)

**JSON-LD** (injected via `<script type="application/ld+json">`):
- `/` and `/about`: `Person` schema with `name`, `jobTitle`, `worksFor`, `url`, `sameAs` (GitHub, etc.), `knowsAbout` (focus areas).
- `/resume`: `Person` with embedded `hasOccupation` / `alumniOf` arrays mirroring the résumé tiers.

### Robots

`src/app/robots.ts` updated to:
- Explicitly allow `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot` (the goal is *more* LLM ingestion, not less).
- Continue allowing `*` to `/`.
- Reference `sitemap.xml`. (Next.js's `MetadataRoute.Robots` doesn't have a first-class `llms.txt` field; we'll surface it via the sitemap and the routes themselves.)

### Sitemap

`src/app/sitemap.ts` updated to include `/`, `/resume`, `/about` with `lastModified` derived from data file mtimes (so the sitemap updates when résumé data changes).

### Per-route metadata + OG

- Each new route exports its own `metadata` (title, description, canonical, OG, Twitter).
- Each new route gets its own `opengraph-image.tsx` (and `twitter-image.tsx` if differentiated) so a share from `/resume` shows résumé-themed OG copy. Visual treatment can mirror the existing OG image generator with route-aware text.

### `sr-only` slim-down on `/`

Current `page.tsx` has a hidden `<div class="sr-only">` with a bio paragraph. Once `/about` exists as canonical, replace with a one-sentence summary plus a link to `/about`. Avoids duplicate-content signals between `/` and `/about`.

### Shared SEO helper

`src/lib/seo.ts`:
- `PROFILE` re-export.
- `buildPersonJsonLd(opts)`, `buildResumeJsonLd()`.
- `defaultMetadata(opts)` for sub-routes (DRY around title template, OG defaults, canonical).

## File-level change summary

**New files:**
- `src/data/resume.ts`
- `src/data/profile.ts`
- `src/lib/seo.ts`
- `src/app/resume/page.tsx`
- `src/app/resume/opengraph-image.tsx`
- `src/app/about/page.tsx`
- `src/app/about/opengraph-image.tsx`
- `src/app/llms.txt/route.ts`
- `src/app/llms-full.txt/route.ts`
- `src/app/resume.json/route.ts`

**Modified files:**
- `src/components/sections/disguise.tsx` — import `RESUME_TIERS` from `src/data/resume.ts` instead of defining inline.
- `src/app/layout.tsx` — inject `Person` JSON-LD via the shared helper; keep existing metadata.
- `src/app/page.tsx` — slim the `sr-only` block, point at `/about`, add `/` JSON-LD.
- `src/app/robots.ts` — explicit LLM-bot allow-list.
- `src/app/sitemap.ts` — add new routes.

## Testing

This is a content/SEO change with no business logic. Verification approach:

- `npm run build` + `next start` locally, then:
  - `curl -s localhost:PORT/llms.txt` — confirm format, links resolve.
  - `curl -s localhost:PORT/llms-full.txt` — confirm full content present, no HTML.
  - `curl -s localhost:PORT/resume.json | jq` — validates as JSON Resume schema.
  - `curl -s localhost:PORT/resume`, `/about` — view-source contains the expected prose without JS execution.
  - `curl -s localhost:PORT/sitemap.xml` — lists all four URLs.
  - `curl -s localhost:PORT/robots.txt` — explicit bot allow-list present.
- Lighthouse on `/`, `/resume`, `/about` — SEO score should be ≥95 on all three.
- Validate JSON-LD via [Schema.org validator](https://validator.schema.org/) and Google's [Rich Results Test](https://search.google.com/test/rich-results).
- Validate JSON Resume via the [JSON Resume validator](https://jsonresume.org/) or `npx resume-cli validate`.

## Open questions / follow-ups (deferred)

- **Expanded résumé prose.** Sub-routes ship with TODO markers; user fills in accomplishment bullets in a follow-up.
- **Per-demo pages.** Revisit when individual demos have enough write-up content to justify their own URL.
- **/writing route.** Out of scope until there are posts to put on it.
- **Search Console / analytics setup.** Separate operational task.
