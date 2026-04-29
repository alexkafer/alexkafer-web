# SEO + LLM Canonical Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-rendered "document layer" (`/resume`, `/about`) plus machine-readable artifacts (`llms.txt`, `llms-full.txt`, `resume.json`, JSON-LD) so the site is the canonical, machine-readable source of truth for who Alex Kafer is.

**Architecture:** Extract shared data into typed modules (`src/data/resume.ts`, `src/data/profile.ts`) and a shared SEO helper (`src/lib/seo.ts`). The existing SPA at `/` consumes the same data, so the SPA, the new sub-routes, and the artifact files can never drift. New routes are pure server components — no GSAP, no Three.js, no client interactivity.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, OpenNext on Cloudflare. No test framework in this repo — verification is via `npm run build`, `curl` against `next dev`, and external schema validators.

**Spec:** `docs/superpowers/specs/2026-04-27-seo-llms-canonical-source-design.md`

---

## File Structure

**New files:**
- `src/data/resume.ts` — typed `RESUME_TIERS` (extracted from `disguise.tsx`)
- `src/data/profile.ts` — `PROFILE` constant: name, role, employer, location, focus areas, links
- `src/lib/seo.ts` — `defaultMetadata()`, `buildPersonJsonLd()`, `buildResumeJsonLd()`, `JsonLd` component
- `src/app/about/page.tsx` — `/about` server component
- `src/app/about/opengraph-image.tsx` — route-specific OG image
- `src/app/resume/page.tsx` — `/resume` server component
- `src/app/resume/opengraph-image.tsx` — route-specific OG image
- `src/app/llms.txt/route.ts` — link index per llmstxt.org spec
- `src/app/llms-full.txt/route.ts` — full content as Markdown
- `src/app/resume.json/route.ts` — JSON Resume schema export

**Modified files:**
- `src/components/sections/disguise.tsx` — import `RESUME_TIERS` from `src/data/resume.ts`
- `src/app/layout.tsx` — inject `Person` JSON-LD via `<JsonLd>`
- `src/app/page.tsx` — slim `sr-only` block, link to `/about`
- `src/app/robots.ts` — explicit LLM-bot allow-list
- `src/app/sitemap.ts` — list `/resume` and `/about`

---

## Task 1: Extract `RESUME_TIERS` to shared data module

**Files:**
- Create: `src/data/resume.ts`
- Modify: `src/components/sections/disguise.tsx` (remove inline `RESUME_TIERS`, import it)

- [ ] **Step 1: Create `src/data/resume.ts` with the extracted data and types**

```typescript
// src/data/resume.ts
// Single source of truth for résumé content. Consumed by:
// - src/components/sections/disguise.tsx (SPA résumé section)
// - src/app/resume/page.tsx (canonical /resume page)
// - src/app/llms-full.txt/route.ts
// - src/app/resume.json/route.ts

export type ResumeEntry = {
  slug: string;
  name: string;
  role: string;
  awards?: string[];
  /** Override the default `/logos/<slug>.svg` path. */
  logoSrc?: string;
};

export type ResumeTier = {
  id: string;
  label: string;
  entries: ResumeEntry[];
};

export const RESUME_TIERS: ResumeTier[] = [
  {
    id: "now",
    label: "// CURRENT",
    entries: [
      {
        slug: "xbox",
        name: "Xbox Platform · Microsoft",
        role: "Senior Product Manager · 2020 → present",
      },
    ],
  },
  {
    id: "education",
    label: "// EDUCATION",
    entries: [
      {
        slug: "umn",
        name: "University of Minnesota",
        role: "B.S. Computer Science · Robotics + AI · Product Design minor · 2016 – 2020",
      },
    ],
  },
  {
    id: "internships",
    label: "// INTERNSHIPS",
    entries: [
      {
        slug: "microsoft",
        name: "Microsoft",
        role: "Summer 2019",
      },
      {
        slug: "nasa",
        name: "NASA Johnson Space Center",
        role: "Fall 2018 – Spring 2019",
      },
      {
        slug: "polaris",
        name: "Polaris Inc.",
        role: "Summer 2017 · Summer 2018",
      },
    ],
  },
  {
    id: "before",
    label: "// BEFORE",
    entries: [
      {
        slug: "first-2526",
        name: "FIRST Robotics · Team 2526",
        role: "High school robotics",
        awards: [
          "Dean's List Finalist",
          "Chairman's Award",
          "Regional Champions",
        ],
      },
      {
        slug: "mit-launch",
        name: "MIT Launch",
        role: "Entrepreneurship program",
      },
    ],
  },
];
```

- [ ] **Step 2: Refactor `src/components/sections/disguise.tsx` to import from the new module**

Replace the inline type definitions and `RESUME_TIERS` array (lines 5-85 of the existing file) with an import. Keep everything else unchanged.

