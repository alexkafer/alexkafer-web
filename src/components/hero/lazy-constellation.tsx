"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ConstellationBackground = dynamic(
  () =>
    import("./constellation-background").then(
      (m) => m.ConstellationBackground,
    ),
  { ssr: false, loading: () => null },
);

/**
 * Defers downloading + mounting the Three.js constellation bundle until
 * after the hero copy has painted and the browser is idle. Three.js +
 * react-three-fiber + drei are ~120 KiB of JS we don't want fighting
 * the LCP element for the network and main thread on first load.
 *
 * Wait conditions (all must hold):
 *   1. document.fonts.ready  — Inter + JetBrains Mono have rasterised, so
 *      the hero text isn't repainting underneath the canvas.
 *   2. requestIdleCallback (with a 1.5 s timeout fallback) — the browser
 *      is no longer busy executing the initial bundle.
 *
 * Once both fire, we render <ConstellationBackground />, which triggers
 * the dynamic import. The scene then plays its own camera-dolly intro
 * (see IntroDolly in hero-scene.tsx) so the appearance feels intentional
 * rather than a lazy-load pop-in.
 */
export default function LazyConstellation() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fontsReady: Promise<unknown> =
      typeof document !== "undefined" && document.fonts
        ? document.fonts.ready
        : Promise.resolve();

    fontsReady.then(() => {
      if (cancelled) return;
      const schedule =
        typeof window !== "undefined" && "requestIdleCallback" in window
          ? (cb: () => void) =>
              window.requestIdleCallback(cb, { timeout: 1500 })
          : (cb: () => void) => window.setTimeout(cb, 200);
      schedule(() => {
        if (!cancelled) setReady(true);
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return <ConstellationBackground />;
}
