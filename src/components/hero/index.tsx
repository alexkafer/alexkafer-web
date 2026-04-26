import { HeroCopy } from "./hero-copy";

// Hero is now an overlay — the constellation lives at the page level (see
// ConstellationBackground) and persists across scroll.
export default function Hero() {
  return (
    <section
      id="hero"
      className="relative h-screen w-full overflow-hidden"
    >
      <HeroCopy />
    </section>
  );
}
