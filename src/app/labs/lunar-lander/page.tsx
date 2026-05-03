import type { Metadata } from "next";
import Link from "next/link";
import LunarLanderGame from "@/components/labs/lunar-lander-game";
import { defaultMetadata } from "@/lib/seo";

export const metadata: Metadata = defaultMetadata({
  path: "/labs/lunar-lander",
  title: "Lunar Lander Lab",
  description:
    "A lunar lander prototype with desktop mission control and a paired phone controller.",
});

export default function LunarLanderPage() {
  return (
    <main id="main-content" className="min-h-screen bg-void px-6 py-16 text-mute-100 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/labs"
          className="font-mono text-xs uppercase tracking-[0.24em] text-cyan hover:underline"
        >
          ← back to laboratory
        </Link>
        <div className="mb-8 mt-10 max-w-3xl">
          <p className="font-mono text-sm uppercase tracking-widest text-amber">
            {"// PROTOTYPE 001"}
          </p>
          <h1 className="mt-5 text-balance text-5xl font-semibold leading-tight md:text-7xl">
            Lunar Lander
          </h1>
          <p className="mt-5 text-pretty text-base leading-relaxed text-mute-300 md:text-lg">
            Land on a designated pad with a keyboard, then open the controller
            on a phone and fly from a second screen.
          </p>
        </div>
        <LunarLanderGame />
      </div>
    </main>
  );
}
