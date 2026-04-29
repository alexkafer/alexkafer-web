import { HeroCopy } from "./hero-copy";
import { HeroHoverOverlay } from "./hero-hover-overlay";
import { HeroExperimentJump } from "./hero-experiment-jump";

// Hero is now an overlay — the constellation lives at the page level (see
// ConstellationBackground) and persists across scroll.
//
// DOM/tab-order rationale: the children below are arranged so a keyboard
// user tabbing forward from the HUD walks:
//   Learn With Me → Variant CTA → 4 constellation stars → see-experiment
//   pill → next section.
// HeroHoverOverlay must come AFTER HeroCopy (whose CTAs should focus first)
// and BEFORE HeroExperimentJump (which lives below the stars in tab order).
export default function Hero() {
  return (
    <section
      id="hero"
      className="relative h-screen w-full overflow-hidden"
    >
      <HeroCopy />
      <HeroHoverOverlay />
      <HeroExperimentJump />
    </section>
  );
}