```typescript
// src/components/sections/disguise.tsx
"use client";

import { Section, SectionInner } from "@/components/section";
import { RESUME_TIERS, type ResumeEntry } from "@/data/resume";

function LogoMark({
  slug,
  name,
  src,
}: {
  slug: string;
  name: string;
  src?: string;
}) {
  // Plain <img> from /public — small monochrome SVGs, no need for next/image.
  // A muted background block holds the footprint until the SVG ships.
  return (
    <span className="relative inline-flex h-8 w-16 shrink-0 items-center justify-start">
      <span aria-hidden className="absolute inset-0 rounded bg-mute-700/20" />
      <img
        src={src ?? `/logos/${slug}.svg`}
        alt={`${name} logo`}
        className="relative h-8 w-auto max-w-full object-contain object-left text-mute-100 opacity-90 transition-opacity hover:opacity-100"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

function ResumeRow({ entry }: { entry: ResumeEntry }) {
  return (
    <li className="flex items-start gap-4">
      <LogoMark slug={entry.slug} name={entry.name} src={entry.logoSrc} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-mute-100">{entry.name}</p>
        <p className="font-mono text-xs text-mute-300">{entry.role}</p>
        {entry.awards && entry.awards.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {entry.awards.map((award) => (
              <li
                key={award}
                className="inline-flex items-center rounded border border-amber/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber/80"
              >
                {award}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function DisguiseSection() {
  return (
    <Section id="resume" aria-label="Résumé" className="!min-h-0">
      <SectionInner className="flex flex-col gap-12">
        <div className="space-y-6">
          <p
            id="resume-marker"
            className="ml-9 font-mono text-sm uppercase tracking-widest text-amber"
          >
            {"// 01 · RÉSUMÉ"}
          </p>
          <h2 className="text-balance font-sans text-4xl font-semibold leading-tight text-mute-100 md:text-6xl">
            <span className="block">PM by title.</span>
            <span className="mt-2 block text-cyan">
              Systems engineer by instinct.
            </span>
          </h2>
          <p className="max-w-2xl text-pretty text-base leading-relaxed text-mute-300">
            Five years building secure, reliable platform services. The product
            decisions are downstream of the systems thinking.
          </p>
        </div>

        <div className="space-y-10">
          {RESUME_TIERS.map((tier) => (
            <section
              key={tier.id}
              aria-labelledby={`resume-tier-${tier.id}`}
              className="border-t border-mute-700/40 pt-6"
            >
              <h3
                id={`resume-tier-${tier.id}`}
                className="mb-6 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan/60"
              >
                {tier.label}
              </h3>
              <ul className="grid grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                {tier.entries.map((entry) => (
                  <ResumeRow key={entry.slug} entry={entry} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </SectionInner>
    </Section>
  );
}

export default DisguiseSection;
```

- [ ] **Step 3: Verify build still succeeds**

Run: `npm run build`
Expected: Build completes with no TypeScript errors. Page bundle for `/` should be roughly the same size (data moved, not duplicated).

- [ ] **Step 4: Commit**

```bash
git add src/data/resume.ts src/components/sections/disguise.tsx
git commit -m "refactor(resume): extract RESUME_TIERS to src/data/resume.ts

No behavior change. Sets up shared data for upcoming /resume route
and llms-full.txt artifact.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Create `src/data/profile.ts`

**Files:**
- Create: `src/data/profile.ts`

- [ ] **Step 1: Create the profile module**

```typescript
// src/data/profile.ts
// Single source of truth for identity / "who is Alex Kafer?" content.
// Consumed by:
// - src/lib/seo.ts (JSON-LD Person schema, default metadata)
// - src/app/about/page.tsx
// - src/app/llms.txt/route.ts
// - src/app/llms-full.txt/route.ts
// - src/app/resume.json/route.ts

export type ProfileLink = {
  label: string;
  url: string;
  rel: "github" | "email" | "site" | "other";
};

export const PROFILE = {
  name: "Alex Kafer",
  jobTitle: "Senior Product Manager",
  employer: {
    name: "Microsoft",
    team: "Xbox Platform",
    url: "https://www.microsoft.com",
  },
  location: {
    locality: "Seattle",
    region: "WA",
    country: "US",
  },
  /** One-sentence summary used in meta descriptions, OG, llms.txt blockquote. */
  summary:
    "Senior Product Manager on the Xbox Platform team at Microsoft. Building secure, reliable platform services at billions/day.",
  /** Longer bio paragraph for /about and llms-full.txt. */
  bio: "Alex Kafer is a Senior Product Manager on the Xbox Platform team at Microsoft. He has five years of platform-engineering experience building secure, reliable, efficient services at scale, including work on Xbox Cloud Gaming and Xbox Remote Play. Before Microsoft, he interned at NASA Johnson Space Center on an NLP requirements-tooling project, and at Polaris Inc. He holds a B.S. in Computer Science from the University of Minnesota with a robotics + AI specialization and a product design minor.",
  /** Topical knowledge areas — surfaced as schema.org Person.knowsAbout. */
  knowsAbout: [
    "Platform engineering",
    "Distributed systems",
    "Product management",
    "Xbox Cloud Gaming",
    "Xbox Remote Play",
    "Service reliability",
    "Developer experience",
  ],
  links: [
    { label: "GitHub", url: "https://github.com/alexkafer", rel: "github" },
    { label: "alexkafer.com", url: "https://alexkafer.com", rel: "site" },
  ] as ProfileLink[],
  /** Canonical site URL — used as `metadataBase` and in JSON-LD. */
  siteUrl: "https://alexkafer.com",
} as const;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/profile.ts
git commit -m "feat(data): add PROFILE source-of-truth module

Used by SEO helpers, /about route, llms.txt artifacts, and JSON-LD.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Create `src/lib/seo.ts`

**Files:**
- Create: `src/lib/seo.ts`

- [ ] **Step 1: Create the SEO helper module**

