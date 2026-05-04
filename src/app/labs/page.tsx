import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/chrome/footer";
import { LABS } from "@/lib/labs/registry";
import { defaultMetadata } from "@/lib/seo";

export const metadata: Metadata = defaultMetadata({
  path: "/labs",
  title: "Living Laboratory",
  description:
    "Interactive prototypes, multi-device storytelling experiments, and field notes by Alex Kafer.",
});

export default function LabsPage() {
  return (
    <>
      <main id="main-content" className="min-h-screen bg-void text-mute-100">
        <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-24 md:px-10">
          <div className="max-w-3xl">
            <p className="font-mono text-sm uppercase tracking-widest text-amber">
              {"// LIVING LABORATORY"}
            </p>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-tight md:text-7xl">
              Playable experiments for screens that talk to each other.
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-mute-300 md:text-lg">
              The lab is a flexible home for prototypes whose interface can
              change from project to project: games, ambient stories, control
              surfaces, and multi-device scenes.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {LABS.map((lab) => (
              <Link
                key={lab.slug}
                href={lab.href}
                id={lab.slug === "story-relay" ? lab.slug : undefined}
                className="group rounded-2xl border border-mute-700/50 bg-void-800/50 p-5 transition hover:border-cyan/40 hover:bg-void-800"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/80">
                  {lab.eyebrow}
                </p>
                <h2 className="mt-4 text-2xl font-semibold text-mute-100">
                  {lab.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-mute-300">
                  {lab.summary}
                </p>
                <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.24em] text-amber">
                  {lab.status} · {lab.interaction} · {lab.theme.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
