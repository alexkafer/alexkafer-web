"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { hasActiveLanderInput } from "@/lib/labs/controls";
import type { LanderInput } from "@/lib/labs/lander";

type ControllerState = LanderInput;
type ControllerPayload = ControllerState & { reset?: boolean };
type PressedState = {
  thrust: boolean;
  left: boolean;
  right: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
};
type PhonePilot = {
  id: string;
  token: string;
  label: string;
};
type SpawnResponse = {
  lander: {
    id: string;
    label: string;
  };
  controlToken: string;
};

const NEUTRAL: ControllerState = { thrust: false, rotate: 0 };
const CONTROL_HEARTBEAT_MS = 400;
const RELEASED: PressedState = {
  thrust: false,
  left: false,
  right: false,
  strafeLeft: false,
  strafeRight: false,
};
const PHONE_LANDER_ID_KEY = "lunar-lander:mmo:phone-lander-id";
const PHONE_LANDER_TOKEN_KEY = "lunar-lander:mmo:phone-control-token";
const PHONE_LANDER_LABEL_KEY = "lunar-lander:mmo:phone-label";

function controlFromPressed(pressed: PressedState): ControllerState {
  const lateral = pressed.strafeLeft ? -1 : pressed.strafeRight ? 1 : 0;

  return {
    thrust: pressed.thrust,
    rotate: pressed.left ? -1 : pressed.right ? 1 : 0,
    ...(lateral === 0 ? {} : { lateral }),
  };
}

function readStoredPilot(): PhonePilot | null {
  const id = window.sessionStorage.getItem(PHONE_LANDER_ID_KEY);
  const token = window.sessionStorage.getItem(PHONE_LANDER_TOKEN_KEY);
  const label = window.sessionStorage.getItem(PHONE_LANDER_LABEL_KEY);
  return id && token && label ? { id, token, label } : null;
}

function writeStoredPilot(pilot: PhonePilot): void {
  window.sessionStorage.setItem(PHONE_LANDER_ID_KEY, pilot.id);
  window.sessionStorage.setItem(PHONE_LANDER_TOKEN_KEY, pilot.token);
  window.sessionStorage.setItem(PHONE_LANDER_LABEL_KEY, pilot.label);
}

function clearStoredPilot(): void {
  window.sessionStorage.removeItem(PHONE_LANDER_ID_KEY);
  window.sessionStorage.removeItem(PHONE_LANDER_TOKEN_KEY);
  window.sessionStorage.removeItem(PHONE_LANDER_LABEL_KEY);
}

