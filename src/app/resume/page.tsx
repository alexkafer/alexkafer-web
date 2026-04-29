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
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-24 md:px-10 text-mute-100">
      <script {...jsonLdScriptProps("ld-person-resume", buildResumeJsonLd())} />

      <p className="font-mono text-sm uppercase tracking-widest text-amber">
        {"// RÉSUMÉ"}
      </p>
      <h1 className="mt-6 text-balance text-4xl font-semibold leading-tight md:text-5xl">
        {PROFILE.name}
      </h1>
      <p className="mt-2 font-mono text-sm text-cyan">
        {PROFILE.jobTitle} · {PROFILE.employer.team} · {PROFILE.employer.name}
      </p>
      <p className="mt-1 font-mono text-xs text-mute-300">
        {PROFILE.location.locality}, {PROFILE.location.region}
      </p>

      <p className="mt-8 text-pretty text-base leading-relaxed text-mute-300">
        Five years building secure, reliable platform services. The product
        decisions are downstream of the systems thinking.
      </p>

      <p className="mt-4 font-mono text-xs text-mute-300">
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

      <p className="mt-16 font-mono text-xs text-mute-300">
        <Link href="/" className="hover:text-cyan">
          ← back to home
        </Link>
      </p>
    </main>
  );
}