```typescript
// src/lib/seo.ts
// Shared metadata + JSON-LD helpers. Keeps title/description/OG/canonical
// behavior consistent across routes and ensures JSON-LD derives from the
// same PROFILE source as the visible content.

import type { Metadata } from "next";
import { PROFILE } from "@/data/profile";
import { RESUME_TIERS } from "@/data/resume";

const SITE = PROFILE.siteUrl;
const DEFAULT_TITLE = `${PROFILE.name} — Senior PM, Xbox Platform`;

type DefaultMetadataOpts = {
  /** Path-only canonical, e.g. "/resume". Leading slash required. */
  path: string;
  /** Page title (will be combined with site name in <title>). Pass undefined for the homepage. */
  title?: string;
  /** Page description override. Defaults to PROFILE.summary. */
  description?: string;
};

export function defaultMetadata({
  path,
  title,
  description,
}: DefaultMetadataOpts): Metadata {
  const fullTitle = title ? `${title} · ${PROFILE.name}` : DEFAULT_TITLE;
  const desc = description ?? PROFILE.summary;
  const canonical = `${SITE}${path}`;
  return {
    title: fullTitle,
    description: desc,
    metadataBase: new URL(SITE),
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: fullTitle,
      description: desc,
      siteName: PROFILE.name,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: desc,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

/** Schema.org Person JSON-LD. Used on / and /about. */
export function buildPersonJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: PROFILE.name,
    jobTitle: PROFILE.jobTitle,
    description: PROFILE.summary,
    url: PROFILE.siteUrl,
    worksFor: {
      "@type": "Organization",
      name: PROFILE.employer.name,
      url: PROFILE.employer.url,
    },
    homeLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: PROFILE.location.locality,
        addressRegion: PROFILE.location.region,
        addressCountry: PROFILE.location.country,
      },
    },
    knowsAbout: [...PROFILE.knowsAbout],
    sameAs: PROFILE.links
      .filter((l) => l.rel !== "site")
      .map((l) => l.url),
  };
}

/** Person JSON-LD with embedded hasOccupation / alumniOf. Used on /resume. */
export function buildResumeJsonLd() {
  const base = buildPersonJsonLd();
  const current = RESUME_TIERS.find((t) => t.id === "now")?.entries[0];
  const education = RESUME_TIERS.find((t) => t.id === "education")?.entries[0];
  return {
    ...base,
    ...(current && {
      hasOccupation: {
        "@type": "Occupation",
        name: current.role.split("·")[0]?.trim() ?? current.role,
        occupationLocation: {
          "@type": "Place",
          name: `${PROFILE.location.locality}, ${PROFILE.location.region}`,
        },
        description: current.name,
      },
    }),
    ...(education && {
      alumniOf: {
        "@type": "EducationalOrganization",
        name: education.name,
        description: education.role,
      },
    }),
  };
}

/**
 * Renders a JSON-LD <script> tag. Use as a child element in the route's
 * JSX. The `id` attribute lets us avoid duplicate JSON-LD when /about
 * inherits the layout's Person schema.
 */
export function jsonLdScriptProps(id: string, data: object) {
  return {
    type: "application/ld+json" as const,
    id,
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/seo.ts
git commit -m "feat(seo): add shared metadata + JSON-LD helpers

defaultMetadata() centralizes title/canonical/OG behavior across
routes. buildPersonJsonLd / buildResumeJsonLd derive Schema.org
markup from PROFILE + RESUME_TIERS.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Inject `Person` JSON-LD on `/` via layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add JSON-LD script tag inside `<body>`**

Replace the existing `src/app/layout.tsx` with:

```tsx
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/lib/lenis-provider";
import { buildPersonJsonLd, jsonLdScriptProps } from "@/lib/seo";
import { PROFILE } from "@/data/profile";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${PROFILE.name} — Senior PM, Xbox Platform`,
  description: PROFILE.summary,
  metadataBase: new URL(PROFILE.siteUrl),
  alternates: {
    canonical: `${PROFILE.siteUrl}/`,
  },
  openGraph: {
    type: "website",
    url: PROFILE.siteUrl,
    title: `${PROFILE.name} — Senior PM, Xbox Platform`,
    description: PROFILE.summary,
    siteName: PROFILE.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${PROFILE.name} — Senior PM, Xbox Platform`,
    description: PROFILE.summary,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050510",
};

const ASCII_EASTER_EGG = `
                  *       .            *
      .                   *      .           *
                *                .
            .         *      _          .
                            | |
          *      .  _ __ ___| | _____    *
                   | '__/ _ \\ |/ / _ \\      .
            .      | | |  __/   <  __/  *
                   |_|  \\___|_|\\_\\___|         *
            *               .            *

  // Hi. Built with care. Source: github.com/alexkafer/alexkafer
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-cyan focus:px-4 focus:py-2 focus:text-void"
        >
          Skip to content
        </a>
        <LenisProvider>{children}</LenisProvider>
        <script
          {...jsonLdScriptProps("ld-person-root", buildPersonJsonLd())}
        />
        <script
          type="application/x-ascii-art"
          dangerouslySetInnerHTML={{ __html: ASCII_EASTER_EGG }}
        />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Build and verify JSON-LD is in the rendered HTML**

Run: `npm run build && npm run start &` then `curl -s http://localhost:3000/ | grep -o 'application/ld+json' | head -1`
Expected: `application/ld+json` (one match). Stop the server: `kill %1`.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(seo): inject Person JSON-LD on every page