export default function LunarLanderController() {
  const [pilot, setPilot] = useState<PhonePilot | null>(null);
  const pilotRef = useRef<PhonePilot | null>(null);
  const [pressed, setPressed] = useState<PressedState>(RELEASED);
  const control = controlFromPressed(pressed);
  const controllerRef = useRef<HTMLElement | null>(null);
  const pressedRef = useRef<PressedState>(RELEASED);
  const controlRef = useRef(control);
  const spawnRequestRef = useRef(false);
  const [status, setStatus] = useState("Spawning a phone lander...");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    controlRef.current = control;
  }, [control]);

  useEffect(() => {
    pilotRef.current = pilot;
  }, [pilot]);

  const spawnPhoneLander = useCallback(async () => {
    if (spawnRequestRef.current) return;

    spawnRequestRef.current = true;
    try {
      const response = await fetch("/api/labs/lunar-lander/landers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pilot: "phone" }),
      });
      if (!response.ok) {
        throw new Error(`Spawn failed with ${response.status}`);
      }

      const spawned = (await response.json()) as SpawnResponse;
      const nextPilot = {
        id: spawned.lander.id,
        token: spawned.controlToken,
        label: spawned.lander.label,
      };
      writeStoredPilot(nextPilot);
      pilotRef.current = nextPilot;
      setPilot(nextPilot);
      setStatus(`${nextPilot.label} online. Hold thrust, rotate, and strafe to fly.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to spawn a phone lander.");
    } finally {
      spawnRequestRef.current = false;
    }
  }, []);

  useEffect(() => {
    const storedPilot = readStoredPilot();
    if (storedPilot) {
      pilotRef.current = storedPilot;
      setPilot(storedPilot);
      setStatus(`${storedPilot.label} reconnected. Keep the ship upright.`);
      return;
    }

    void spawnPhoneLander();
  }, [spawnPhoneLander]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverscrollBehavior = html.style.overscrollBehavior;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousBodyPosition = body.style.position;
    const previousBodyInset = body.style.inset;
    const previousBodyWidth = body.style.width;

    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.position = "fixed";
    body.style.inset = "0";
    body.style.width = "100%";

    return () => {
      html.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      body.style.position = previousBodyPosition;
      body.style.inset = previousBodyInset;
      body.style.width = previousBodyWidth;
    };
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const sendControl = useCallback(async (nextControl: ControllerPayload) => {
    const activePilot = pilotRef.current;
    if (!activePilot) {
      setStatus("Still spawning your lander...");
      return;
    }

    try {
      const response = await fetch(
        `/api/labs/lunar-lander/landers/${encodeURIComponent(activePilot.id)}/control`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...nextControl, token: activePilot.token }),
        },
      );

      if (response.status === 404) {
        if (pilotRef.current?.id === activePilot.id) {
          clearStoredPilot();
          pilotRef.current = null;
          setPilot(null);
          setStatus("That lander expired. Spawning another...");
          void spawnPhoneLander();
        }
        return;
      }

      if (!response.ok) {
        setStatus(`Controller signal failed with ${response.status}.`);
        return;
      }

      setStatus(`${activePilot.label} linked. Keep the ship upright and strafe gently.`);
    } catch {
      setStatus("Controller signal failed. Check the dev server URL.");
    }
  }, [spawnPhoneLander]);

  const updatePressed = useCallback(
    (nextPressed: PressedState) => {
      pressedRef.current = nextPressed;
      const nextControl = controlFromPressed(nextPressed);
      controlRef.current = nextControl;
      setPressed(nextPressed);
      sendControl(nextControl);
    },
    [sendControl],
  );

  useEffect(() => {
    if (!pilot) return;

    const sendActiveControl = () => {
      const currentControl = controlRef.current;
      if (hasActiveLanderInput(currentControl)) {
        sendControl(currentControl);
      }
    };

    sendActiveControl();
    const interval = window.setInterval(sendActiveControl, CONTROL_HEARTBEAT_MS);
    return () => window.clearInterval(interval);
  }, [pilot, sendControl]);

  function setButton(button: keyof PressedState, isPressed: boolean) {
    updatePressed({ ...pressedRef.current, [button]: isPressed });
  }

  function releaseAll() {
    pressedRef.current = RELEASED;
    controlRef.current = NEUTRAL;
    setPressed(RELEASED);
    sendControl(NEUTRAL);
  }

  function resetLander() {
    pressedRef.current = RELEASED;
    controlRef.current = NEUTRAL;
    setPressed(RELEASED);
    sendControl({ ...NEUTRAL, reset: true });
  }

  async function requestFullscreen() {
    const target = controllerRef.current;
    if (!target?.requestFullscreen) {
      setStatus("Fullscreen is not available here. Add this page to your home screen for the cleanest mode.");
      return;
    }

    try {
      await target.requestFullscreen({ navigationUI: "hide" });
      setStatus("Fullscreen locked. Keep this phone awake while flying.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Fullscreen blocked: ${error.message}`
          : "Fullscreen blocked by this browser.",
      );
    }
  }

  function onControlPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    button: keyof PressedState,
  ) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setButton(button, true);
  }

  function onControlPointerUp(
    event: ReactPointerEvent<HTMLButtonElement>,
    button: keyof PressedState,
  ) {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setButton(button, false);
  }

  const buttonBase =
    "flex select-none items-center justify-center rounded-2xl border border-cyan/30 bg-void-800/90 px-5 py-5 font-mono text-sm uppercase tracking-[0.22em] text-mute-100 shadow-lg shadow-cyan/10 transition [touch-action:none] [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] [-webkit-user-select:none] active:scale-[0.98] active:bg-cyan/20 sm:py-7";

  return (
    <main
      ref={controllerRef}
      id="main-content"
      className="fixed inset-0 overflow-hidden overscroll-none bg-void px-4 py-4 text-mute-100 [touch-action:none] [-webkit-touch-callout:none] [-webkit-user-select:none] sm:px-5 sm:py-6"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <div className="mx-auto flex h-full max-w-md flex-col gap-3 sm:gap-4">
        <header className="shrink-0 rounded-3xl border border-cyan/20 bg-void-800/80 p-4 sm:p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan">
            lunar lander MMO controller
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold sm:text-3xl">Phone flight stick</h1>
            <button
              type="button"
              className="shrink-0 rounded-full border border-cyan/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan transition [touch-action:manipulation] hover:bg-cyan/10"
              onClick={requestFullscreen}
            >
              {isFullscreen ? "locked" : "fullscreen"}
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-mute-300 sm:mt-3">
            This phone launches its own lander into the shared lunar surface, then
            streams thrust, rotation, and side-thruster pulses while the desktop page watches everyone fly.
          </p>
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-mute-700/50 bg-void-900/80 px-4 py-3 font-mono uppercase tracking-[0.24em]">
            <span className="text-[10px] text-mute-400">ship</span>
            <span className="text-lg text-amber">{pilot?.label ?? "spawning"}</span>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 grid-cols-2 grid-rows-[0.85fr_0.85fr_1.2fr_auto_auto] gap-3">
          <button
            type="button"
            className={buttonBase}
            onPointerDown={(event) => onControlPointerDown(event, "left")}
            onPointerUp={(event) => onControlPointerUp(event, "left")}
            onPointerCancel={releaseAll}
            onLostPointerCapture={() => setButton("left", false)}
          >
            rotate left
          </button>
          <button
            type="button"
            className={buttonBase}
            onPointerDown={(event) => onControlPointerDown(event, "right")}
            onPointerUp={(event) => onControlPointerUp(event, "right")}
            onPointerCancel={releaseAll}
            onLostPointerCapture={() => setButton("right", false)}
          >
            rotate right
          </button>
          <button
            type="button"
            className={buttonBase}
            onPointerDown={(event) => onControlPointerDown(event, "strafeLeft")}
            onPointerUp={(event) => onControlPointerUp(event, "strafeLeft")}
            onPointerCancel={releaseAll}
            onLostPointerCapture={() => setButton("strafeLeft", false)}
          >
            strafe left
          </button>
          <button
            type="button"
            className={buttonBase}
            onPointerDown={(event) => onControlPointerDown(event, "strafeRight")}
            onPointerUp={(event) => onControlPointerUp(event, "strafeRight")}
            onPointerCancel={releaseAll}
            onLostPointerCapture={() => setButton("strafeRight", false)}
          >
            strafe right
          </button>
          <button
            type="button"
            className={`${buttonBase} col-span-2 border-amber/40 bg-amber/10 py-8 text-amber sm:py-10`}
            onPointerDown={(event) => onControlPointerDown(event, "thrust")}
            onPointerUp={(event) => onControlPointerUp(event, "thrust")}
            onPointerCancel={releaseAll}
            onLostPointerCapture={() => setButton("thrust", false)}
          >
            hold thrust
          </button>
          <button
            type="button"
            className={`${buttonBase} col-span-2 border-cyan/40 bg-cyan/10 py-5 text-cyan`}
            onClick={() => {
              clearStoredPilot();
              pilotRef.current = null;
              setPilot(null);
              void spawnPhoneLander();
            }}
          >
            spawn new lander
          </button>
          <button
            type="button"
            className={`${buttonBase} col-span-2 border-red-300/40 bg-red-400/10 py-5 text-red-200`}
            onClick={resetLander}
          >
            reset lander
          </button>
        </section>

        <p className="shrink-0 rounded-2xl border border-mute-700/50 bg-void-800/60 p-3 font-mono text-xs leading-relaxed text-mute-300 sm:p-4">
          {status}
        </p>
      </div>
    </main>
  );
}
