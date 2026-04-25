"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const LINES = [
  "[boot] mission systems online",
  "[auth] hello, traveler. you found the console.",
  "[stat] services up: 100/100",
  "[note] this site was hand-built. no CMS, no trackers.",
  "[thx] inspired by christianmacedo.com + apollo guidance computer",
  "[end] press esc to close.",
];

export default function KonamiEgg() {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const bufferRef = useRef<string[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const buf = bufferRef.current;
      buf.push(key);
      if (buf.length > SEQUENCE.length) buf.shift();
      if (
        buf.length === SEQUENCE.length &&
        buf.every((k, i) => k === SEQUENCE[i])
      ) {
        bufferRef.current = [];
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Click-outside dismissal.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const root = panelRef.current;
      if (root && !root.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Defer to next tick so the toggling keypress doesn't immediately close it.
    const id = window.setTimeout(() => {
      window.addEventListener("mousedown", onClick);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const slide = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { y: "100%", opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: "100%", opacity: 0 },
      };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="konami-console"
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Hidden console log"
          {...slide}
          transition={{ duration: reduced ? 0.15 : 0.32, ease: "easeOut" }}
          className="fixed inset-x-0 bottom-0 z-[55] border-t border-emerald-400/30 bg-void-900/95 font-mono text-emerald-400 backdrop-blur-md"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-3 text-[10px] text-emerald-400/60">
            <span>{"// hidden console · konami unlocked"}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close console"
              className="text-emerald-400/60 transition-colors hover:text-emerald-300 focus:outline-none focus-visible:text-emerald-300"
            >
              [esc]
            </button>
          </div>
          <pre className="mx-auto max-w-6xl overflow-x-auto px-6 pb-6 pt-2 text-xs leading-relaxed sm:text-sm">
            {LINES.join("\n")}
          </pre>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
