"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
  OrbitArc,
  ORBIT_RADIUS_K,
  ORBIT_LINE_WIDTH_PX,
  ORBIT_PERIOD_MS,
  ORBIT_HEAD_RADIUS_K,
  ORBIT_GAP_RAD,
  ORBIT_TAIL_SEGMENTS,
  ORBIT_BASE_OPACITY,
} from "@/components/hero/orbit-arc";

// Isolated tuning page for the OrbitArc component used by the hero
// hover affordance. Same component as production, mounted alone in a
// dedicated Canvas at ~10× the size it ever renders in the hero so
// every pixel of the trail is visible. Toggle hover on/off to inspect
// the spin-up / fade-out transitions.
const PALETTE: { name: string; color: string }[] = [
  { name: "lab cyan", color: "#67e8f9" },
  { name: "section emerald", color: "#34d399" },
  { name: "section amber", color: "#f59e0b" },
  { name: "section violet", color: "#a78bfa" },
  { name: "section rose", color: "#fb7185" },
];

const NODE_SIZE = 1.5;

function StarStandIn({ color, size }: { color: THREE.Color; size: number }) {
  return (
    <mesh>
      <icosahedronGeometry args={[size, 4]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

export default function OrbitDevPage() {
  const [active, setActive] = useState(true);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [showStar, setShowStar] = useState(true);
  const [bg, setBg] = useState<"dark" | "light">("dark");

  const center = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const color = useMemo(() => new THREE.Color(PALETTE[paletteIdx].color), [paletteIdx]);

  const getState = useMemo(
    () => () => (active ? { center, color } : { center: null, color: null }),
    [active, center, color],
  );

  // Tap space to toggle hover so you can watch spin-up / fade transitions
  // without leaving the canvas.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setActive((a) => !a);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const bgClass = bg === "dark" ? "bg-[#0a0e1a] text-slate-200" : "bg-slate-50 text-slate-900";
  const panelClass =
    bg === "dark"
      ? "border-slate-700/60 bg-slate-900/70 backdrop-blur"
      : "border-slate-300/60 bg-white/80 backdrop-blur";

  return (
    <main className={`fixed inset-0 ${bgClass}`}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 35 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1} />
        {showStar && <StarStandIn color={color} size={NODE_SIZE} />}
        <OrbitArc getState={getState} nodeSize={NODE_SIZE} />
      </Canvas>

      <aside
        className={`pointer-events-auto absolute left-4 top-4 max-w-sm rounded-lg border p-4 font-mono text-xs leading-relaxed ${panelClass}`}
      >
        <h1 className="mb-2 font-sans text-sm font-semibold tracking-wide">
          OrbitArc — tuning view
        </h1>
        <p className="mb-3 opacity-70">
          Same component as the hero hover affordance, isolated and rendered at
          ~10× the size it ever appears in production. Press{" "}
          <kbd className="rounded border px-1">Space</kbd> to toggle hover.
        </p>

        <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 opacity-80">
          <dt>period</dt>
          <dd>{ORBIT_PERIOD_MS} ms / lap</dd>
          <dt>radius</dt>
          <dd>nodeSize × {ORBIT_RADIUS_K}</dd>
          <dt>line width</dt>
          <dd>{ORBIT_LINE_WIDTH_PX}px</dd>
          <dt>head radius</dt>
          <dd>nodeSize × {ORBIT_HEAD_RADIUS_K}</dd>
          <dt>front gap</dt>
          <dd>{Math.round((ORBIT_GAP_RAD * 180) / Math.PI)}°</dd>
          <dt>segments</dt>
          <dd>{ORBIT_TAIL_SEGMENTS}</dd>
          <dt>base opacity</dt>
          <dd>{ORBIT_BASE_OPACITY}</dd>
        </dl>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="rounded border border-current/30 px-2 py-1 text-left hover:bg-current/10"
            onClick={() => setActive((a) => !a)}
          >
            hover: {active ? "on" : "off"} (space)
          </button>
          <button
            type="button"
            className="rounded border border-current/30 px-2 py-1 text-left hover:bg-current/10"
            onClick={() => setShowStar((s) => !s)}
          >
            star at center: {showStar ? "on" : "off"}
          </button>
          <button
            type="button"
            className="rounded border border-current/30 px-2 py-1 text-left hover:bg-current/10"
            onClick={() => setBg((b) => (b === "dark" ? "light" : "dark"))}
          >
            background: {bg}
          </button>
          <label className="flex items-center gap-2">
            <span className="opacity-70">color</span>
            <select
              value={paletteIdx}
              onChange={(e) => setPaletteIdx(Number(e.target.value))}
              className="flex-1 rounded border border-current/30 bg-transparent px-2 py-1"
            >
              {PALETTE.map((p, i) => (
                <option key={p.name} value={i}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-3 text-[10px] opacity-60">
          Edit constants in <code>src/components/hero/orbit-arc.tsx</code> and
          they apply both here and in the hero on save.
        </p>
      </aside>
    </main>
  );
}
