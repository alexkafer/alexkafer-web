"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import PartySocket from "partysocket";
import {
  LUNAR_LANDER_PARTY,
  decodeLunarLanderPartyServerMessage,
  encodeLunarLanderPartyMessage,
  type LunarLanderPartyClientMessage,
  type LunarLanderPartyServerMessage,
} from "@/lib/labs/lunar-lander-party-protocol";

type PhonePilot = {
  id: string;
  token: string;
  label: string;
};

type PressedState = {
  thrust: boolean;
  left: boolean;
  right: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
};

const RELEASED: PressedState = {
  thrust: false,
  left: false,
  right: false,
  strafeLeft: false,
  strafeRight: false,
};
const CONTROL_HEARTBEAT_MS = 200;

function partySocketTarget(): { host: string; protocol: "ws" | "wss" } {
  const configured = process.env.NEXT_PUBLIC_LUNAR_LANDER_PARTYKIT_HOST;
  const url = configured
    ? new URL(configured.includes("://") ? configured : `${window.location.protocol}//${configured}`)
    : new URL(window.location.href);
  return {
    host: url.host,
    protocol: url.protocol === "https:" ? "wss" : "ws",
  };
}

function controlFromPressed(pressed: PressedState) {
  const lateral = pressed.strafeLeft ? -1 : pressed.strafeRight ? 1 : 0;
  return {
    thrust: pressed.thrust,
    rotate: pressed.left ? -1 : pressed.right ? 1 : 0,
    ...(lateral === 0 ? {} : { lateral }),
  };
}

function hasActivePressed(pressed: PressedState): boolean {
  return pressed.thrust || pressed.left || pressed.right || pressed.strafeLeft || pressed.strafeRight;
}

