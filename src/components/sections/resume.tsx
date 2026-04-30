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
  const url = src ?? `/logos/${slug}.svg`;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt={`${name} logo`}
      className="h-8 w-16 shrink-0 object-contain object-left opacity-90 transition-opacity hover:opacity-100"
    />
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
            {"// 02 · RÉSUMÉ"}
          </p>
          <h2 className="text-balance font-sans text-4xl font-semibold leading-tight text-mute-100 md:text-6xl">
            Where I&apos;ve <span className="text-cyan">shipped.</span>
          </h2>
          <p className="max-w-2xl text-pretty text-base leading-relaxed text-mute-300">
            Six years on platform services across Xbox, NASA, and earlier.
          </p>
        </div>

        <div className="space-y-10">
          {RESUME_TIERS.map((tier) => (
            <section
              key={tier.id}
              aria-labelledby={`resume-tier-${tier.id}-marker`}
              className="border-t border-mute-700/40 pt-6"
            >
              <h3
                id={`resume-tier-${tier.id}-marker`}
                className="mb-6 ml-9 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan/60"
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
