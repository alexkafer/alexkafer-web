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
  // Render the SVG as a silhouette via CSS mask so it themes cleanly:
  // pure black on light backgrounds, pure white on dark. The original
  // SVG fills are ignored — only the shape carries through.
  const url = src ?? `/logos/${slug}.svg`;
  return (
    <span
      role="img"
      aria-label={`${name} logo`}
      className="relative inline-block h-8 w-16 shrink-0 bg-black opacity-90 transition-opacity hover:opacity-100 dark:bg-white"
      style={{
        WebkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "left center",
        maskPosition: "left center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
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
            {"// 01 · RÉSUMÉ"}
          </p>
          <h2 className="text-balance font-sans text-4xl font-semibold leading-tight text-mute-100 md:text-6xl">
            <span className="block">PM by title.</span>
            <span className="mt-2 block text-cyan">
              Systems engineer by instinct.
            </span>
          </h2>
          <div className="max-w-2xl space-y-4 text-pretty text-base leading-relaxed text-mute-300">
            <p>
              I&apos;ve been a builder since middle school &mdash; first a
              school newspaper site so I could tell stories with code, then
              apps for my teachers and e&#8209;cards for the family holiday
              card. High school is where I learned what it feels like to ship
              hardware on a deadline: I joined the robotics team, made drive
              team, and we won regionals. By senior year I&apos;d helped spin
              up 17 more robotics teams across elementary and middle schools
              in my district, because the community around the work mattered
              as much as the work.
            </p>
            <p>
              I studied CS in college with a focus on robotics and AI, but
              kept stacking product&#8209;design classes alongside the
              algorithms. My favorite thing I built was an interactive
              lightshow &mdash; guests scanned a QR code and steered the
              lights with the gyroscope in their phone. The kind of small
              interaction that delights the people who notice it.
            </p>
            <p>
              That&apos;s still the through&#8209;line. I love how one system
              feeds into another, and the small details most people won&apos;t
              catch are where being thoughtful and intentional actually
              matters.
            </p>
          </div>
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