Schema.org Person markup with name, jobTitle, worksFor, location,
knowsAbout, and sameAs. Sourced from PROFILE.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Create `/about` page

**Files:**
- Create: `src/app/about/page.tsx`

- [ ] **Step 1: Create the route**

```tsx
// src/app/about/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { PROFILE } from "@/data/profile";
import {
  buildPersonJsonLd,
  defaultMetadata,
  jsonLdScriptProps,
} from "@/lib/seo";

export const metadata: Metadata = defaultMetadata({
  path: "/about",
  title: "About",
  description: PROFILE.summary,
});

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 md:px-10 text-mute-100">
      <script {...jsonLdScriptProps("ld-person-about", buildPersonJsonLd())} />

      <p className="font-mono text-sm uppercase tracking-widest text-amber">
        // ABOUT
      </p>
      <h1 className="mt-6 text-balance text-4xl font-semibold leading-tight md:text-5xl">
        {PROFILE.name}
      </h1>
      <p className="mt-2 font-mono text-sm text-cyan">
        {PROFILE.jobTitle} · {PROFILE.employer.team} · {PROFILE.employer.name}
      </p>
      <p className="mt-1 font-mono text-xs text-mute-500">
        {PROFILE.location.locality}, {PROFILE.location.region}
      </p>

      <p className="mt-8 text-pretty text-base leading-relaxed text-mute-300">
        {PROFILE.bio}
      </p>

      <section
        aria-labelledby="focus-heading"
        className="mt-12 border-t border-mute-700/40 pt-6"
      >
        <h2
          id="focus-heading"
          className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan/60"
        >
          // FOCUS AREAS
        </h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PROFILE.knowsAbout.map((topic) => (
            <li
              key={topic}
              className="font-mono text-xs text-mute-300"
            >
              {topic}
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="links-heading"
        className="mt-12 border-t border-mute-700/40 pt-6"
      >
        <h2
          id="links-heading"
          className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan/60"
        >
          // LINKS
        </h2>
        <ul className="space-y-2">
          {PROFILE.links.map((l) => (
            <li key={l.url} className="font-mono text-sm">
              <a
                href={l.url}
                className="text-cyan hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                {l.label} →
              </a>
            </li>
          ))}
          <li className="font-mono text-sm">
            <Link href="/resume" className="text-cyan hover:underline">
              Résumé →
            </Link>
          </li>
        </ul>
      </section>

      <p className="mt-16 font-mono text-xs text-mute-500">
        <Link href="/" className="hover:text-cyan">
          ← back to home
        </Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Build and verify the route renders without JS**

Run: `npm run build && npm run start &` then:
```bash
curl -s http://localhost:3000/about | grep -E "Alex Kafer|FOCUS AREAS|application/ld\+json" | head -5
```
Expected: Lines matching the name, "FOCUS AREAS", and an `application/ld+json` script tag. Stop the server: `kill %1`.

- [ ] **Step 3: Commit**

```bash
git add src/app/about/page.tsx
git commit -m "feat(about): add /about canonical route

Server-rendered bio, focus areas, and links. Sourced from PROFILE.
Includes Person JSON-LD scoped to the route.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Create `/about` route OG image

**Files:**
- Create: `src/app/about/opengraph-image.tsx`

- [ ] **Step 1: Create the OG image route**

```tsx
// src/app/about/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { PROFILE } from "@/data/profile";

export const dynamic = "force-dynamic";
export const alt = `About ${PROFILE.name} — ${PROFILE.jobTitle}, ${PROFILE.employer.team}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function AboutOgImage() {
  const starfield = [
    "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.6), transparent 60%)",
    "radial-gradient(1.5px 1.5px at 70% 60%, rgba(125,211,252,0.5), transparent 60%)",
    "radial-gradient(1200px 600px at 20% 100%, rgba(125,211,252,0.10), transparent 60%)",
    "linear-gradient(180deg, #050510 0%, #0a0e1a 100%)",
  ].join(", ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundImage: starfield,
          color: "#e6edf3",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#7dd3fc",
            letterSpacing: 2,
          }}
        >
          <span>{"// alexkafer.com/about"}</span>
          <span style={{ color: "#fbbf24" }}>WHO · IS · ALEX</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 28, color: "#7dd3fc", letterSpacing: 2 }}>
            ABOUT
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              lineHeight: 1.1,
              color: "#e6edf3",
              maxWidth: 1000,
            }}
          >
            {PROFILE.name}
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#9ca3af",
              borderLeft: "3px solid #7dd3fc",
              paddingLeft: 18,
              maxWidth: 1000,
            }}
          >
            {PROFILE.jobTitle} · {PROFILE.employer.team} · {PROFILE.employer.name}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 20,
            color: "#6b7280",
          }}
        >
          <span>{`// ${PROFILE.location.locality}, ${PROFILE.location.region}`}</span>
          <span>identity · canonical</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
```

- [ ] **Step 2: Build and verify OG image route responds**

Run: `npm run build && npm run start &` then `curl -sI http://localhost:3000/about/opengraph-image | head -5`
Expected: `HTTP/1.1 200 OK` with `Content-Type: image/png`. Stop: `kill %1`.

- [ ] **Step 3: Commit**

