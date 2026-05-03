"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { getKeyboardControlAction } from "@/lib/labs/controls";
import {
  LUNAR_LANDER_PADS,
  createInitialLanderState,
  stepLander,
  type LanderInput,
  type LanderState,
} from "@/lib/labs/lander";
import { createNetworkControllerUrl } from "@/lib/labs/pairing";

type SessionResponse = {
  pairCode: string;
  hostId: string;
};

type HostSnapshotResponse = {
  pairCode: string;
  control:
    | (LanderInput & {
        reset: boolean;
        resetSequence: number;
        sequence: number;
        updatedAt: number;
      })
    | null;
};

const WORLD = {
  minX: -170,
  maxX: 170,
  height: 260,
};

const POLL_MS = 120;
const REMOTE_STALE_MS = 550;
const NETWORK_ORIGIN = process.env.NEXT_PUBLIC_LABS_NETWORK_ORIGIN;
const USE_PORTLESS_LAN =
  process.env.NEXT_PUBLIC_LABS_PORTLESS_LAN !== "0";

function screenY(worldY: number): number {
  return WORLD.height - worldY;
}

function formatNumber(value: number, digits = 1): string {
  return value.toFixed(digits);
}

function statusCopy(state: LanderState): string {
  if (state.status === "landed") return "Touchdown confirmed. Nice landing.";
  if (state.status === "crashed") return "Signal lost. Reset and try again.";
  if (state.fuel <= 0) return "Fuel depleted. Commit to the glide path.";
  return "Find a marked pad. Keep velocity low and stay upright.";
}

