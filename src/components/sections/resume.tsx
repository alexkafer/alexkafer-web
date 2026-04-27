"use client";

import { Section, SectionInner } from "@/components/section";

type ResumeEntry = {
  slug: string;
  name: string;
  role: string;
  awards?: string[];
  /** Override the default `/logos/<slug>.svg` path. */
  logoSrc?: string;
};

type ResumeTier = {
  id: string;
  label: string;
  entries: ResumeEntry[];
};

const RESUME_TIERS: ResumeTier[] = [
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
        logoSrc: "/logos/first.svg",
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
        logoSrc: "/logos/mit.svg",
      },
    ],
  },
];

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

export function ResumeSection() {
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

export default ResumeSection;
