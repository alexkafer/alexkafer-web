import dynamic from "next/dynamic";
import { ABExperimentProvider } from "@/lib/ab-context";
import Hero from "@/components/hero";
import HudChrome from "@/components/hero/hud-chrome";
import LazyConstellation from "@/components/hero/lazy-constellation";
import Resume from "@/components/sections/resume";
import Demos from "@/components/sections/demos";
import ABTest from "@/components/sections/ab-test";
import Footer from "@/components/chrome/footer";

const DevtoolsOverlay = dynamic(
  () => import("@/components/chrome/devtools-overlay"),
  { ssr: false },
);
const KonamiEgg = dynamic(() => import("@/components/chrome/konami-egg"), {
  ssr: false,
});

export default function Page() {
  return (
    <ABExperimentProvider>
      <LazyConstellation />
      <HudChrome />
      <main id="main-content" className="relative z-10 text-mute-100">
        <Hero />
        <Resume />
        <Demos />
        <ABTest />
        <Footer />
        <DevtoolsOverlay />
        <KonamiEgg />

        <div className="sr-only">
          <h2>About Alex Kafer</h2>
          <p>
            Senior Product Manager on the Xbox Platform team at Microsoft.{" "}
            <a href="/about">Read the full bio</a> or view the{" "}
            <a href="/resume">résumé</a>.
          </p>
        </div>
      </main>
    </ABExperimentProvider>
  );
}
