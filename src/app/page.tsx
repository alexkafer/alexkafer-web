import dynamic from "next/dynamic";
import { ABExperimentProvider } from "@/lib/ab-context";
import Hero from "@/components/hero";
import HudChrome from "@/components/hero/hud-chrome";
import Disguise from "@/components/sections/disguise";
import Demos from "@/components/sections/demos";
import ABTest from "@/components/sections/ab-test";
import Footer from "@/components/chrome/footer";

const ConstellationBackground = dynamic(
  () =>
    import("@/components/hero/constellation-background").then(
      (m) => m.ConstellationBackground,
    ),
  { ssr: false, loading: () => null },
);
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
      <ConstellationBackground />
      <HudChrome />
      <main id="main-content" className="relative z-10 text-mute-100">
        <Hero />
        <Disguise />
        <Demos />
        <ABTest />
        <Footer />
        <DevtoolsOverlay />
        <KonamiEgg />

        <div className="sr-only">
          <h2>About Alex Kafer</h2>
          <p>
            Senior Product Manager on the Xbox Platform team at Microsoft. Five
            years of platform-engineering experience building secure, reliable,
            efficient services at scale. Previously: Xbox Cloud Gaming, Xbox
            Remote Play, and a NASA-JSC NLP requirements-tooling project. B.S.
            Computer Science, University of Minnesota — robotics + AI
            specialization with a product design minor.
          </p>
        </div>
      </main>
    </ABExperimentProvider>
  );
}
