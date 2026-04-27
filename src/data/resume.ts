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
