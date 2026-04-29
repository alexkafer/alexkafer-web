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
        {"// ABOUT"}
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
          {"// FOCUS AREAS"}
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
          {"// LINKS"}
        </h2>
        <ul className="space-y-2">
          {PROFILE.links.map((l) => {
            const isMailto = l.rel === "email";
            return (
              <li key={l.url} className="font-mono text-sm">
                <a
                  href={l.url}
                  className="text-cyan hover:underline"
                  {...(isMailto
                    ? {}
                    : { rel: "noopener noreferrer", target: "_blank" })}
                >
                  {l.label} →
                </a>
              </li>
            );
          })}
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