```bash
git add src/app/about/opengraph-image.tsx
git commit -m "feat(about): route-specific OG image for /about

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Create `/resume` page

**Files:**
- Create: `src/app/resume/page.tsx`

- [ ] **Step 1: Create the route**

```tsx
// src/app/resume/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { PROFILE } from "@/data/profile";
import { RESUME_TIERS, type ResumeEntry } from "@/data/resume";
import {
  buildResumeJsonLd,
  defaultMetadata,
  jsonLdScriptProps,
} from "@/lib/seo";

export const metadata: Metadata = defaultMetadata({
  path: "/resume",
  title: "Résumé",
  description: `Work history, education, and internships of ${PROFILE.name}, ${PROFILE.jobTitle} on the ${PROFILE.employer.team} team at ${PROFILE.employer.name}.`,
});

function ResumeRow({ entry }: { entry: ResumeEntry }) {
  return (
    <li className="border-l-2 border-mute-700/40 py-3 pl-5">
      <p className="text-base font-semibold text-mute-100">{entry.name}</p>
      <p className="mt-1 font-mono text-xs text-mute-300">{entry.role}</p>
      {entry.awards && entry.awards.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {entry.awards.map((award) => (
            <li
              key={award}
              className="inline-flex items-center rounded border border-amber/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber/80"
            >
              {award}
            </li>
          ))}
        </ul>
      )}
      {/* TODO: expand with accomplishment bullets in a follow-up */}
    </li>
  );
}

export default function ResumePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 md:px-10 text-mute-100">
      <script {...jsonLdScriptProps("ld-person-resume", buildResumeJsonLd())} />

      <p className="font-mono text-sm uppercase tracking-widest text-amber">
        // RÉSUMÉ
      </p>
      <h1 className="mt-6 text-balance text-4xl font-semibold leading-tight md:text-5xl">
        {PROFILE.name}
      </h1>
      <p className="mt-2 font-mono text-sm text-cyan">
        {PROFILE.jobTitle} · {PROFILE.employer.team} · {PROFILE.employer.name}
      </p>
      <p className="mt-1 font-mono text-xs text-mute-500">
        {PROFILE.location.locality}, {PROFILE.location.region}
      </p>

      <p className="mt-8 text-pretty text-base leading-relaxed text-mute-300">
        Five years building secure, reliable platform services. The product
        decisions are downstream of the systems thinking.
      </p>

      <p className="mt-4 font-mono text-xs text-mute-500">
        Also available as{" "}
        <Link href="/resume.json" className="text-cyan hover:underline">
          resume.json
        </Link>{" "}
        (
        <a
          href="https://jsonresume.org/schema/"
          rel="noopener noreferrer"
          target="_blank"
          className="text-cyan hover:underline"
        >
          JSON Resume schema
        </a>
        ).
      </p>

      <div className="mt-12 space-y-12">
        {RESUME_TIERS.map((tier) => (
          <section
            key={tier.id}
            aria-labelledby={`tier-${tier.id}`}
            className="border-t border-mute-700/40 pt-6"
          >
            <h2
              id={`tier-${tier.id}`}
              className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan/60"
            >
              {tier.label}
            </h2>
            <ul className="space-y-4">
              {tier.entries.map((entry) => (
                <ResumeRow key={entry.slug} entry={entry} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-16 font-mono text-xs text-mute-500">
        <Link href="/" className="hover:text-cyan">
          ← back to home
        </Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build && npm run start &` then:
```bash
curl -s http://localhost:3000/resume | grep -E "Xbox Platform|EDUCATION|alumniOf|hasOccupation" | head -5
```
Expected: Lines matching résumé content + JSON-LD `alumniOf` and `hasOccupation`. Stop: `kill %1`.

- [ ] **Step 3: Commit**

```bash
git add src/app/resume/page.tsx
git commit -m "feat(resume): add /resume canonical route

Server-rendered résumé page sourced from RESUME_TIERS + PROFILE.
Includes Person JSON-LD with embedded hasOccupation and alumniOf.
Sparse content + TODO markers for follow-up prose expansion.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: Create `/resume` route OG image

**Files:**
- Create: `src/app/resume/opengraph-image.tsx`

- [ ] **Step 1: Create the OG image route**

```tsx
// src/app/resume/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { PROFILE } from "@/data/profile";

export const dynamic = "force-dynamic";
export const alt = `Résumé · ${PROFILE.name} — ${PROFILE.jobTitle}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ResumeOgImage() {
  const starfield = [
    "radial-gradient(1px 1px at 15% 25%, rgba(255,255,255,0.6), transparent 60%)",
    "radial-gradient(1.5px 1.5px at 80% 70%, rgba(125,211,252,0.5), transparent 60%)",
    "radial-gradient(1200px 600px at 100% 0%, rgba(251,191,36,0.08), transparent 60%)",
    "linear-gradient(180deg, #050510 0%, #0a0e1a 100%)",
  ].join(", ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundImage: starfield,
          color: "#e6edf3",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#7dd3fc",
            letterSpacing: 2,
          }}
        >
          <span>{"// alexkafer.com/resume"}</span>
          <span style={{ color: "#fbbf24" }}>5 · YEARS · PLATFORM</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 28, color: "#fbbf24", letterSpacing: 2 }}>
            RÉSUMÉ
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              lineHeight: 1.1,
              color: "#e6edf3",
              maxWidth: 1000,
            }}
          >
            {PROFILE.name}
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#9ca3af",
              borderLeft: "3px solid #fbbf24",
              paddingLeft: 18,
              maxWidth: 1000,
            }}
          >
            {PROFILE.jobTitle} · {PROFILE.employer.team} · {PROFILE.employer.name}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 20,
            color: "#6b7280",
          }}
        >
          <span>{`// ${PROFILE.location.locality}, ${PROFILE.location.region}`}</span>
          <span>resume.json available</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build && npm run start &` then `curl -sI http://localhost:3000/resume/opengraph-image | head -5`
