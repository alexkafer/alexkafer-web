"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizePairCode } from "@/lib/labs/pairing";
import type { LanderInput } from "@/lib/labs/lander";

type ControllerState = LanderInput;
type ControllerPayload = ControllerState & { reset?: boolean };
type PressedState = {
  thrust: boolean;
  left: boolean;
  right: boolean;
};

const NEUTRAL: ControllerState = { thrust: false, rotate: 0 };
const RELEASED: PressedState = { thrust: false, left: false, right: false };

function controlFromPressed(pressed: PressedState): ControllerState {
  return {
    thrust: pressed.thrust,
    rotate: pressed.left ? -1 : pressed.right ? 1 : 0,
  };
}

export default function LunarLanderController({
  initialPairCode,
}: {
  initialPairCode?: string;
}) {
  const [pairCodeText, setPairCodeText] = useState(initialPairCode ?? "");
  const [pressed, setPressed] = useState<PressedState>(RELEASED);
  const control = controlFromPressed(pressed);
  const controlRef = useRef(control);
  const [status, setStatus] = useState("Enter a pair code from mission control.");
  const normalizedPairCode = useMemo(
    () => normalizePairCode(pairCodeText),
    [pairCodeText],
  );

  useEffect(() => {
    controlRef.current = control;
  }, [control]);

  const sendControl = useCallback(
    async (nextControl: ControllerPayload) => {
      if (!normalizedPairCode) {
        setStatus("Pair code must be six mission-control characters.");
        return;
      }

      try {
        const response = await fetch(
          `/api/labs/lunar-lander/sessions/${normalizedPairCode}/control`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(nextControl),
          },
        );

        if (!response.ok) {
          setStatus("No active lander is listening for that code.");
          return;
        }

        setStatus("Linked. Keep the ship upright.");
      } catch {
        setStatus("Controller signal failed. Check the dev server URL.");
      }
    },
    [normalizedPairCode],
  );

  useEffect(() => {
    if (!normalizedPairCode) return;

    sendControl(controlRef.current);
    const interval = window.setInterval(() => {
      sendControl(controlRef.current);
    }, 90);
    return () => window.clearInterval(interval);
  }, [normalizedPairCode, sendControl]);

  function setButton(button: keyof PressedState, isPressed: boolean) {
    const nextPressed = { ...pressed, [button]: isPressed };
    const next = controlFromPressed(nextPressed);
    setPressed(nextPressed);
    sendControl(next);
  }

  function releaseAll() {
    setPressed(RELEASED);
    sendControl(NEUTRAL);
  }

  function resetLander() {
    setPressed(RELEASED);
    sendControl({ ...NEUTRAL, reset: true });
  }

  const buttonBase =
    "select-none rounded-2xl border border-cyan/30 bg-void-800/90 px-5 py-7 font-mono text-sm uppercase tracking-[0.22em] text-mute-100 shadow-lg shadow-cyan/10 transition active:scale-[0.98] active:bg-cyan/20";

  return (
    <main className="min-h-screen bg-void px-5 py-8 text-mute-100">
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <header className="rounded-3xl border border-cyan/20 bg-void-800/80 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan">
            lunar lander controller
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Phone flight stick</h1>
          <p className="mt-3 text-sm leading-relaxed text-mute-300">
            Pair this screen with the desktop lab, then hold thrust and tap
            rotate to guide the lander onto a marked pad.
          </p>
        </header>

        <label className="block rounded-2xl border border-mute-700/50 bg-void-800/60 p-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber">
            pair code
          </span>
          <input
            value={pairCodeText}
            onChange={(event) => setPairCodeText(event.target.value)}
            inputMode="text"
            autoCapitalize="characters"
            className="mt-3 w-full rounded-xl border border-mute-700/50 bg-void-900 px-4 py-3 text-center font-mono text-2xl uppercase tracking-[0.24em] outline-none focus:border-cyan"
            placeholder="2HYZQ9"
          />
        </label>

        <section className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className={buttonBase}
            onPointerDown={() => setButton("left", true)}
            onPointerUp={() => setButton("left", false)}
            onPointerCancel={releaseAll}
            onPointerLeave={() => setButton("left", false)}
          >
            rotate left
          </button>
          <button
            type="button"
            className={buttonBase}
            onPointerDown={() => setButton("right", true)}
            onPointerUp={() => setButton("right", false)}
            onPointerCancel={releaseAll}
            onPointerLeave={() => setButton("right", false)}
          >
            rotate right
          </button>
          <button
            type="button"
            className={`${buttonBase} col-span-2 border-amber/40 bg-amber/10 py-10 text-amber`}
            onPointerDown={() => setButton("thrust", true)}
            onPointerUp={() => setButton("thrust", false)}
            onPointerCancel={releaseAll}
            onPointerLeave={() => setButton("thrust", false)}
          >
            hold thrust
          </button>
          <button
            type="button"
            className={`${buttonBase} col-span-2 border-red-300/40 bg-red-400/10 py-5 text-red-200`}
            onClick={resetLander}
          >
            reset lander
          </button>
        </section>

        <p className="rounded-2xl border border-mute-700/50 bg-void-800/60 p-4 font-mono text-xs leading-relaxed text-mute-300">
          {status}
        </p>
      </div>
    </main>
  );
}