export default function LunarLanderController({
  room = LUNAR_LANDER_PARTY.defaultRoom,
}: {
  room?: string;
}) {
  const socketRef = useRef<PartySocket | null>(null);
  const pilotRef = useRef<PhonePilot | null>(null);
  const pressedRef = useRef<PressedState>(RELEASED);
  const [pilot, setPilot] = useState<PhonePilot | null>(null);
  const [pressed, setPressed] = useState<PressedState>(RELEASED);
  const [status, setStatus] = useState("Connecting phone stick...");

  useEffect(() => {
    pilotRef.current = pilot;
  }, [pilot]);

  const sendMessage = useCallback((message: LunarLanderPartyClientMessage) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setStatus("PartyKit socket is not open yet.");
      return;
    }
    socket.send(encodeLunarLanderPartyMessage(message));
  }, []);

  const spawnPhoneLander = useCallback(() => {
    setStatus("Launching phone lander...");
    sendMessage({ type: "spawn", pilot: "phone" });
  }, [sendMessage]);

  const sendControl = useCallback(
    (nextPressed: PressedState, reset = false) => {
      const activePilot = pilotRef.current;
      if (!activePilot) {
        setStatus("Still waiting for a phone lander...");
        return;
      }
      sendMessage({
        type: "input",
        landerId: activePilot.id,
        token: activePilot.token,
        ...controlFromPressed(nextPressed),
        ...(reset ? { reset: true } : {}),
      });
    },
    [sendMessage],
  );

  useEffect(() => {
    const target = partySocketTarget();
    const socket = new PartySocket({
      host: target.host,
      protocol: target.protocol,
      party: LUNAR_LANDER_PARTY.party,
      room,
      prefix: LUNAR_LANDER_PARTY.prefix,
      query: { role: "pilot" },
    });
    socketRef.current = socket;

    function onOpen() {
      setStatus(`Connected to room ${room}.`);
      socket.send(encodeLunarLanderPartyMessage({ type: "join", role: "pilot" }));
      socket.send(encodeLunarLanderPartyMessage({ type: "spawn", pilot: "phone" }));
    }

    function onMessage(event: MessageEvent<string>) {
      const message: LunarLanderPartyServerMessage | null = decodeLunarLanderPartyServerMessage(event.data);
      if (!message) return;
      if (message.type === "spawned") {
        const nextPilot = {
          id: message.lander.id,
          token: message.controlToken,
          label: message.lander.label,
        };
        pilotRef.current = nextPilot;
        setPilot(nextPilot);
        setStatus(`${nextPilot.label} online. Hold thrust, rotate, and strafe to fly.`);
      } else if (message.type === "error") {
        setStatus(message.message);
      } else if (message.type === "controlled") {
        setStatus(`${message.lander.label} linked. Keep the ship upright.`);
      }
    }

    function onClose() {
      setStatus("PartyKit room disconnected. Reconnecting...");
    }

    socket.addEventListener("open", onOpen);
    socket.addEventListener("message", onMessage);
    socket.addEventListener("close", onClose);
    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("close", onClose);
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [room]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (hasActivePressed(pressedRef.current)) sendControl(pressedRef.current);
    }, CONTROL_HEARTBEAT_MS);
    return () => window.clearInterval(interval);
  }, [sendControl]);

  function updatePressed(nextPressed: PressedState) {
    pressedRef.current = nextPressed;
    setPressed(nextPressed);
    sendControl(nextPressed);
  }

  function setButton(button: keyof PressedState, isPressed: boolean) {
    updatePressed({ ...pressedRef.current, [button]: isPressed });
  }

  function releaseAll() {
    pressedRef.current = RELEASED;
    setPressed(RELEASED);
    sendControl(RELEASED);
  }

  function resetLander() {
    pressedRef.current = RELEASED;
    setPressed(RELEASED);
    sendControl(RELEASED, true);
  }

  function onControlPointerDown(event: ReactPointerEvent<HTMLButtonElement>, button: keyof PressedState) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setButton(button, true);
  }

  function onControlPointerUp(event: ReactPointerEvent<HTMLButtonElement>, button: keyof PressedState) {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setButton(button, false);
  }

  const buttonBase =
    "flex select-none items-center justify-center rounded-2xl border border-cyan/30 bg-void-800/90 px-5 py-5 font-mono text-sm uppercase tracking-[0.22em] text-mute-100 shadow-lg shadow-cyan/10 transition [touch-action:none] [-webkit-tap-highlight-color:transparent] active:scale-[0.98] active:bg-cyan/20 sm:py-7";

  return (
    <main
      id="main-content"
      className="fixed inset-0 overflow-hidden overscroll-none bg-void px-4 py-4 text-mute-100 [touch-action:none] sm:px-5 sm:py-6"
      onContextMenu={(event) => event.preventDefault()}
      data-testid="lunar-lander-controller"
    >
      <div className="mx-auto flex h-full max-w-md flex-col gap-3 sm:gap-4">
        <header className="shrink-0 rounded-3xl border border-cyan/20 bg-void-800/80 p-4 sm:p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan">
            PartyKit lunar controller
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold sm:text-3xl">Phone flight stick</h1>
            <span className="rounded-full border border-cyan/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
              {room}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-mute-300 sm:mt-3">
            This phone joins the PartyKit room, launches its own lander, and streams
            low-latency thrust, rotation, and strafe inputs to the shared lunar world.
          </p>
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-mute-700/50 bg-void-900/80 px-4 py-3 font-mono uppercase tracking-[0.24em]">
            <span className="text-[10px] text-mute-400">ship</span>
            <span className="text-lg text-amber">{pilot?.label ?? "spawning"}</span>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 grid-cols-2 grid-rows-[0.85fr_0.85fr_1.2fr_auto_auto] gap-3">
          <button type="button" className={buttonBase} onPointerDown={(event) => onControlPointerDown(event, "left")} onPointerUp={(event) => onControlPointerUp(event, "left")} onPointerCancel={releaseAll} onLostPointerCapture={() => setButton("left", false)}>
            rotate left
          </button>
          <button type="button" className={buttonBase} onPointerDown={(event) => onControlPointerDown(event, "right")} onPointerUp={(event) => onControlPointerUp(event, "right")} onPointerCancel={releaseAll} onLostPointerCapture={() => setButton("right", false)}>
            rotate right
          </button>
          <button type="button" className={buttonBase} onPointerDown={(event) => onControlPointerDown(event, "strafeLeft")} onPointerUp={(event) => onControlPointerUp(event, "strafeLeft")} onPointerCancel={releaseAll} onLostPointerCapture={() => setButton("strafeLeft", false)}>
            strafe left
          </button>
          <button type="button" className={buttonBase} onPointerDown={(event) => onControlPointerDown(event, "strafeRight")} onPointerUp={(event) => onControlPointerUp(event, "strafeRight")} onPointerCancel={releaseAll} onLostPointerCapture={() => setButton("strafeRight", false)}>
            strafe right
          </button>
          <button type="button" className={`${buttonBase} col-span-2 border-amber/40 bg-amber/10 py-8 text-amber sm:py-10`} onPointerDown={(event) => onControlPointerDown(event, "thrust")} onPointerUp={(event) => onControlPointerUp(event, "thrust")} onPointerCancel={releaseAll} onLostPointerCapture={() => setButton("thrust", false)}>
            hold thrust
          </button>
          <button type="button" className={`${buttonBase} col-span-2 border-cyan/40 bg-cyan/10 py-5 text-cyan`} onClick={spawnPhoneLander}>
            launch new lander
          </button>
          <button type="button" className={`${buttonBase} col-span-2 border-red-300/40 bg-red-400/10 py-5 text-red-200`} onClick={resetLander}>
            reset lander
          </button>
        </section>

        <p className="shrink-0 rounded-2xl border border-mute-700/50 bg-void-800/60 p-3 font-mono text-xs leading-relaxed text-mute-300 sm:p-4">
          {status} {pressed.thrust ? "THRUST " : ""}
          {pressed.left ? "LEFT " : ""}
          {pressed.right ? "RIGHT " : ""}
          {pressed.strafeLeft ? "STRAFE-L " : ""}
          {pressed.strafeRight ? "STRAFE-R" : ""}
        </p>
      </div>
    </main>
  );
}