Expected: `HTTP/1.1 200 OK` with `Content-Type: image/png`. Stop: `kill %1`.

- [ ] **Step 3: Commit**

```bash
git add src/app/resume/opengraph-image.tsx
git commit -m "feat(resume): route-specific OG image for /resume

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 9: Create `/llms.txt` route

**Files:**
- Create: `src/app/llms.txt/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/llms.txt/route.ts
// llms.txt link index per https://llmstxt.org/
// Goal: give LLM crawlers a concise, machine-friendly map of the site.

import { PROFILE } from "@/data/profile";

export const dynamic = "force-static";

export async function GET() {
  const site = PROFILE.siteUrl;
  const body = [
    `# ${PROFILE.name}`,
    "",
    `> ${PROFILE.summary}`,
    "",
    "## About",
    `- [About](${site}/about): Bio, focus areas, links`,
    "",
    "## Résumé",
    `- [Résumé](${site}/resume): Work history, education, internships`,
    `- [Résumé (JSON Resume schema)](${site}/resume.json): Machine-readable JSON export`,
    "",
    "## Demos",
    `- [Demos](${site}/#demos): Curated public side projects and prototypes`,
    "",
    "## Contact",
    ...PROFILE.links.map((l) => `- [${l.label}](${l.url})`),
    "",
    "## Full content",
    `- [llms-full.txt](${site}/llms-full.txt): Full inlined content of all canonical pages`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build && npm run start &` then:
```bash
curl -s http://localhost:3000/llms.txt
```
Expected: Plain-text output starting with `# Alex Kafer`, blockquote summary, then sectioned link list. Stop: `kill %1`.

- [ ] **Step 3: Commit**

```bash
git add src/app/llms.txt/route.ts
git commit -m "feat(llms): add /llms.txt link index

Per llmstxt.org spec. Sourced from PROFILE.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 10: Create `/llms-full.txt` route

**Files:**
- Create: `src/app/llms-full.txt/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/llms-full.txt/route.ts
// Full inlined content of all canonical pages, as Markdown.
// Goal: a polite LLM crawler can fetch this single file and have everything
// without rendering JavaScript.

import { PROFILE } from "@/data/profile";
import { RESUME_TIERS } from "@/data/resume";
import demosData from "@/data/demos.json";

type Demo = {
  repo: string;
  name: string;
  description: string;
  homepage: string;
  language: string;
  stars: number;
  pushedAt: string;
  hidden: boolean;
};

export const dynamic = "force-static";

export async function GET() {
  const site = PROFILE.siteUrl;

  const demos = (demosData as Demo[])
    .filter((d) => !d.hidden)
    .sort((a, b) => (b.pushedAt > a.pushedAt ? 1 : -1));

  const lines: string[] = [];

  lines.push(`# ${PROFILE.name}`);
  lines.push("");
  lines.push(`> ${PROFILE.summary}`);
  lines.push("");
  lines.push(`Source of truth: ${site}`);
  lines.push("");

  // About
  lines.push("## About");
  lines.push("");
  lines.push(
    `**${PROFILE.jobTitle}** · ${PROFILE.employer.team} · ${PROFILE.employer.name}`,
  );
  lines.push(
    `Location: ${PROFILE.location.locality}, ${PROFILE.location.region}, ${PROFILE.location.country}`,
  );
  lines.push("");
  lines.push(PROFILE.bio);
  lines.push("");
  lines.push("### Focus areas");
  lines.push("");
  for (const topic of PROFILE.knowsAbout) {
    lines.push(`- ${topic}`);
  }
  lines.push("");
  lines.push("### Links");
  lines.push("");
  for (const l of PROFILE.links) {
    lines.push(`- ${l.label}: ${l.url}`);
  }
  lines.push("");

  // Résumé
  lines.push("## Résumé");
  lines.push("");
  lines.push(`Canonical URL: ${site}/resume`);
  lines.push(`Machine-readable: ${site}/resume.json (JSON Resume schema)`);
  lines.push("");
  for (const tier of RESUME_TIERS) {
    const tierLabel = tier.label.replace(/^\/\/\s*/, "");
    lines.push(`### ${tierLabel}`);
    lines.push("");
    for (const entry of tier.entries) {
      lines.push(`- **${entry.name}** — ${entry.role}`);
      if (entry.awards && entry.awards.length > 0) {
        for (const award of entry.awards) {
          lines.push(`  - Award: ${award}`);
        }
      }
    }
    lines.push("");
  }

  // Demos
  lines.push("## Demos");
  lines.push("");
  lines.push(`Listed on the homepage at ${site}/#demos.`);
  lines.push("");
  for (const d of demos) {
    const repoUrl = `https://github.com/${d.repo}`;
    const desc = d.description?.trim() || "(no description)";
    lines.push(`- **${d.name}** (${d.language || "—"}) — ${desc}`);
    lines.push(`  - Repo: ${repoUrl}`);
    if (d.homepage) lines.push(`  - Live: ${d.homepage}`);
  }
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build && npm run start &` then:
```bash
curl -s http://localhost:3000/llms-full.txt | head -40
```
Expected: Markdown output containing `# Alex Kafer`, `## About`, `## Résumé`, `## Demos` sections with résumé entries and demo names. Stop: `kill %1`.

- [ ] **Step 3: Commit**

```bash
git add src/app/llms-full.txt/route.ts
git commit -m "feat(llms): add /llms-full.txt full-content artifact

Inlines /about, /resume, and demos as Markdown so LLM crawlers can
ingest everything without rendering JavaScript.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 11: Create `/resume.json` route (JSON Resume schema)

**Files:**
- Create: `src/app/resume.json/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/resume.json/route.ts
// JSON Resume schema (https://jsonresume.org/schema/) export.
// Sourced from PROFILE + RESUME_TIERS so it can never drift from /resume.

import { PROFILE } from "@/data/profile";
import { RESUME_TIERS } from "@/data/resume";

export const dynamic = "force-static";

type WorkEntry = {
  name: string;
  position: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
};

type EducationEntry = {
  institution: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
};

type AwardEntry = {
  title: string;
  awarder: string;
};

export async function GET() {
  const current = RESUME_TIERS.find((t) => t.id === "now")?.entries ?? [];
  const internships =
    RESUME_TIERS.find((t) => t.id === "internships")?.entries ?? [];
  const education = RESUME_TIERS.find((t) => t.id === "education")?.entries ?? [];
  const before = RESUME_TIERS.find((t) => t.id === "before")?.entries ?? [];

  const work: WorkEntry[] = [
    ...current.map((e) => ({
      name: e.name,
      position: PROFILE.jobTitle,
      summary: e.role,
    })),
    ...internships.map((e) => ({
      name: e.name,
      position: "Intern",
      summary: e.role,
    })),
  ];

  const educationOut: EducationEntry[] = education.map((e) => ({
    institution: e.name,
    studyType: e.role,
  }));

  const awards: AwardEntry[] = before.flatMap((e) =>
    (e.awards ?? []).map((a) => ({ title: a, awarder: e.name })),
  );

  const resume = {
    $schema:
      "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
    basics: {
      name: PROFILE.name,
      label: `${PROFILE.jobTitle} · ${PROFILE.employer.team}`,
      url: PROFILE.siteUrl,
      summary: PROFILE.summary,
      location: {
        city: PROFILE.location.locality,
        region: PROFILE.location.region,
        countryCode: PROFILE.location.country,
      },
      profiles: PROFILE.links
        .filter((l) => l.rel === "github")
        .map((l) => ({
          network: "GitHub",
          username: l.url.split("/").pop() ?? "",
          url: l.url,
        })),
    },
    work,
    education: educationOut,
    awards,
  };

  return new Response(JSON.stringify(resume, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build && npm run start &` then:
```bash
curl -s http://localhost:3000/resume.json | head -30
```
Expected: Valid JSON starting with `{` and including `"$schema"`, `"basics"`, `"work"`, `"education"`, `"awards"` keys. Optionally pipe to `jq .` to confirm validity. Stop: `kill %1`.

- [ ] **Step 3: Commit**

```bash
git add src/app/resume.json/route.ts
git commit -m "feat(resume): add /resume.json (JSON Resume schema)

Machine-readable résumé export. Recruiter tools, parsers, and LLMs
that recognize the schema can consume this directly.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 12: Update `robots.ts` with explicit LLM-bot allow-list

**Files:**
- Modify: `src/app/robots.ts`

- [ ] **Step 1: Replace the contents**

```typescript
// src/app/robots.ts
import type { MetadataRoute } from "next";
import { PROFILE } from "@/data/profile";

// We want LLM ingestion. Explicitly allow the major bots so we don't
// inherit any default-block behavior from CDNs or future site infrastructure.
const LLM_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...LLM_BOTS.map((ua) => ({ userAgent: ua, allow: "/" })),
    ],
    sitemap: `${PROFILE.siteUrl}/sitemap.xml`,
    host: PROFILE.siteUrl,
  };
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build && npm run start &` then `curl -s http://localhost:3000/robots.txt`
Expected: Output containing `User-Agent: *`, `User-Agent: GPTBot`, `User-Agent: ClaudeBot`, etc., and a `Sitemap:` line. Stop: `kill %1`.

- [ ] **Step 3: Commit**

```bash
git add src/app/robots.ts
git commit -m "feat(seo): explicit LLM-bot allow-list in robots.txt

GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, and
others. Goal is more LLM ingestion, not less.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 13: Update `sitemap.ts` to include new routes

**Files:**
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Replace the contents**

```typescript
// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { PROFILE } from "@/data/profile";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const site = PROFILE.siteUrl;
  return [
    {
      url: `${site}/`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${site}/resume`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${site}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build && npm run start &` then:
```bash
curl -s http://localhost:3000/sitemap.xml | grep "<loc>"
```
Expected: Three `<loc>` lines: `https://alexkafer.com/`, `https://alexkafer.com/resume`, `https://alexkafer.com/about`. Stop: `kill %1`.

- [ ] **Step 3: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat(seo): list /resume and /about in sitemap

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 14: Slim `sr-only` block on `/`, link to `/about`

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace the `sr-only` block**

In `src/app/page.tsx`, replace lines 39-49 (the `<div className="sr-only">` and its children) with:

```tsx
        <div className="sr-only">
          <h2>About Alex Kafer</h2>
          <p>
            Senior Product Manager on the Xbox Platform team at Microsoft.{" "}
            <a href="/about">Read the full bio</a> or view the{" "}
            <a href="/resume">résumé</a>.
          </p>
        </div>
```

The full file should now look like:

```tsx
import dynamic from "next/dynamic";
import { ABExperimentProvider } from "@/lib/ab-context";
import Hero from "@/components/hero";
import HudChrome from "@/components/hero/hud-chrome";
import Disguise from "@/components/sections/disguise";
import Demos from "@/components/sections/demos";
import ABTest from "@/components/sections/ab-test";
import Footer from "@/components/chrome/footer";

const ConstellationBackground = dynamic(
  () =>
    import("@/components/hero/constellation-background").then(
      (m) => m.ConstellationBackground,
    ),
  { ssr: false, loading: () => null },
);
const DevtoolsOverlay = dynamic(
  () => import("@/components/chrome/devtools-overlay"),
  { ssr: false },
);
const KonamiEgg = dynamic(() => import("@/components/chrome/konami-egg"), {
  ssr: false,
});

export default function Page() {
  return (
    <ABExperimentProvider>
      <ConstellationBackground />
      <HudChrome />
      <main id="main-content" className="relative z-10 text-mute-100">
        <Hero />
        <Disguise />
        <Demos />
        <ABTest />
        <Footer />
        <DevtoolsOverlay />
        <KonamiEgg />

        <div className="sr-only">
          <h2>About Alex Kafer</h2>
          <p>
            Senior Product Manager on the Xbox Platform team at Microsoft.{" "}
            <a href="/about">Read the full bio</a> or view the{" "}
            <a href="/resume">résumé</a>.
          </p>
        </div>
      </main>
    </ABExperimentProvider>
  );
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build && npm run start &` then:
```bash
curl -s http://localhost:3000/ | grep -E 'sr-only|/about|/resume' | head -5
```
Expected: Lines showing the slimmed `sr-only` block links to `/about` and `/resume`. Stop: `kill %1`.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor(home): slim sr-only block, link to /about and /resume

Avoids duplicate-content signals between / and /about now that
/about is canonical for bio content.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 15: Final end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Build completes with no errors. New routes (`/about`, `/resume`, `/llms.txt`, `/llms-full.txt`, `/resume.json`) appear in the route summary.

- [ ] **Step 2: Smoke-test every new surface**

Start: `npm run start &`
Run each:
```bash
curl -sI http://localhost:3000/about | head -1            # 200
curl -sI http://localhost:3000/resume | head -1           # 200
curl -sI http://localhost:3000/about/opengraph-image | head -1   # 200 image/png
curl -sI http://localhost:3000/resume/opengraph-image | head -1  # 200 image/png
curl -s   http://localhost:3000/llms.txt | head -3        # # Alex Kafer ...
curl -s   http://localhost:3000/llms-full.txt | wc -l     # > 30 lines
curl -s   http://localhost:3000/resume.json | head -1     # {
curl -s   http://localhost:3000/robots.txt | grep GPTBot  # User-Agent: GPTBot
curl -s   http://localhost:3000/sitemap.xml | grep -c '<loc>'   # 3
```
Expected: All commands return the indicated values.

Stop: `kill %1`

- [ ] **Step 3: Validate JSON-LD on rendered pages**

Run: `npm run start &` then:
```bash
for path in / /about /resume; do
  echo "=== $path ==="
  curl -s "http://localhost:3000${path}" | sed -n 's/.*<script type="application\/ld+json"[^>]*>\(.*\)<\/script>.*/\1/p' | head -1
done
```
Expected: Each path emits a JSON-LD blob. `/` and `/about` should have `Person`, `/resume` should additionally include `hasOccupation` and `alumniOf`. Optionally paste each into <https://validator.schema.org/> to confirm validity.

Stop: `kill %1`

- [ ] **Step 4: Validate JSON Resume**

Run: `npm run start &` then:
```bash
curl -s http://localhost:3000/resume.json | npx --yes resume-cli@latest validate /dev/stdin || true
```
Expected: Either passes validation or reports any schema issues to address. If validation tool is unavailable, paste the JSON into <https://jsonresume.org/getting-started/> to validate manually.

Stop: `kill %1`

- [ ] **Step 5: No additional commit**

This task is verification only. If issues are found, return to the relevant task and fix before proceeding.

---

## Self-Review Notes

- **Spec coverage:** Every item in the spec's "In scope" section has a task: routes (5, 7), OG images (6, 8), JSON-LD (3, 4, 5, 7), robots (12), sitemap (13), data extraction (1, 2), shared SEO helper (3), sr-only slim (14), llms.txt + llms-full.txt + resume.json (9, 10, 11). The "Out of scope" items are correctly absent.
- **Type consistency:** `RESUME_TIERS`, `ResumeEntry`, `ResumeTier`, `PROFILE`, `defaultMetadata`, `buildPersonJsonLd`, `buildResumeJsonLd`, `jsonLdScriptProps` are referenced consistently across tasks 1–14.
- **No placeholders:** All steps include actual code or actual commands. The single `TODO` in Task 7 is intentional (per user choice in the spec) and is a code comment in the production output, not a plan-level deferral.
