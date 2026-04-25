"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

type Metrics = {
  fps: number;
  scrollPct: number;
  vw: number;
  vh: number;
  dpr: number;
  ua: string;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function DevtoolsOverlay() {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = useState<Metrics>({
    fps: 0,
    scrollPct: 0,
    vw: 0,
    vh: 0,
    dpr: 1,
    ua: "",
  });

  // Toggle on `?` (Shift+/), ignore when typing in inputs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      if (e.key !== "?") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      e.preventDefault();
      setOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // rAF metrics loop — only runs when open.
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    let last = performance.now();
    const samples: number[] = [];
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (dt > 0) {
        const fps = 1000 / dt;
        samples.push(fps);
        if (samples.length > 30) samples.shift();
      }
      const avg =
        samples.reduce((a, b) => a + b, 0) / Math.max(1, samples.length);
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docH > 0 ? (window.scrollY / docH) * 100 : 0;
      setMetrics({
        fps: Math.round(avg),
        scrollPct: Math.max(0, Math.min(100, pct)),
        vw: window.innerWidth,
        vh: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
        ua: navigator.userAgent,
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Tab focus trap inside panel only when open.
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const root = panelRef.current;
    if (!root) return;
    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((n) => !n.hasAttribute("disabled"));
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey) {
      if (active === first || !root.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  const sha = process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev";
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME ?? "—";
  const truncatedUA =
    metrics.ua.length > 64 ? `${metrics.ua.slice(0, 61)}…` : metrics.ua || "—";

  const slide = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { x: "100%" },
        animate: { x: 0 },
        exit: { x: "100%" },
      };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="devtools-overlay"
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Developer overlay"
          onKeyDown={onKeyDown}
          {...slide}
          transition={{ duration: reduced ? 0.15 : 0.28, ease: "easeOut" }}
          className="fixed right-0 top-0 z-[60] flex h-full w-[360px] max-w-[90vw] flex-col border-l border-cyan/30 bg-void-800/95 font-mono text-xs text-mute-100 backdrop-blur-md"
        >
          <div className="flex items-center justify-between border-b border-mute-700/50 px-4 py-3 text-[11px] text-amber">
            <span>{"// DEV OVERLAY · press ? to close"}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close developer overlay"
              className="text-mute-300 transition-colors hover:text-cyan focus:outline-none focus-visible:text-cyan"
            >
              ×
            </button>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-4 py-4 text-[11px] leading-relaxed">
            <Row label="FPS" value={`${metrics.fps}`} />
            <Row label="Scroll" value={`${metrics.scrollPct.toFixed(1)}%`} />
            <Row label="Viewport" value={`${metrics.vw}×${metrics.vh}`} />
            <Row label="DPR" value={`${metrics.dpr}`} />
            <Row label="Build SHA" value={sha} />
            <Row label="Build Time" value={buildTime} />
            <Row label="User Agent" value={truncatedUA} />
          </dl>
          <div className="mt-auto border-t border-mute-700/50 px-4 py-3 text-[10px] text-mute-500">
            {"// rAF sampled · rolling avg(30) · esc to close"}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-cyan/80">{label}</dt>
      <dd className="break-all text-mute-100">{value}</dd>
    </>
  );
}
