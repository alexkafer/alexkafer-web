import HeroScene from "./hero-scene.client";
import { HudChrome } from "./hud-chrome";
import { HeroCopy } from "./hero-copy";
import { StatusPill } from "./status-pill";

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-void-900">
      <div className="absolute inset-0 z-0">
        <HeroScene />
      </div>

      {/* Vignette overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(5,5,16,0) 0%, rgba(5,5,16,0.35) 55%, rgba(5,5,16,0.95) 100%)",
        }}
      />

      <HudChrome />
      <HeroCopy />
      <StatusPill />
    </section>
  );
}