export default function LunarLanderGame() {
  const [lander, setLander] = useState<LanderState>(() =>
    createInitialLanderState(),
  );
  const landerRef = useRef(lander);
  const [keyboardInput, setKeyboardInput] = useState<LanderInput>({
    thrust: false,
    rotate: 0,
  });
  const keyboardRef = useRef(keyboardInput);
  const remoteInputRef = useRef<LanderInput>({ thrust: false, rotate: 0 });
  const remoteUpdatedAtRef = useRef(0);
  const remoteResetSequenceRef = useRef(0);
  const [remoteSequence, setRemoteSequence] = useState(0);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);

  const reset = useCallback(() => {
    const next = createInitialLanderState();
    landerRef.current = next;
    setLander(next);
    keyboardRef.current = { thrust: false, rotate: 0 };
    setKeyboardInput({ thrust: false, rotate: 0 });
    remoteInputRef.current = { thrust: false, rotate: 0 };
    remoteUpdatedAtRef.current = 0;
    setRemoteSequence(0);
  }, []);

  useEffect(() => {
    landerRef.current = lander;
  }, [lander]);

  useEffect(() => {
    keyboardRef.current = keyboardInput;
  }, [keyboardInput]);

  useEffect(() => {
    let cancelled = false;

    async function createSession() {
      try {
        const response = await fetch("/api/labs/lunar-lander/sessions", {
          method: "POST",
        });
        if (!response.ok) {
          throw new Error(`Pairing failed with ${response.status}`);
        }
        const nextSession = (await response.json()) as SessionResponse;
        if (!cancelled) setSession(nextSession);
      } catch (error) {
        if (!cancelled) {
          setSessionError(
            error instanceof Error
              ? error.message
              : "Unable to create a pairing session.",
          );
        }
      }
    }

    createSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const activeSession = session;
    if (!activeSession) return;
    const { pairCode, hostId } = activeSession;

    let cancelled = false;
    async function poll() {
      try {
        const response = await fetch(
          `/api/labs/lunar-lander/sessions/${pairCode}?hostId=${encodeURIComponent(
            hostId,
          )}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const snapshot = (await response.json()) as HostSnapshotResponse;
        if (cancelled || !snapshot.control) return;

        const isFresh = Date.now() - snapshot.control.updatedAt < REMOTE_STALE_MS;
        if (
          isFresh &&
          snapshot.control.resetSequence > remoteResetSequenceRef.current
        ) {
          remoteResetSequenceRef.current = snapshot.control.resetSequence;
          reset();
        }

        remoteInputRef.current = isFresh
          ? {
              thrust: snapshot.control.thrust,
              rotate: snapshot.control.rotate,
            }
          : { thrust: false, rotate: 0 };
        remoteUpdatedAtRef.current = isFresh ? Date.now() : 0;
        setRemoteSequence(snapshot.control.sequence);
      } catch {
        // Polling is best-effort for the prototype; the keyboard remains active.
      }
    }

    poll();
    const interval = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [reset, session]);

  useEffect(() => {
    function updateKey(code: string, pressed: boolean) {
      const action = getKeyboardControlAction(code);
      if (!action || action.kind === "reset") return;

      setKeyboardInput((current) => {
        if (action.kind === "thrust") {
          return { ...current, thrust: pressed };
        }
        if (action.kind === "rotate") {
          return { ...current, rotate: pressed ? action.direction : 0 };
        }
        return current;
      });
    }

    function onKeyDown(event: KeyboardEvent) {
      const action = getKeyboardControlAction(event.code);
      if (!action) return;

      event.preventDefault();
      if (action.kind === "reset") {
        if (!event.repeat) reset();
        return;
      }
      updateKey(event.code, true);
    }

    function onKeyUp(event: KeyboardEvent) {
      updateKey(event.code, false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [reset]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    function tick(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      const keyboard = keyboardRef.current;
      const remote =
        Date.now() - remoteUpdatedAtRef.current < REMOTE_STALE_MS
          ? remoteInputRef.current
          : { thrust: false, rotate: 0 };
      const input: LanderInput = {
        thrust: keyboard.thrust || remote.thrust,
        rotate: keyboard.rotate || remote.rotate,
      };

      const next = stepLander(landerRef.current, input, dt);
      landerRef.current = next;
      setLander(next);
      frame = window.requestAnimationFrame(tick);
    }

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const controllerUrl = useMemo(() => {
    if (!session || typeof window === "undefined") return null;
    return createNetworkControllerUrl(
      {
        currentOrigin: window.location.origin,
        networkOrigin: NETWORK_ORIGIN,
        preferPortlessLan: USE_PORTLESS_LAN,
      },
      session.pairCode,
    );
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    if (!controllerUrl) {
      setQrSvg(null);
      return;
    }

    QRCode.toString(controllerUrl, {
      type: "svg",
      margin: 1,
      width: 192,
      color: {
        dark: "#050510",
        light: "#f8fafc",
      },
    })
      .then((svg) => {
        if (!cancelled) setQrSvg(svg);
      })
      .catch(() => {
        if (!cancelled) setQrSvg(null);
      });

    return () => {
      cancelled = true;
    };
  }, [controllerUrl]);

  const activeInput = {
    thrust: keyboardInput.thrust || remoteInputRef.current.thrust,
    rotate: keyboardInput.rotate || remoteInputRef.current.rotate,
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="overflow-hidden rounded-2xl border border-cyan/20 bg-void-800/70 shadow-2xl shadow-cyan/10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mute-700/40 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.26em] text-mute-300">
          <span>mission viewport</span>
          <span className="text-cyan">
            {activeInput.thrust ? "main engine" : "ballistic"} ·{" "}
            {remoteSequence > 0 ? "phone linked" : "keyboard ready"}
          </span>
        </div>

        <svg
          viewBox={`${WORLD.minX} -20 ${WORLD.maxX - WORLD.minX} ${
            WORLD.height + 40
          }`}
          role="img"
          aria-label="Lunar lander game viewport"
          className="h-[28rem] w-full bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.22),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(5,5,16,1))]"
        >
          <defs>
            <linearGradient id="lunarGround" x1="0" x2="1">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="48%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>

          <g opacity="0.55">
            {Array.from({ length: 36 }).map((_, index) => {
              const x = WORLD.minX + ((index * 47) % 335);
              const y = 4 + ((index * 29) % 120);
              return (
                <circle
                  key={`${x}-${y}`}
                  cx={x}
                  cy={y}
                  r={index % 5 === 0 ? 0.9 : 0.45}
                  fill="#e0f2fe"
                />
              );
            })}
          </g>

          <path
            d={`M ${WORLD.minX} ${WORLD.height} C -125 245, -94 255, -62 247 S 20 257, 60 246 S 128 251, ${WORLD.maxX} 240 L ${WORLD.maxX} 290 L ${WORLD.minX} 290 Z`}
            fill="url(#lunarGround)"
            opacity="0.5"
          />
          <line
            x1={WORLD.minX}
            x2={WORLD.maxX}
            y1={WORLD.height}
            y2={WORLD.height}
            stroke="#94a3b8"
            strokeWidth="1"
            opacity="0.4"
          />

          {LUNAR_LANDER_PADS.map((pad) => (
            <g key={pad.label}>
              <rect
                x={pad.x}
                y={WORLD.height - 2}
                width={pad.width}
                height="4"
                rx="1"
                fill="#fbbf24"
              />
              <text
                x={pad.x + pad.width / 2}
                y={WORLD.height + 14}
                textAnchor="middle"
                className="fill-amber font-mono text-[7px] uppercase tracking-widest"
              >
                {pad.label}
              </text>
            </g>
          ))}

          <g
            transform={`translate(${lander.position.x} ${screenY(
              lander.position.y,
            )}) rotate(${lander.angle})`}
          >
            {activeInput.thrust && lander.status === "flying" && (
              <path
                d="M -5 12 L 0 28 L 5 12 Z"
                fill="#f97316"
                opacity="0.9"
              />
            )}
            <path
              d="M 0 -15 L 12 10 L 5 15 L -5 15 L -12 10 Z"
              fill={lander.status === "crashed" ? "#f87171" : "#e0f2fe"}
              stroke="#7dd3fc"
              strokeWidth="1.4"
            />
            <line x1="-11" x2="-18" y1="11" y2="19" stroke="#94a3b8" />
            <line x1="11" x2="18" y1="11" y2="19" stroke="#94a3b8" />
          </g>
        </svg>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="rounded-2xl border border-mute-700/50 bg-void-800/70 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber">
            flight rules
          </p>
          <p className="mt-3 text-sm leading-relaxed text-mute-300">
            {statusCopy(lander)}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 font-mono text-xs">
            <div>
              <dt className="text-mute-500">fuel</dt>
              <dd className="text-mute-100">{formatNumber(lander.fuel, 0)}%</dd>
            </div>
            <div>
              <dt className="text-mute-500">angle</dt>
              <dd className="text-mute-100">{formatNumber(lander.angle)}°</dd>
            </div>
            <div>
              <dt className="text-mute-500">vertical</dt>
              <dd className="text-mute-100">
                {formatNumber(lander.velocity.y)} m/s
              </dd>
            </div>
            <div>
              <dt className="text-mute-500">lateral</dt>
              <dd className="text-mute-100">
                {formatNumber(lander.velocity.x)} m/s
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={reset}
            className="mt-5 w-full rounded-lg border border-cyan/40 px-4 py-2 font-mono text-xs uppercase tracking-[0.24em] text-cyan transition hover:bg-cyan/10"
          >
            reset simulation
          </button>
        </div>

        <div className="rounded-2xl border border-cyan/20 bg-cyan/5 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan">
            phone pairing
          </p>
          {session ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-mute-300">
                Scan this from a phone on the same Wi-Fi network. It targets
                Portless LAN mode, so the phone can reach this same dev server.
              </p>
              {controllerUrl && (
                <>
                  <div className="mt-4 rounded-2xl border border-cyan/30 bg-slate-50 p-3">
                    {qrSvg ? (
                      <div
                        aria-label="QR code for phone controller"
                        className="[&_svg]:h-auto [&_svg]:w-full"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                      />
                    ) : (
                      <div className="grid aspect-square place-items-center font-mono text-xs uppercase tracking-[0.2em] text-void-900">
                        generating QR
                      </div>
                    )}
                  </div>
                  <p className="mt-4 rounded-lg border border-cyan/30 bg-void-900/70 px-4 py-3 text-center font-mono text-3xl tracking-[0.28em] text-mute-100">
                    {session.pairCode}
                  </p>
                  <a
                    href={controllerUrl}
                    className="mt-4 block break-all rounded-lg border border-mute-700/50 px-3 py-2 font-mono text-xs text-cyan hover:bg-cyan/10"
                  >
                    {controllerUrl}
                  </a>
                </>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-mute-300">
              {sessionError ?? "Creating a pairing channel..."}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-amber/30 bg-amber/10 p-5 text-xs leading-relaxed text-mute-300">
          Prototype note: this pairing relay uses in-memory state for local
          exploration. A deployed multi-device version should move session state
          to a shared relay such as a Durable Object.
        </div>

        <div className="rounded-2xl border border-mute-700/50 bg-void-800/50 p-5 font-mono text-xs text-mute-300">
          Keyboard fallback: ArrowLeft / ArrowRight rotate, ArrowUp fires the
          main engine, Space resets the simulation.
        </div>
      </aside>
    </div>
  );
}
