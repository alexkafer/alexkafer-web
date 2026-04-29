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
  rel: "github" | "linkedin" | "email" | "site" | "other";
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
    { label: "LinkedIn", url: "https://www.linkedin.com/in/alexkafer/", rel: "linkedin" },
    { label: "Email", url: "mailto:me@alexkafer.com", rel: "email" },
    { label: "alexkafer.com", url: "https://alexkafer.com", rel: "site" },
  ] satisfies readonly ProfileLink[],
  /** Canonical site URL — used as `metadataBase` and in JSON-LD. */
  siteUrl: "https://alexkafer.com",
} as const;
