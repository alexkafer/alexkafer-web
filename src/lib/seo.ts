// src/lib/seo.ts
// Shared metadata + JSON-LD helpers. Keeps title/description/OG/canonical
// behavior consistent across routes and ensures JSON-LD derives from the
// same PROFILE source as the visible content.

import type { Metadata } from "next";
import { PROFILE } from "@/data/profile";
import { RESUME_TIERS } from "@/data/resume";

const SITE = PROFILE.siteUrl;
const DEFAULT_TITLE = `${PROFILE.name} · ${PROFILE.jobTitle} · ${PROFILE.employer.team}`;

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
    "@id": `${SITE}/#person`,
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
        // current.role looks like "Senior Product Manager · 2020 → present";
        // take the role title before the first "·".
        name: current.role.split("·")[0].trim() || current.role,
        occupationLocation: {
          "@type": "Place",
          name: `${PROFILE.location.locality}, ${PROFILE.location.region}`,
        },
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

/** Escapes characters that can break out of a <script> tag context. */
function safeJsonForScript(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Renders a JSON-LD <script> tag. Use as a child element in the route's
 * JSX. The DOM `id` attribute is for inspector ergonomics; crawlers
 * reconcile multiple JSON-LD blocks for the same entity via the
 * schema.org `@id` field on the payload itself (see buildPersonJsonLd).
 */
export function jsonLdScriptProps(id: string, data: object) {
  return {
    type: "application/ld+json" as const,
    id,
    dangerouslySetInnerHTML: { __html: safeJsonForScript(data) },
  };
}
