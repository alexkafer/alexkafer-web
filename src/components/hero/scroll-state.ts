"use client";

// Mutable, RAF-friendly scroll state shared between the React tree and the
// Three.js scene. The constellation reads `current` every frame inside
// `useFrame` to avoid forcing React re-renders during scroll.

import { useEffect, useState } from "react";

export type ScrollState = {
  activeIndex: number;
  nextIndex: number;
  progress: number; // 0..1 within the active section
  blend: number;    // 0..1 — interpolation toward nextIndex's layout
};

const state: { current: ScrollState } = {
  current: { activeIndex: 0, nextIndex: 0, progress: 0, blend: 0 },
};

const listeners = new Set<(s: ScrollState) => void>();

export function getScrollState(): { current: ScrollState } {
  return state;
}

export function setScrollState(next: Partial<ScrollState>) {
  const merged = { ...state.current, ...next };
  const prev = state.current;
  if (
    merged.activeIndex === prev.activeIndex &&
    merged.nextIndex === prev.nextIndex &&
    Math.abs(merged.progress - prev.progress) < 0.001 &&
    Math.abs(merged.blend - prev.blend) < 0.001
  ) {
    return;
  }
  state.current = merged;
  listeners.forEach((l) => l(state.current));
}

export function subscribeScrollState(fn: (s: ScrollState) => void): () => void {
  listeners.add(fn);
  fn(state.current);
  return () => {
    listeners.delete(fn);
  };
}

// Re-renders only when the active section index changes — keeps cost low
// even though we update progress every scroll frame.
export function useActiveSectionIndex(): number {
  const [idx, setIdx] = useState(state.current.activeIndex);
  useEffect(() => {
    return subscribeScrollState((s) => {
      setIdx((prev) => (prev === s.activeIndex ? prev : s.activeIndex));
    });
  }, []);
  return idx;
}
