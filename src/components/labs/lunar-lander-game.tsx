"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Link from "next/link";
import PartySocket from "partysocket";
import QRCode from "qrcode";
import {
  LUNAR_LANDER_PADS,
  terrainSurfaceY,
  type LanderInput,
  type LanderVector,
} from "@/lib/labs/lander";
import {
  LUNAR_LANDER_PARTY,
  decodeLunarLanderPartyServerMessage,
  encodeLunarLanderPartyMessage,
  type LunarLanderPartyClientMessage,
  type LunarLanderPartyServerMessage,
} from "@/lib/labs/lunar-lander-party-protocol";
import type {
  LunarLanderWorldLander,
  LunarLanderWorldSnapshot,
} from "@/lib/labs/lunar-lander-world";
import { STARTER_BASE_KIT_LANDER_BLUEPRINT } from "@/lib/labs/lunar-lander-domain";

type PixiApplication = import("pixi.js").Application;
type PixiGraphics = import("pixi.js").Graphics;

type LocalPilot = {
  id: string;
  token: string;
};

type PressedState = {
  thrust: boolean;
  left: boolean;
  right: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
};

type PartySocketTarget = {
  host: string;
  protocol: "ws" | "wss";
};

const VIEWPORT = { width: 1440, height: 900 };
const CONTROL_HEARTBEAT_MS = 200;
const PLATFORM_BUILD_MS = 5000;
const RELEASED: PressedState = {
  thrust: false,
  left: false,
  right: false,
  strafeLeft: false,
  strafeRight: false,
};
const STAR_FIELD = Array.from({ length: 48 }, (_, index) => ({
  x: -860 + ((index * 197) % 2500),
  y: 250 + ((index * 83) % 610),
  size: index % 10 === 0 ? 2.4 : index % 4 === 0 ? 1.6 : 1.1,
}));

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function controlFromPressed(pressed: PressedState): LanderInput {
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

function partySocketTarget(): PartySocketTarget {
  const configured = process.env.NEXT_PUBLIC_LUNAR_LANDER_PARTYKIT_HOST;
  const url = configured
    ? new URL(configured.includes("://") ? configured : `${window.location.protocol}//${configured}`)
    : new URL(window.location.href);
  return {
    host: url.host,
    protocol: url.protocol === "https:" ? "wss" : "ws",
  };
}

function controllerUrl(room: string): string {
  const url = new URL("/labs/lunar-lander/controller", window.location.href);
  url.searchParams.set("room", room);
  return url.toString();
}

function formatMetric(value: number): string {
  return Math.max(0, Math.round(value)).toString().padStart(4, "0");
}

function formatSpeed(value: number): string {
  return Math.abs(Math.round(value)).toString();
}

function localToScreen(
  point: LanderVector,
  cameraX: number,
  width: number,
  height: number,
): LanderVector {
  const scale = Math.min(width / VIEWPORT.width, height / VIEWPORT.height);
  return {
    x: (point.x - cameraX) * scale,
    y: (VIEWPORT.height - point.y) * scale,
  };
}

function drawPolyline(
  graphics: PixiGraphics,
  points: readonly LanderVector[],
  cameraX: number,
  width: number,
  height: number,
  color: number,
  strokeWidth = 1.2,
): void {
  if (points.length === 0) return;
  const first = localToScreen(points[0], cameraX, width, height);
  graphics.moveTo(first.x, first.y);
  for (const point of points.slice(1)) {
    const screen = localToScreen(point, cameraX, width, height);
    graphics.lineTo(screen.x, screen.y);
  }
  graphics.stroke({ width: strokeWidth, color });
}

function localPoint(
  origin: LanderVector,
  point: LanderVector,
  cos: number,
  sin: number,
  scale: number,
): LanderVector {
  return {
    x: origin.x + (point.x * cos - point.y * sin) * scale,
    y: origin.y + (point.x * sin + point.y * cos) * scale,
  };
}

function drawLocalPath(
  graphics: PixiGraphics,
  origin: LanderVector,
  points: readonly LanderVector[],
  cos: number,
  sin: number,
  scale: number,
  color: number,
  strokeWidth = 1.2,
): void {
  points.forEach((point, index) => {
    const screen = localPoint(origin, point, cos, sin, scale);
    if (index === 0) graphics.moveTo(screen.x, screen.y);
    else graphics.lineTo(screen.x, screen.y);
  });
  graphics.stroke({ width: strokeWidth, color });
}

function drawWorldLine(
  graphics: PixiGraphics,
  start: LanderVector,
  end: LanderVector,
  cameraX: number,
  width: number,
  height: number,
  color: number,
  strokeWidth = 1.1,
  alpha = 1,
): void {
  const screenStart = localToScreen(start, cameraX, width, height);
  const screenEnd = localToScreen(end, cameraX, width, height);
  graphics.moveTo(screenStart.x, screenStart.y).lineTo(screenEnd.x, screenEnd.y);
  graphics.stroke({ width: strokeWidth, color, alpha });
}

function drawShip(
  graphics: PixiGraphics,
  lander: LunarLanderWorldLander,
  serverTime: number,
  cameraX: number,
  width: number,
  height: number,
  color: number,
): void {
  if (lander.state.status === "crashed") return;
  const origin = localToScreen(lander.state.position, cameraX, width, height);
  const scale = Math.min(width / VIEWPORT.width, height / VIEWPORT.height);
  const radians = (lander.state.angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const hullPoints: readonly LanderVector[] =
    lander.state.status === "landed"
      ? [
          { x: -8, y: -2 },
          { x: -8, y: 8 },
          { x: -3, y: 12 },
          { x: 3, y: 12 },
          { x: 8, y: 8 },
          { x: 8, y: -2 },
        ]
      : [
          { x: 0, y: -14 },
          { x: 9, y: 7 },
          { x: 4, y: 15 },
          { x: -4, y: 15 },
          { x: -9, y: 7 },
          { x: 0, y: -14 },
        ];

  drawLocalPath(graphics, origin, hullPoints, cos, sin, scale, color, 1.3);
  drawLocalPath(
    graphics,
    origin,
    [
      { x: -7, y: 7 },
      { x: -14, y: 14 },
      { x: -9, y: 14 },
    ],
    cos,
    sin,
    scale,
    color,
    1.2,
  );
  drawLocalPath(
    graphics,
    origin,
    [
      { x: 7, y: 7 },
      { x: 14, y: 14 },
      { x: 9, y: 14 },
    ],
    cos,
    sin,
    scale,
    color,
    1.2,
  );
  drawLocalPath(graphics, origin, [{ x: -5, y: -3 }, { x: 5, y: -3 }], cos, sin, scale, color, 1);

  if (lander.state.status === "landed") {
    const landedAge = Math.max(0, serverTime - (lander.resolvedAt ?? lander.updatedAt));
    const hatch =
      landedAge < 420
        ? [
            { x: -8, y: -2 },
            { x: 0, y: -14 },
            { x: 8, y: -2 },
          ]
        : landedAge < 880
          ? [
              { x: -9, y: -2 },
              { x: -2, y: -10 },
              { x: 9, y: -2 },
              { x: 2, y: -10 },
            ]
          : [
              { x: -14, y: -12 },
              { x: 14, y: -12 },
            ];
    if (landedAge < 420) {
      drawLocalPath(graphics, origin, hatch, cos, sin, scale, color, 1.1);
    } else if (landedAge < 880) {
      drawLocalPath(graphics, origin, hatch.slice(0, 2), cos, sin, scale, color, 1.1);
      drawLocalPath(graphics, origin, hatch.slice(2), cos, sin, scale, color, 1.1);
    } else {
      drawLocalPath(graphics, origin, hatch, cos, sin, scale, color, 1.1);
    }
  }

  if (lander.input.thrust && lander.state.status === "flying") {
    drawLocalPath(
      graphics,
      origin,
      [
        { x: -4, y: 16 },
        { x: 0, y: 34 },
        { x: 4, y: 16 },
      ],
      cos,
      sin,
      scale,
      0xfbbf24,
      1.1,
    );
  }

  const lateral = lander.state.status === "flying" ? (lander.input.lateral ?? 0) : 0;
  if (lateral < 0) {
    drawLocalPath(
      graphics,
      origin,
      [
        { x: 8, y: -4 },
        { x: 24, y: -8 },
        { x: 8, y: -10 },
      ],
      cos,
      sin,
      scale,
      0x67e8f9,
      1,
    );
  } else if (lateral > 0) {
    drawLocalPath(
      graphics,
      origin,
      [
        { x: -8, y: -4 },
        { x: -24, y: -8 },
        { x: -8, y: -10 },
      ],
      cos,
      sin,
      scale,
      0x67e8f9,
      1,
    );
  }
}

function drawCrashExplosion(
  graphics: PixiGraphics,
  crash: { x: number; y: number; createdAt: number },
  serverTime: number,
  cameraX: number,
  width: number,
  height: number,
): void {
  const ageMs = Math.max(0, serverTime - crash.createdAt);
  const growth = clamp(ageMs / 900, 0, 1);
  const fade = clamp(1 - Math.max(0, ageMs - 1600) / 900, 0, 1);
  if (fade <= 0) return;

  const center = localToScreen({ x: crash.x, y: crash.y + 8 }, cameraX, width, height);
  const scale = Math.min(width / VIEWPORT.width, height / VIEWPORT.height);
  const long = (12 + growth * 22) * scale;
  const short = (7 + growth * 14) * scale;
  const color = ageMs < 160 ? 0xfbbf24 : 0xffffff;

  graphics.moveTo(center.x - long, center.y).lineTo(center.x + long, center.y);
  graphics.moveTo(center.x, center.y - long).lineTo(center.x, center.y + long);
  graphics.moveTo(center.x - short, center.y - short).lineTo(center.x + short, center.y + short);
  graphics.moveTo(center.x - short, center.y + short).lineTo(center.x + short, center.y - short);
  graphics.stroke({ width: 1.2, color, alpha: fade });
}

function drawAstronaut(
  graphics: PixiGraphics,
  outpost: { x: number; deckY: number; width: number; createdAt: number },
  serverTime: number,
  cameraX: number,
  width: number,
  height: number,
): void {
  const ageMs = Math.max(0, serverTime - outpost.createdAt);
  const jumpProgress = clamp(ageMs / 980, 0, 1);
  const buildPulse = ageMs > 1100 && ageMs < PLATFORM_BUILD_MS && ageMs % 420 < 210;
  const world = {
    x: outpost.x + 4 + jumpProgress * (outpost.width / 2 + 7),
    y: outpost.deckY + Math.sin(jumpProgress * Math.PI) * 14,
  };
  const origin = localToScreen(world, cameraX, width, height);
  const scale = Math.min(width / VIEWPORT.width, height / VIEWPORT.height);

  const drawLocal = (points: readonly LanderVector[]) => {
    points.forEach((point, index) => {
      const screen = { x: origin.x + point.x * scale, y: origin.y + point.y * scale };
      if (index === 0) graphics.moveTo(screen.x, screen.y);
      else graphics.lineTo(screen.x, screen.y);
    });
    graphics.stroke({ width: 1.05, color: 0xffffff });
  };

  drawLocal([
    { x: 0, y: -16 },
    { x: 4, y: -12 },
    { x: 0, y: -8 },
    { x: -4, y: -12 },
    { x: 0, y: -16 },
  ]);
  drawLocal([{ x: 0, y: -8 }, { x: 0, y: -2 }]);
  drawLocal([{ x: -5, y: -6 }, { x: 5, y: -4 }]);
  drawLocal([{ x: 0, y: -2 }, { x: -4, y: 2 }]);
  drawLocal([{ x: 0, y: -2 }, { x: 4, y: 2 }]);
  if (buildPulse) drawLocal([{ x: 5, y: -5 }, { x: 11, y: -9 }]);
}

function drawLandingOutpost(
  graphics: PixiGraphics,
  outpost: {
    x: number;
    surfaceY: number;
    leftSupportY: number;
    rightSupportY: number;
    deckY: number;
    width: number;
    createdAt: number;
  },
  serverTime: number,
  cameraX: number,
  width: number,
  height: number,
): void {
  const ageMs = Math.max(0, serverTime - outpost.createdAt);
  const buildAge = Math.max(0, ageMs - 780);
  const halfWidth = outpost.width / 2;
  const leftX = outpost.x - halfWidth;
  const rightX = outpost.x + halfWidth;

  drawWorldLine(graphics, { x: leftX, y: outpost.deckY }, { x: rightX, y: outpost.deckY }, cameraX, width, height, 0xffffff);
  if (buildAge > 0) {
    drawWorldLine(graphics, { x: outpost.x, y: outpost.deckY }, { x: outpost.x, y: outpost.surfaceY }, cameraX, width, height, 0xffffff);
  }
  if (buildAge > 420) {
    drawWorldLine(graphics, { x: leftX, y: outpost.deckY }, { x: leftX, y: outpost.leftSupportY }, cameraX, width, height, 0xffffff);
    drawWorldLine(graphics, { x: rightX, y: outpost.deckY }, { x: rightX, y: outpost.rightSupportY }, cameraX, width, height, 0xffffff);
  }
  if (buildAge > 860) {
    drawWorldLine(graphics, { x: leftX, y: outpost.deckY }, { x: rightX, y: outpost.rightSupportY }, cameraX, width, height, 0xffffff);
    drawWorldLine(graphics, { x: rightX, y: outpost.deckY }, { x: leftX, y: outpost.leftSupportY }, cameraX, width, height, 0xffffff);
  }
  if (ageMs < PLATFORM_BUILD_MS) {
    drawAstronaut(graphics, outpost, serverTime, cameraX, width, height);
  }
}

function renderWorld(
  graphics: PixiGraphics,
  snapshot: LunarLanderWorldSnapshot | null,
  localPilotId: string | null,
  width: number,
  height: number,
): void {
  graphics.clear();
  const terrain = snapshot?.terrain ?? [];
  const focused =
    (localPilotId ? snapshot?.landers.find((lander) => lander.id === localPilotId) : null) ??
    snapshot?.landers[0] ??
    null;
  const minTerrainX = terrain[0]?.x ?? -900;
  const maxTerrainX = terrain[terrain.length - 1]?.x ?? 1674;
  const cameraX = clamp(
    (focused?.state.position.x ?? minTerrainX + VIEWPORT.width / 2) - VIEWPORT.width * 0.42,
    minTerrainX,
    Math.max(minTerrainX, maxTerrainX - VIEWPORT.width),
  );

  for (const star of STAR_FIELD) {
    const screen = localToScreen(star, cameraX, width, height);
    graphics.rect(screen.x, screen.y, star.size, star.size).fill({ color: 0xffffff });
  }

  drawPolyline(graphics, terrain, cameraX, width, height, 0xffffff, 1.4);

  for (const pad of LUNAR_LANDER_PADS) {
    const y = terrainSurfaceY(pad.x + pad.width / 2, terrain);
    drawPolyline(
      graphics,
      [
        { x: pad.x, y },
        { x: pad.x + pad.width, y },
      ],
      cameraX,
      width,
      height,
      0xffffff,
      2,
    );
  }

  for (const outpost of snapshot?.outposts ?? []) {
    drawLandingOutpost(graphics, outpost, snapshot?.serverTime ?? Date.now(), cameraX, width, height);
  }

  for (const base of snapshot?.bases ?? []) {
    const topLeft = localToScreen(
      { x: base.footprint.x, y: base.footprint.y + base.footprint.height },
      cameraX,
      width,
      height,
    );
    const bottomRight = localToScreen(
      { x: base.footprint.x + base.footprint.width, y: base.footprint.y },
      cameraX,
      width,
      height,
    );
    graphics
      .rect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
      .stroke({ width: 1, color: base.integrity < base.maxIntegrity * 0.5 ? 0xfca5a5 : 0x67e8f9 });
  }

  for (const crash of snapshot?.crashes ?? []) {
    drawCrashExplosion(graphics, crash, snapshot?.serverTime ?? Date.now(), cameraX, width, height);
  }

  for (const lander of snapshot?.landers ?? []) {
    const color = lander.id === localPilotId ? 0xfbbf24 : lander.pilot === "phone" ? 0x67e8f9 : 0xffffff;
    drawShip(graphics, lander, snapshot?.serverTime ?? Date.now(), cameraX, width, height, color);
  }
}

export default function LunarLanderGame({
  room = LUNAR_LANDER_PARTY.defaultRoom,
}: {
  room?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PixiApplication | null>(null);
  const graphicsRef = useRef<PixiGraphics | null>(null);
  const socketRef = useRef<PartySocket | null>(null);
  const pressedRef = useRef<PressedState>(RELEASED);
  const localPilotRef = useRef<LocalPilot | null>(null);
  const [snapshot, setSnapshot] = useState<LunarLanderWorldSnapshot | null>(null);
  const [localPilot, setLocalPilot] = useState<LocalPilot | null>(null);
  const [status, setStatus] = useState("Connecting to PartyKit room...");
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    localPilotRef.current = localPilot;
  }, [localPilot]);

  const sendMessage = useCallback((message: LunarLanderPartyClientMessage) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setStatus("PartyKit socket is not open yet.");
      return;
    }
    socket.send(encodeLunarLanderPartyMessage(message));
  }, []);

  const sendCurrentInput = useCallback(() => {
    const pilot = localPilotRef.current;
    if (!pilot) return;
    sendMessage({
      type: "input",
      landerId: pilot.id,
      token: pilot.token,
      ...controlFromPressed(pressedRef.current),
    });
  }, [sendMessage]);

  const spawnDesktopLander = useCallback(
    (blueprintId?: string) => {
      sendMessage({
        type: "spawn",
        pilot: "desktop",
        ...(blueprintId ? { blueprintId } : {}),
      });
    },
    [sendMessage],
  );

  const resetLocalLander = useCallback(() => {
    const pilot = localPilotRef.current;
    if (!pilot) return;
    pressedRef.current = RELEASED;
    sendMessage({
      type: "input",
      landerId: pilot.id,
      token: pilot.token,
      thrust: false,
      rotate: 0,
      reset: true,
    });
  }, [sendMessage]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (hasActivePressed(pressedRef.current)) sendCurrentInput();
    }, CONTROL_HEARTBEAT_MS);
    return () => window.clearInterval(interval);
  }, [sendCurrentInput]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    async function initPixi() {
      const { Application, Graphics } = await import("pixi.js");
      if (cancelled || !container) return;
      const app = new Application();
      await app.init({
        resizeTo: container,
        backgroundColor: 0x000000,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio,
      });
      if (cancelled) {
        app.destroy(true);
        return;
      }
      const graphics = new Graphics();
      app.stage.addChild(graphics);
      appRef.current = app;
      graphicsRef.current = graphics;
      container.appendChild(app.canvas);
    }

    void initPixi();
    return () => {
      cancelled = true;
      appRef.current?.destroy(true);
      appRef.current = null;
      graphicsRef.current = null;
    };
  }, []);

  useEffect(() => {
    function draw() {
      const app = appRef.current;
      const graphics = graphicsRef.current;
      if (!app || !graphics) return;
      renderWorld(
        graphics,
        snapshot,
        localPilot?.id ?? null,
        app.renderer.width,
        app.renderer.height,
      );
    }

    draw();
    const frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [localPilot?.id, snapshot]);

  useEffect(() => {
    const target = partySocketTarget();
    const socket = new PartySocket({
      host: target.host,
      protocol: target.protocol,
      party: LUNAR_LANDER_PARTY.party,
      room,
      prefix: LUNAR_LANDER_PARTY.prefix,
      query: { role: "spectator" },
    });
    socketRef.current = socket;

    function onOpen() {
      setStatus(`Connected to PartyKit room ${room}.`);
      socket.send(encodeLunarLanderPartyMessage({ type: "join", role: "spectator" }));
    }

    function onMessage(event: MessageEvent<string>) {
      const message: LunarLanderPartyServerMessage | null = decodeLunarLanderPartyServerMessage(
        event.data,
      );
      if (!message) return;
      if (message.type === "snapshot") {
        setSnapshot(message.snapshot);
      } else if (message.type === "spawned") {
        const pilot = { id: message.lander.id, token: message.controlToken };
        localPilotRef.current = pilot;
        setLocalPilot(pilot);
        setStatus(`Launched ${message.lander.label}. Fly W/A/D + Q/E.`);
      } else if (message.type === "error") {
        setStatus(message.message);
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
    let cancelled = false;
    QRCode.toString(controllerUrl(room), {
      type: "svg",
      margin: 1,
      width: 180,
      color: { dark: "#ffffff", light: "#000000" },
    })
      .then((svg) => {
        if (!cancelled) setQrSvg(svg);
      })
      .catch((error: unknown) => {
        console.error("Unable to generate Pixi controller QR", error);
        if (!cancelled) setQrSvg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [room]);

  function updatePressed(nextPressed: PressedState) {
    pressedRef.current = nextPressed;
    sendCurrentInput();
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.repeat) return;
    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      spawnDesktopLander();
      return;
    }
    if (event.code === "KeyR") {
      event.preventDefault();
      resetLocalLander();
      return;
    }
    if (event.code === "KeyW" || event.code === "KeyA" || event.code === "KeyD" || event.code === "KeyQ" || event.code === "KeyE") {
      event.preventDefault();
      updatePressed({
        ...pressedRef.current,
        thrust: event.code === "KeyW" ? true : pressedRef.current.thrust,
        left: event.code === "KeyA" ? true : pressedRef.current.left,
        right: event.code === "KeyD" ? true : pressedRef.current.right,
        strafeLeft: event.code === "KeyQ" ? true : pressedRef.current.strafeLeft,
        strafeRight: event.code === "KeyE" ? true : pressedRef.current.strafeRight,
      });
    }
  }

  function onKeyUp(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.code === "KeyW" || event.code === "KeyA" || event.code === "KeyD" || event.code === "KeyQ" || event.code === "KeyE") {
      event.preventDefault();
      updatePressed({
        ...pressedRef.current,
        thrust: event.code === "KeyW" ? false : pressedRef.current.thrust,
        left: event.code === "KeyA" ? false : pressedRef.current.left,
        right: event.code === "KeyD" ? false : pressedRef.current.right,
        strafeLeft: event.code === "KeyQ" ? false : pressedRef.current.strafeLeft,
        strafeRight: event.code === "KeyE" ? false : pressedRef.current.strafeRight,
      });
    }
  }

  const focused = useMemo(() => {
    if (!snapshot) return null;
    return (
      (localPilot ? snapshot.landers.find((lander) => lander.id === localPilot.id) : null) ??
      snapshot.landers[0] ??
      null
    );
  }, [localPilot, snapshot]);
  const altitude = focused
    ? Math.max(0, focused.state.position.y - terrainSurfaceY(focused.state.position.x, snapshot?.terrain ?? []))
    : 0;

  return (
    <main
      id="main-content"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      className="relative min-h-screen overflow-hidden bg-black font-mono text-white outline-none"
      data-testid="lunar-lander-game"
    >
      <div ref={containerRef} className="absolute inset-0" aria-label="Lunar lander playfield" />

      <div className="pointer-events-none absolute left-6 top-6 z-10 grid grid-cols-[auto_auto] gap-x-5 text-sm uppercase tracking-[0.24em] md:text-lg">
        <span>Room</span>
        <span>{room}</span>
        <span>World</span>
        <span>{formatMetric(snapshot?.landers.length ?? 0)}</span>
        <span>Ship</span>
        <span>{focused?.label ?? "NONE"}</span>
        <span>Fuel</span>
        <span>{formatMetric(focused?.state.fuel ?? 0)}</span>
      </div>

      <div className="pointer-events-none absolute right-6 top-6 z-10 grid grid-cols-[auto_auto] gap-x-5 text-sm uppercase tracking-[0.24em] md:text-lg">
        <span>Altitude</span>
        <span className="text-right">{formatMetric(altitude)}</span>
        <span>Horizontal</span>
        <span className="text-right">{formatSpeed(focused?.state.velocity.x ?? 0)}</span>
        <span>Vertical</span>
        <span className="text-right">{formatSpeed(focused?.state.velocity.y ?? 0)}</span>
        <span>Angle</span>
        <span className="text-right">{formatSpeed(focused?.state.angle ?? 0)}</span>
      </div>

      <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.22em] md:text-xs">
        <button
          type="button"
          onClick={() => spawnDesktopLander()}
          className="border border-amber/60 bg-black/80 px-3 py-2 text-amber hover:bg-amber hover:text-black"
        >
          Launch lander
        </button>
        <button
          type="button"
          onClick={() => spawnDesktopLander(STARTER_BASE_KIT_LANDER_BLUEPRINT.id)}
          className="border border-cyan/60 bg-black/80 px-3 py-2 text-cyan hover:bg-cyan hover:text-black"
        >
          Launch base kit
        </button>
        <button
          type="button"
          onClick={resetLocalLander}
          className="border border-white/50 bg-black/80 px-3 py-2 text-white/80 hover:bg-white hover:text-black"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setShowQr((current) => !current)}
          className="border border-white/50 bg-black/80 px-3 py-2 text-white/80 hover:bg-white hover:text-black"
        >
          Phone QR
        </button>
      </div>

      <p className="absolute bottom-3 right-3 z-20 max-w-xl bg-black/80 p-2 text-right text-[10px] uppercase tracking-[0.2em] text-white/70 md:text-xs">
        {status} Space launches. W/A/D + Q/E fly. R resets.
      </p>

      {showQr && (
        <aside className="absolute bottom-16 left-3 z-30 w-80 border border-white bg-black p-4 text-xs uppercase tracking-[0.22em] text-white">
          <p>PartyKit phone controller</p>
          <p className="mt-2 leading-relaxed text-white/70">Scan to join room {room} as a phone pilot.</p>
          <div className="mx-auto mt-3 w-44 border border-white bg-black p-2">
            {qrSvg ? (
              <div
                aria-label="QR code for phone controller"
                className="[&_svg]:h-auto [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="grid aspect-square place-items-center">Generating QR</div>
            )}
          </div>
          <Link
            href={`/labs/lunar-lander/controller?room=${encodeURIComponent(room)}`}
            className="mt-3 block border border-white/50 p-2 hover:bg-white hover:text-black"
          >
            open controller
          </Link>
        </aside>
      )}
    </main>
  );
}
