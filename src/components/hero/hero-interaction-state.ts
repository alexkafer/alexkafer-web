// Shared mutable state between the Three.js hero scene and the DOM hover
// overlay that sits over it. Same pattern as scroll-state.ts: the canvas
// is `pointer-events-none` so hit-testing/UI happens in DOM, while the
// scene exposes the per-frame screen positions of interactive stars and
// reads the active hover back to drive its color/emissive transitions.

export type InteractiveStar = {
  starIdx: number;
  sectionIdx: number;
  slug: string;
  title: string;
  color: string; // hex, e.g. "#5b6b8a"
};

export type ScreenPos = { x: number; y: number; visible: boolean };

export type HoverState = { starIdx: number; startedAt: number } | null;

const state: {
  interactive: Map<number, InteractiveStar>;
  screen: Map<number, ScreenPos>;
  hover: HoverState;
} = {
  interactive: new Map(),
  screen: new Map(),
  hover: null,
};

export const heroInteraction = {
  setInteractiveStars(stars: InteractiveStar[]) {
    state.interactive.clear();
    for (const s of stars) state.interactive.set(s.starIdx, s);
  },
  getInteractiveStars(): ReadonlyMap<number, InteractiveStar> {
    return state.interactive;
  },
  setScreenPos(starIdx: number, x: number, y: number, visible: boolean) {
    const existing = state.screen.get(starIdx);
    if (existing) {
      existing.x = x;
      existing.y = y;
      existing.visible = visible;
    } else {
      state.screen.set(starIdx, { x, y, visible });
    }
  },
  getScreenPos(starIdx: number): ScreenPos | undefined {
    return state.screen.get(starIdx);
  },
  setHover(h: HoverState) {
    state.hover = h;
  },
  getHover(): HoverState {
    return state.hover;
  },
};

export const HOVER_HOLD_MS = 1000;
