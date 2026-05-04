import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/chrome/footer";
import { LABS } from "@/lib/labs/registry";
import { defaultMetadata } from "@/lib/seo";

export const metadata: Metadata = defaultMetadata({
  path: "/labs",
  title: "Living Laboratory",
  description:
    "Interactive prototypes, multi-device storytelling experiments, and playable labs by Alex Kafer.",
});

export default function LabsPage() {
  const lunarLander = LABS.find((lab) => lab.slug === "lunar-lander");

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

        <section className="mx-auto max-w-6xl px-6 pb-24 md:px-10">
          <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">
                prototype 001
              </p>
              <h2 className="mt-3 text-3xl font-semibold md:text-5xl">
                {lunarLander?.title ?? "Lunar Lander"}
              </h2>
            </div>
            <Link
              href="/labs/lunar-lander"
              className="font-mono text-xs uppercase tracking-[0.24em] text-cyan hover:underline"
            >
              open focused lab →
            </Link>
          </div>
          <div className="overflow-hidden rounded-3xl border border-cyan/30 bg-black shadow-2xl shadow-cyan/10">
            <div className="relative min-h-[420px] bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.24),transparent_42%),linear-gradient(180deg,#050510,#020207)] p-8">
              <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(135deg,transparent_0_18%,rgba(148,163,184,0.18)_18%_19%,transparent_19%_42%,rgba(148,163,184,0.15)_42%_43%,transparent_43%)]" />
              <div className="relative z-10 flex h-full min-h-[360px] flex-col justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan">
                    PartyKit realtime room
                  </p>
                  <h3 className="mt-4 max-w-2xl text-balance text-4xl font-semibold text-white md:text-6xl">
                    Shared lunar landings, phone flight sticks, one live moon.
                  </h3>
                  <p className="mt-5 max-w-xl text-sm leading-relaxed text-mute-300 md:text-base">
                    The focused lab now opens the PixiJS multiplayer build directly.
                    Launch a lander on desktop, scan the controller QR, and pilot
                    another craft from a phone in the same PartyKit world.
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.24em]">
                  <Link
                    href="/labs/lunar-lander"
                    className="border border-amber/60 bg-amber/10 px-4 py-3 text-amber transition hover:bg-amber hover:text-black"
                  >
                    Launch lander
                  </Link>
                  <Link
                    href="/labs/lunar-lander/controller"
                    className="border border-cyan/60 bg-cyan/10 px-4 py-3 text-cyan transition hover:bg-cyan hover:text-black"
                  >
                    Open phone controller
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
