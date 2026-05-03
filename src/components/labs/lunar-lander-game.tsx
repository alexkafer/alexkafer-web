"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  LUNAR_LANDER_PADS,
  LUNAR_TERRAIN_POINTS,
  findLandingPad,
  terrainSurfaceY,
  type LandingPad,
  type LanderInput,
  type LanderState,
  type LanderVector,
} from "@/lib/labs/lander";
import {
  combineLanderInputs,
  getLunarLanderGamepadControl,
  hasActiveLanderInput,
} from "@/lib/labs/controls";
import { createNetworkControllerLaunchUrl } from "@/lib/labs/lunar-lander-controller-url";
import { STARTER_BASE_KIT_LANDER_BLUEPRINT } from "@/lib/labs/lunar-lander-domain";

type WorldLander = {
  id: string;
  label: string;
  blueprintName?: string;
  flightStats?: {
    fuelCapacity: number;
    safeVerticalSpeed: number;
    safeHorizontalSpeed: number;
    safeAbsAngle: number;
    lateralThrustAcceleration: number;
    hasFlightComputer: boolean;
    hasSafetySystem: boolean;
  };
  state: LanderState;
  input: LanderInput;
  pilot: "desktop" | "phone";
  elapsed: number;
  createdAt: number;
  updatedAt: number;
  inputUpdatedAt: number;
  resolvedAt: number | null;
};

type WorldCrashEvent = {
  id: string;
  x: number;
  y: number;
  createdAt: number;
};

type WorldOutpost = {
  id: string;
  x: number;
  surfaceY: number;
  leftSupportY: number;
  rightSupportY: number;
  deckY: number;
  width: number;
  claimedPad?: LandingPad | null;
  createdAt: number;
  terrainAppliedAt: number | null;
};

type WorldResourceMap = Partial<Record<string, number>>;

type WorldBaseArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type WorldBaseRoom = {
  instanceId: string;
  roomId: string;
  position: { x: number; y: number };
  integrity: number;
  maxIntegrity: number;
  assignedCrew: number;
};

type WorldBaseBuildQueueItem = {
  id: string;
  roomId: string;
  position: { x: number; y: number };
  cost: WorldResourceMap;
  queuedAt: number;
  startedAt: number | null;
  completesAt: number;
};

type WorldBaseProductionJob = {
  id: string;
  roomInstanceId: string;
  roomId: string;
  consumesPerTick: WorldResourceMap;
  productionPerTick: WorldResourceMap;
  lastProducedAt: number;
  producedTicks: number;
};

type WorldBaseDamageEvent = {
  id: string;
  createdAt: number;
  amount: number;
  integrityBefore: number;
  integrityAfter: number;
  impactSpeed: number;
  impactMass: number;
  roomInstanceId: string | null;
};

type WorldBaseAutomationState = {
  automationId: string;
  enabled: boolean;
  updatedAt: number;
  lastRanAt: number | null;
  lastWarningAt: number | null;
};

type WorldBaseAutomationLogEntry = {
  id: string;
  createdAt: number;
  automationId: string;
  message: string;
};

type WorldBase = {
  id: string;
  name: string;
  commanderId?: string;
  bodyId: string;
  position: { x: number; y: number };
  integrity: number;
  maxIntegrity: number;
  footprint: WorldBaseArea;
  landingPads: WorldBaseArea[];
  rooms: WorldBaseRoom[];
  storage: WorldResourceMap;
  buildQueue: WorldBaseBuildQueueItem[];
  productionJobs: WorldBaseProductionJob[];
  automation?: Record<string, WorldBaseAutomationState>;
  automationLog?: WorldBaseAutomationLogEntry[];
  damageEvents: WorldBaseDamageEvent[];
  economyUpdatedAt: number;
};

type WorldCommander = {
  id: string;
  label: string;
  resources: WorldResourceMap;
  unlockedTech: string[];
};

type WorldStation = {
  id: string;
  name: string;
  bodyId: string;
  dockingPads: number;
  rooms: string[];
  storage: WorldResourceMap;
};

type WorldFlight = {
  id: string;
  routeKind: string;
  originBodyId: string;
  destinationBodyId: string;
  originStationId?: string;
  destinationStationId?: string;
  cargo: WorldResourceMap;
  departedAt: number;
  arrivesAt: number;
  status: string;
};

type WorldSnapshotResponse = {
  serverTime: number;
  economyUpdatedAt?: number;
  activeBodyId?: string;
  terrain: LanderVector[];
  crashes: WorldCrashEvent[];
  outposts: WorldOutpost[];
  landingPads?: LandingPad[];
  bases?: WorldBase[];
  stations?: WorldStation[];
  flights?: WorldFlight[];
  commanders?: WorldCommander[];
  landers: WorldLander[];
};

type SpawnResponse = {
  lander: WorldLander;
  controlToken: string;
};

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

type CameraPanState = {
  left: boolean;
  right: boolean;
  gamepad: number;
};

const VIEWPORT = {
  width: 1440,
  height: 900,
};
const WORLD_POLL_MS = 1_000;
const HIDDEN_WORLD_POLL_MS = 5_000;
const CONTROL_HEARTBEAT_MS = 400;
const CAMERA_SPEED = 430;
const NETWORK_ORIGIN = process.env.NEXT_PUBLIC_LABS_NETWORK_ORIGIN;
const USE_PORTLESS_LAN = process.env.NEXT_PUBLIC_LABS_PORTLESS_LAN !== "0";
const TERRAIN_MIN_X = LUNAR_TERRAIN_POINTS[0].x;
const TERRAIN_MAX_X = LUNAR_TERRAIN_POINTS[LUNAR_TERRAIN_POINTS.length - 1].x;
const TERRAIN_WIDTH = TERRAIN_MAX_X - TERRAIN_MIN_X;
const MIN_CAMERA_X = TERRAIN_MIN_X;
const MAX_CAMERA_X = TERRAIN_MAX_X - VIEWPORT.width;
const LOCAL_LANDER_ID_KEY = "lunar-lander:mmo:lander-id";
const LOCAL_LANDER_TOKEN_KEY = "lunar-lander:mmo:control-token";
const RELEASED: PressedState = {
  thrust: false,
  left: false,
  right: false,
  strafeLeft: false,
  strafeRight: false,
};
const NEUTRAL: LanderInput = { thrust: false, rotate: 0 };
const PLATFORM_BUILD_MS = 5000;
const TRAJECTORY_GRAVITY = -15.5;
const STAR_FIELD = Array.from({ length: 36 }, (_, index) => ({
  x: TERRAIN_MIN_X + 80 + ((index * 197) % (TERRAIN_MAX_X - TERRAIN_MIN_X - 160)),
  y: 326 + ((index * 83) % 548),
  size: index % 9 === 0 ? 2.2 : index % 4 === 0 ? 1.6 : 1.1,
}));

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function screenY(worldY: number): number {
  return VIEWPORT.height - worldY;
}

function terrainPolylinePoints(terrain: readonly LanderVector[]): string {
  const points = terrain.flatMap((point, index) => {
    const next = terrain[index + 1];
    if (!next) return [point];

    const dx = next.x - point.x;
    const steps = Math.max(1, Math.floor(dx / 34));
    if (point.y === next.y || steps === 1) return [point];

    return Array.from({ length: steps }, (_, stepIndex) => {
      const progress = stepIndex / steps;
      const x = point.x + dx * progress;
      const y = point.y + (next.y - point.y) * progress;
      const chippedEdge = Math.round(Math.sin((x + index * 29) * 0.09) * 4);
      return { x, y: y + chippedEdge };
    });
  });

  return points.map((point) => `${point.x},${screenY(point.y)}`).join(" ");
}

function formatMetric(value: number): string {
  return Math.max(0, Math.round(value)).toString().padStart(4, "0");
}

function formatSpeed(value: number): string {
  return Math.abs(Math.round(value)).toString();
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function formatResourceLabel(resourceId: string): string {
  return resourceId.replaceAll("-", " ");
}

function formatRoomLabel(roomId: string): string {
  return roomId.replaceAll("-", " ");
}

function formatAutomationLabel(automationId: string): string {
  return automationId.replace(/^auto-/, "auto ").replaceAll("-", " ");
}

function formatIntegrity(current: number, max: number): string {
  if (max <= 0) return "000%";
  return `${Math.round(clamp((current / max) * 100, 0, 100)).toString().padStart(3, "0")}%`;
}

function sortedResources(resources: WorldResourceMap): [string, number][] {
  return Object.entries(resources)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] !== 0)
    .sort(([left], [right]) => left.localeCompare(right));
}

function touchdownScore(
  state: LanderState,
  landingPads: readonly LandingPad[],
  outposts: readonly WorldOutpost[],
): number {
  if (state.status !== "landed") return 0;
  const claimedPad = outposts.find((outpost) => Math.abs(outpost.x - state.position.x) < 0.1)
    ?.claimedPad;
  const pad = findLandingPad(state.position.x, landingPads);
  return Math.round((claimedPad?.multiplier ?? pad?.multiplier ?? 1) * (100 + state.fuel));
}

function controlFromPressed(pressed: PressedState): LanderInput {
  const lateral = pressed.strafeLeft ? -1 : pressed.strafeRight ? 1 : 0;

  return {
    thrust: pressed.thrust,
    rotate: pressed.left ? -1 : pressed.right ? 1 : 0,
    ...(lateral === 0 ? {} : { lateral }),
  };
}

function sameInput(left: LanderInput, right: LanderInput): boolean {
  return (
    left.thrust === right.thrust &&
    left.rotate === right.rotate &&
    (left.lateral ?? 0) === (right.lateral ?? 0)
  );
}

function safetyTextClass(enabled: boolean, safe: boolean): string {
  if (!enabled) return "text-right";
  return safe ? "text-right text-emerald-300" : "text-right text-amber";
}

function trajectoryPolylinePoints(lander: WorldLander, terrain: readonly LanderVector[]): string {
  if (lander.state.status !== "flying" || !lander.flightStats?.hasFlightComputer) return "";

  const points: string[] = [];
  for (let index = 0; index <= 10; index += 1) {
    const time = index * 0.45;
    const x = lander.state.position.x + lander.state.velocity.x * time;
    const ballisticY =
      lander.state.position.y + lander.state.velocity.y * time + 0.5 * TRAJECTORY_GRAVITY * time * time;
    const y = Math.max(ballisticY, terrainSurfaceY(x, terrain));
    points.push(`${x},${screenY(y)}`);
  }
  return points.join(" ");
}

function readStoredPilot(): LocalPilot | null {
  if (typeof window === "undefined") return null;
  const id = window.sessionStorage.getItem(LOCAL_LANDER_ID_KEY);
  const token = window.sessionStorage.getItem(LOCAL_LANDER_TOKEN_KEY);
  return id && token ? { id, token } : null;
}

function writeStoredPilot(pilot: LocalPilot): void {
  window.sessionStorage.setItem(LOCAL_LANDER_ID_KEY, pilot.id);
  window.sessionStorage.setItem(LOCAL_LANDER_TOKEN_KEY, pilot.token);
}

function clearStoredPilot(): void {
  window.sessionStorage.removeItem(LOCAL_LANDER_ID_KEY);
  window.sessionStorage.removeItem(LOCAL_LANDER_TOKEN_KEY);
}

function SpaceBarIcon() {
  return (
    <span
      aria-hidden="true"
      className="flex h-[1.08em] w-[4.2em] items-center justify-center rounded-[0.26em] border border-current"
    >
      <span className="h-[0.42em] w-[2.5em] rounded-b-[0.16em] border-b border-l border-r border-current" />
    </span>
  );
}

function XboxMenuIcon() {
  return (
    <span
      aria-hidden="true"
      className="flex h-[1.22em] w-[1.22em] items-center justify-center rounded-full border border-current"
    >
      <svg viewBox="0 0 24 24" className="h-[0.82em] w-[0.82em]" fill="none" stroke="currentColor">
        <path d="M7 8h10M7 12h10M7 16h10" strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    </span>
  );
}

function SpawnPromptIcons() {
  return (
    <>
      <SpaceBarIcon />
      <span aria-hidden="true" className="opacity-60">
        /
      </span>
      <XboxMenuIcon />
    </>
  );
}

function localInstruction(localLander: WorldLander | null): { label: string; content: ReactNode } {
  if (!localLander) {
    return {
      label: "Start.",
      content: (
        <>
          Start <SpawnPromptIcons />
        </>
      ),
    };
  }
  if (localLander.state.status === "landed") {
    return {
      label: "Landed. Start.",
      content: (
        <>
          Landed <SpawnPromptIcons /> Start
        </>
      ),
    };
  }
  if (localLander.state.status === "crashed") {
    return {
      label: "Lost. Start.",
      content: (
        <>
          Lost <SpawnPromptIcons /> Start
        </>
      ),
    };
  }
  return {
    label: "Fly. Pan.",
    content: <>Fly W/A/D + Q/E / Xbox. Pan arrows / stick</>,
  };
}

function terminalAgeMs(lander: WorldLander, serverTime: number): number {
  return Math.max(0, serverTime - (lander.resolvedAt ?? lander.updatedAt));
}

function LandedHatch({ ageMs }: { ageMs: number }) {
  if (ageMs < 420) {
    return <polyline points="-8,-2 0,-12 8,-2" />;
  }

  if (ageMs < 880) {
    return (
      <>
        <line x1="-9" x2="-2" y1="-2" y2="-10" />
        <line x1="9" x2="2" y1="-2" y2="-10" />
      </>
    );
  }

  return <line x1="-14" x2="14" y1="-12" y2="-12" />;
}

function LanderDrawing({
  lander,
  stroke,
  serverTime,
}: {
  lander: WorldLander;
  stroke: string;
  serverTime: number;
}) {
  if (lander.state.status === "crashed") {
    return null;
  }

  const landedAge = lander.state.status === "landed" ? terminalAgeMs(lander, serverTime) : 0;
  const lateral = lander.state.status === "flying" ? (lander.input.lateral ?? 0) : 0;

  return (
    <g fill="none" stroke={stroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke">
      {lander.input.thrust && lander.state.status === "flying" && (
        <polyline points="-4,12 0,30 4,12" />
      )}
      {lateral < 0 && <polyline points="8,-4 24,-8 8,-10" />}
      {lateral > 0 && <polyline points="-8,-4 -24,-8 -8,-10" />}
      {lander.state.status === "landed" ? (
        <>
          <polyline points="-8,-2 -8,8 -3,12 3,12 8,8 8,-2" />
          <LandedHatch ageMs={landedAge} />
        </>
      ) : (
        <polyline points="0,-12 8,-2 8,8 3,12 -3,12 -8,8 -8,-2 0,-12" />
      )}
      <polyline points="-7,7 -14,14 -9,14" />
      <polyline points="7,7 14,14 9,14" />
      <line x1="-5" x2="5" y1="-3" y2="-3" />
    </g>
  );
}

function CrashExplosion({ crash, serverTime }: { crash: WorldCrashEvent; serverTime: number }) {
  const ageMs = Math.max(0, serverTime - crash.createdAt);
  const growth = clamp(ageMs / 900, 0, 1);
  const fade = clamp(1 - Math.max(0, ageMs - 1600) / 900, 0, 1);
  if (fade <= 0) return null;

  const long = 12 + growth * 22;
  const short = 7 + growth * 14;

  return (
    <g
      transform={`translate(${crash.x} ${screenY(crash.y + 8)})`}
      fill="none"
      opacity={fade}
      stroke="#ffffff"
      strokeLinecap="square"
      strokeWidth="1.15"
      vectorEffect="non-scaling-stroke"
    >
      <line x1={-long} x2={long} y1="0" y2="0" />
      <line x1="0" x2="0" y1={-long} y2={long} />
      <line x1={-short} x2={short} y1={-short} y2={short} />
      <line x1={-short} x2={short} y1={short} y2={-short} />
    </g>
  );
}

function Astronaut({ outpost, serverTime }: { outpost: WorldOutpost; serverTime: number }) {
  const ageMs = Math.max(0, serverTime - outpost.createdAt);
  if (ageMs >= PLATFORM_BUILD_MS) return null;

  const buildComplete = ageMs >= PLATFORM_BUILD_MS;
  const jumpProgress = clamp(ageMs / 980, 0, 1);
  const buildPulse = !buildComplete && ageMs > 1100 && ageMs % 420 < 210;
  const x = outpost.x + 4 + jumpProgress * (outpost.width / 2 + 7);
  const y = outpost.deckY + Math.sin(jumpProgress * Math.PI) * 14;

  return (
    <g
      transform={`translate(${x} ${screenY(y)})`}
      fill="none"
      stroke="#ffffff"
      strokeLinecap="square"
      strokeWidth="1.05"
      vectorEffect="non-scaling-stroke"
    >
      <polyline points="0,-16 4,-12 0,-8 -4,-12 0,-16" />
      <line x1="0" x2="0" y1="-8" y2="-2" />
      <line x1="-5" x2="5" y1="-6" y2="-4" />
      <line x1="0" x2="-4" y1="-2" y2="2" />
      <line x1="0" x2="4" y1="-2" y2="2" />
      {buildPulse && <line x1="5" x2="11" y1="-5" y2="-9" />}
    </g>
  );
}

function LandingOutpost({ outpost, serverTime }: { outpost: WorldOutpost; serverTime: number }) {
  const ageMs = Math.max(0, serverTime - outpost.createdAt);
  const buildAge = Math.max(0, ageMs - 780);
  const halfWidth = outpost.width / 2;
  const leftX = outpost.x - halfWidth;
  const rightX = outpost.x + halfWidth;
  const leftSurfaceY = outpost.leftSupportY;
  const rightSurfaceY = outpost.rightSupportY;
  const centerSurfaceY = outpost.surfaceY;
  const showCenterPost = buildAge > 0;
  const showSidePosts = buildAge > 420;
  const showBraces = buildAge > 860;

  return (
    <g fill="none" stroke="#ffffff" strokeLinecap="square" strokeWidth="1.1">
      <line
        x1={leftX}
        x2={rightX}
        y1={screenY(outpost.deckY)}
        y2={screenY(outpost.deckY)}
        vectorEffect="non-scaling-stroke"
      />
      {showCenterPost && (
        <line
          x1={outpost.x}
          x2={outpost.x}
          y1={screenY(outpost.deckY)}
          y2={screenY(centerSurfaceY)}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {showSidePosts && (
        <>
          <line
            x1={leftX}
            x2={leftX}
            y1={screenY(outpost.deckY)}
            y2={screenY(leftSurfaceY)}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={rightX}
            x2={rightX}
            y1={screenY(outpost.deckY)}
            y2={screenY(rightSurfaceY)}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
      {showBraces && (
        <>
          <line
            x1={leftX}
            x2={rightX}
            y1={screenY(outpost.deckY)}
            y2={screenY(rightSurfaceY)}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={rightX}
            x2={leftX}
            y1={screenY(outpost.deckY)}
            y2={screenY(leftSurfaceY)}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
      <Astronaut outpost={outpost} serverTime={serverTime} />
    </g>
  );
}

function BaseDrawing({ base }: { base: WorldBase }) {
  const damaged = base.integrity < base.maxIntegrity * 0.5;

  return (
    <g fill="none" stroke={damaged ? "#fca5a5" : "#67e8f9"} strokeLinecap="square" strokeWidth="1">
      <rect
        x={base.footprint.x}
        y={screenY(base.footprint.y + base.footprint.height)}
        width={base.footprint.width}
        height={base.footprint.height}
        strokeDasharray="4 5"
        vectorEffect="non-scaling-stroke"
      />
      {base.landingPads.map((pad, index) => (
        <g key={`${base.id}-pad-${index}`}>
          <line
            x1={pad.x}
            x2={pad.x + pad.width}
            y1={screenY(pad.y)}
            y2={screenY(pad.y)}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={pad.x + pad.width / 2}
            y={screenY(pad.y) - 10}
            fill="currentColor"
            textAnchor="middle"
            className="select-none text-[10px] uppercase tracking-[0.2em]"
          >
            pad
          </text>
        </g>
      ))}
      {base.rooms.map((room) => {
        const roomWidth = room.roomId === "landing-pad" ? 32 : 26;
        const roomHeight = 16;
        const roomIntegrity = room.maxIntegrity > 0 ? room.integrity / room.maxIntegrity : 0;
        return (
          <g key={room.instanceId}>
            <rect
              x={room.position.x - roomWidth / 2}
              y={screenY(room.position.y + roomHeight)}
              width={roomWidth}
              height={roomHeight}
              fill="#000000"
              opacity={0.86}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={room.position.x - roomWidth / 2}
              x2={room.position.x - roomWidth / 2 + roomWidth * clamp(roomIntegrity, 0, 1)}
              y1={screenY(room.position.y + roomHeight + 4)}
              y2={screenY(room.position.y + roomHeight + 4)}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
      <text
        x={base.position.x}
        y={screenY(base.position.y + 44)}
        fill={damaged ? "#fca5a5" : "#67e8f9"}
        textAnchor="middle"
        className="select-none text-[12px] uppercase tracking-[0.22em]"
      >
        base
      </text>
    </g>
  );
}

function BaseOpsPanel({
  bases,
  stations,
  flights,
  selectedBase,
  selectedCommander,
  selectedIndex,
  serverTime,
  onSelectPrevious,
  onSelectNext,
  actionStatus,
  onResearchAutomationControl,
  onToggleAutomation,
  onBuildStorage,
  onBuildMine,
  onRepair,
  onLaunchToStation,
  onTransferMoonToMars,
}: {
  bases: readonly WorldBase[];
  stations: readonly WorldStation[];
  flights: readonly WorldFlight[];
  selectedBase: WorldBase | null;
  selectedCommander: WorldCommander | null;
  selectedIndex: number;
  serverTime: number;
  onSelectPrevious: () => void;
  onSelectNext: () => void;
  actionStatus: string;
  onResearchAutomationControl: () => void;
  onToggleAutomation: (baseId: string, automationId: string, enabled: boolean) => void;
  onBuildStorage: (baseId: string) => void;
  onBuildMine: (baseId: string) => void;
  onRepair: (baseId: string) => void;
  onLaunchToStation: (baseId: string) => void;
  onTransferMoonToMars: () => void;
}) {
  if (!selectedBase) return null;

  const recentDamage = selectedBase.damageEvents.at(-1) ?? null;
  const resources = sortedResources(selectedBase.storage).slice(0, 6);
  const rooms = selectedBase.rooms.slice(0, 7);
  const buildQueue = selectedBase.buildQueue.slice(0, 3);
  const productionJobs = selectedBase.productionJobs.slice(0, 3);
  const automationStates = ["auto-mining", "auto-repair"].map((automationId) => ({
    automationId,
    enabled: Boolean(selectedBase.automation?.[automationId]?.enabled),
  }));
  const automationLog = selectedBase?.automationLog?.slice(-3).reverse() ?? [];
  const stationSummaries = stations.slice(0, 3);
  const activeFlights = flights.filter((flight) => flight.status === "active").slice(0, 3);
  const canTransferMoonToMars = stations.some((station) => station.id === "moon-orbit");
  const hasAutomationControl = Boolean(selectedCommander?.unlockedTech.includes("automation-control"));

  return (
    <aside className="pointer-events-auto absolute bottom-12 right-3 z-20 w-[min(28rem,calc(100vw-1.5rem))] border border-cyan/70 bg-black/95 p-4 font-mono uppercase tracking-[0.18em] text-white shadow-2xl shadow-cyan/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] text-cyan">Base ops</p>
          <h2 className="mt-1 text-lg tracking-[0.22em]">
            {selectedBase.name}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="border border-white/50 px-2 py-1 text-[10px] hover:bg-white hover:text-black disabled:opacity-30"
            onClick={onSelectPrevious}
            disabled={bases.length < 2}
          >
            prev
          </button>
          <button
            type="button"
            className="border border-white/50 px-2 py-1 text-[10px] hover:bg-white hover:text-black disabled:opacity-30"
            onClick={onSelectNext}
            disabled={bases.length < 2}
          >
            next
          </button>
        </div>
      </div>

      <>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
            <div className="border border-white/30 p-2">
              <p className="text-white/50">Integrity</p>
              <p className={selectedBase.integrity < selectedBase.maxIntegrity * 0.5 ? "text-red-200" : "text-cyan"}>
                {formatIntegrity(selectedBase.integrity, selectedBase.maxIntegrity)}
              </p>
            </div>
            <div className="border border-white/30 p-2">
              <p className="text-white/50">Rooms</p>
              <p>{formatMetric(selectedBase.rooms.length)}</p>
            </div>
            <div className="border border-white/30 p-2">
              <p className="text-white/50">Base</p>
              <p>
                {selectedIndex + 1}/{bases.length}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section>
              <p className="border-b border-white/30 pb-1 text-[10px] text-white/60">Storage</p>
              <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[11px]">
                {resources.length > 0 ? (
                  resources.map(([resourceId, amount]) => (
                    <span key={resourceId} className="contents">
                      <span>{formatResourceLabel(resourceId)}</span>
                      <span className="text-right text-cyan">{formatMetric(amount)}</span>
                    </span>
                  ))
                ) : (
                  <span className="col-span-2 text-white/45">storage empty</span>
                )}
              </div>
            </section>

            <section>
              <p className="border-b border-white/30 pb-1 text-[10px] text-white/60">Rooms</p>
              <div className="mt-2 space-y-1 text-[11px]">
                {rooms.map((room) => (
                  <div key={room.instanceId} className="grid grid-cols-[1fr_auto] gap-3">
                    <span>{formatRoomLabel(room.roomId)}</span>
                    <span className={room.integrity < room.maxIntegrity * 0.5 ? "text-red-200" : "text-white/70"}>
                      {formatIntegrity(room.integrity, room.maxIntegrity)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section>
              <p className="border-b border-white/30 pb-1 text-[10px] text-white/60">Build queue</p>
              <div className="mt-2 space-y-1 text-[11px]">
                {buildQueue.length > 0 ? (
                  buildQueue.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3">
                      <span>{formatRoomLabel(item.roomId)}</span>
                      <span>{Math.max(0, Math.ceil((item.completesAt - serverTime) / 1000))}s</span>
                    </div>
                  ))
                ) : (
                  <p className="text-white/45">queue idle</p>
                )}
              </div>
            </section>

            <section>
              <p className="border-b border-white/30 pb-1 text-[10px] text-white/60">Production</p>
              <div className="mt-2 space-y-1 text-[11px]">
                {productionJobs.length > 0 ? (
                  productionJobs.map((job) => (
                    <div key={job.id} className="grid grid-cols-[1fr_auto] gap-3">
                      <span>{formatRoomLabel(job.roomId)}</span>
                      <span className="text-cyan">{formatMetric(job.producedTicks)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-white/45">manual bootstrap</p>
                )}
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section>
              <p className="border-b border-white/30 pb-1 text-[10px] text-white/60">Automation</p>
              <div className="mt-2 space-y-1 text-[11px]">
                {automationStates.map((state) => (
                  <div key={state.automationId} className="grid grid-cols-[1fr_auto] gap-3">
                    <span>{formatAutomationLabel(state.automationId)}</span>
                    <span className={state.enabled ? "text-cyan" : "text-white/45"}>
                      {state.enabled ? "on" : "off"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="border-b border-white/30 pb-1 text-[10px] text-white/60">Automation log</p>
              <div className="mt-2 space-y-1 text-[11px]">
                {automationLog.length > 0 ? (
                  automationLog.map((entry) => (
                    <p key={entry.id} className="text-white/60">
                      {entry.message}
                    </p>
                  ))
                ) : (
                  <p className="text-white/45">automation idle</p>
                )}
              </div>
            </section>
          </div>

          <p className="mt-4 border border-white/25 p-2 text-[10px] leading-relaxed text-white/60">
            {recentDamage
              ? `last impact ${formatMetric(recentDamage.amount)} dmg / integrity ${formatIntegrity(
                  recentDamage.integrityAfter,
                  selectedBase.maxIntegrity,
                )}`
              : "no damage events logged"}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-[10px]">
            <button
              type="button"
              className="border border-cyan/60 px-2 py-2 text-left hover:bg-cyan hover:text-black"
              onClick={() => onBuildStorage(selectedBase.id)}
            >
              build storage
            </button>
            <button
              type="button"
              className="border border-cyan/60 px-2 py-2 text-left hover:bg-cyan hover:text-black"
              onClick={() => onBuildMine(selectedBase.id)}
            >
              build mine
            </button>
            <button
              type="button"
              className="border border-cyan/60 px-2 py-2 text-left hover:bg-cyan hover:text-black"
              onClick={() => onRepair(selectedBase.id)}
            >
              repair
            </button>
            <button
              type="button"
              className="border border-cyan/60 px-2 py-2 text-left hover:bg-cyan hover:text-black"
              onClick={() => onLaunchToStation(selectedBase.id)}
            >
              launch station
            </button>
            <button
              type="button"
              className="col-span-2 border border-cyan/60 px-2 py-2 text-left hover:bg-cyan hover:text-black disabled:opacity-30"
              onClick={onResearchAutomationControl}
              disabled={hasAutomationControl}
            >
              {hasAutomationControl ? "automation researched" : "research automation"}
            </button>
            <button
              type="button"
              className="border border-cyan/60 px-2 py-2 text-left hover:bg-cyan hover:text-black"
              onClick={() =>
                onToggleAutomation(selectedBase.id, "auto-mining", !selectedBase.automation?.["auto-mining"]?.enabled)
              }
            >
              {selectedBase.automation?.["auto-mining"]?.enabled ? "disable mining" : "enable mining"}
            </button>
            <button
              type="button"
              className="border border-cyan/60 px-2 py-2 text-left hover:bg-cyan hover:text-black"
              onClick={() =>
                onToggleAutomation(selectedBase.id, "auto-repair", !selectedBase.automation?.["auto-repair"]?.enabled)
              }
            >
              {selectedBase.automation?.["auto-repair"]?.enabled ? "disable repair" : "enable repair"}
            </button>
            <button
              type="button"
              className="col-span-2 border border-cyan/60 px-2 py-2 text-left hover:bg-cyan hover:text-black disabled:opacity-30"
              onClick={onTransferMoonToMars}
              disabled={!canTransferMoonToMars}
            >
              transfer moon-mars
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section>
              <p className="border-b border-white/30 pb-1 text-[10px] text-white/60">Stations</p>
              <div className="mt-2 space-y-1 text-[11px]">
                {stationSummaries.map((station) => (
                  <div key={station.id} className="grid grid-cols-[1fr_auto] gap-3">
                    <span>{station.bodyId} orbit</span>
                    <span className="text-cyan">
                      F{formatMetric(station.storage.fuel ?? 0)} O{formatMetric(station.storage.oxygen ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="border-b border-white/30 pb-1 text-[10px] text-white/60">Flights</p>
              <div className="mt-2 space-y-1 text-[11px]">
                {activeFlights.length > 0 ? (
                  activeFlights.map((flight) => (
                    <div key={flight.id} className="grid grid-cols-[1fr_auto] gap-3">
                      <span>
                        {flight.originBodyId}-{flight.destinationBodyId}
                      </span>
                      <span>{Math.max(0, Math.ceil((flight.arrivesAt - serverTime) / 1000))}s</span>
                    </div>
                  ))
                ) : (
                  <p className="text-white/45">no active flights</p>
                )}
              </div>
            </section>
          </div>
      </>

      <p className="mt-4 text-[10px] leading-relaxed text-white/45">
        {actionStatus}
      </p>
      <p className="mt-2 text-[10px] leading-relaxed text-white/45">
        B toggles panel. V cycles bases. Commands require your local pilot token.
      </p>
    </aside>
  );
}

export default function LunarLanderGame() {
  const [worldLanders, setWorldLanders] = useState<WorldLander[]>([]);
  const [worldTerrain, setWorldTerrain] = useState<LanderVector[]>(() =>
    LUNAR_TERRAIN_POINTS.map((point) => ({ ...point })),
  );
  const [landingPads, setLandingPads] = useState<LandingPad[]>(() =>
    LUNAR_LANDER_PADS.map((pad) => ({ ...pad })),
  );
  const [crashEvents, setCrashEvents] = useState<WorldCrashEvent[]>([]);
  const [outposts, setOutposts] = useState<WorldOutpost[]>([]);
  const [bases, setBases] = useState<WorldBase[]>([]);
  const [stations, setStations] = useState<WorldStation[]>([]);
  const [flights, setFlights] = useState<WorldFlight[]>([]);
  const [commanders, setCommanders] = useState<WorldCommander[]>([]);
  const [serverTime, setServerTime] = useState(() => Date.now());
  const [localPilot, setLocalPilot] = useState<LocalPilot | null>(null);
  const localPilotRef = useRef<LocalPilot | null>(null);
  const desktopInputRef = useRef<LanderInput>(NEUTRAL);
  const keyboardInputRef = useRef<LanderInput>(NEUTRAL);
  const gamepadInputRef = useRef<LanderInput>(NEUTRAL);
  const pressedRef = useRef<PressedState>(RELEASED);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cameraXRef = useRef(MIN_CAMERA_X);
  const cameraPanRef = useRef<CameraPanState>({ left: false, right: false, gamepad: 0 });
  const [, setStatus] = useState("Watching the shared lunar surface.");
  const [showPhonePanel, setShowPhonePanel] = useState(false);
  const [showBasePanel, setShowBasePanel] = useState(true);
  const [baseActionStatus, setBaseActionStatus] = useState("Base action API ready.");
  const [selectedBaseIndex, setSelectedBaseIndex] = useState(0);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [browserOrigin, setBrowserOrigin] = useState<string | null>(null);
  const gamepadNameRef = useRef<string | null>(null);

  useEffect(() => {
    const storedPilot = readStoredPilot();
    if (storedPilot) {
      localPilotRef.current = storedPilot;
      setLocalPilot(storedPilot);
      setStatus("Reconnected to your session lander.");
    }
    setBrowserOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    localPilotRef.current = localPilot;
  }, [localPilot]);

  const updateCameraViewBox = useCallback((nextCameraX: number) => {
    cameraXRef.current = nextCameraX;
    svgRef.current?.setAttribute(
      "viewBox",
      `${nextCameraX} 0 ${VIEWPORT.width} ${VIEWPORT.height}`,
    );
  }, []);

  const forgetLocalPilot = useCallback(() => {
    clearStoredPilot();
    localPilotRef.current = null;
    setLocalPilot(null);
    pressedRef.current = RELEASED;
    keyboardInputRef.current = NEUTRAL;
    gamepadInputRef.current = NEUTRAL;
    desktopInputRef.current = NEUTRAL;
  }, []);

  const sendControl = useCallback(
    async (nextInput: LanderInput & { reset?: boolean }) => {
      const pilot = localPilotRef.current;
      if (!pilot) return;

      try {
        const response = await fetch(
          `/api/labs/lunar-lander/landers/${encodeURIComponent(pilot.id)}/control`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...nextInput, token: pilot.token }),
          },
        );

        if (response.status === 404) {
          if (localPilotRef.current?.id === pilot.id) {
            forgetLocalPilot();
            setStatus("Your previous lander expired. Press Space to spawn a new one.");
          }
          return;
        }

        if (!response.ok) {
          setStatus(`Control signal failed with ${response.status}.`);
          return;
        }

        // World polling owns visual updates; control heartbeats should not re-render React.
      } catch {
        setStatus("Control signal failed. Check the dev server connection.");
      }
    },
    [forgetLocalPilot],
  );

  const commitDesktopInput = useCallback(
    (keyboardInput = keyboardInputRef.current, gamepadInput = gamepadInputRef.current) => {
      const nextInput = combineLanderInputs(keyboardInput, gamepadInput);
      if (sameInput(nextInput, desktopInputRef.current)) return;

      desktopInputRef.current = nextInput;
      void sendControl(nextInput);
    },
    [sendControl],
  );

  const resetLocalLander = useCallback(() => {
    pressedRef.current = RELEASED;
    keyboardInputRef.current = NEUTRAL;
    gamepadInputRef.current = NEUTRAL;
    desktopInputRef.current = NEUTRAL;
    void sendControl({ ...NEUTRAL, reset: true });
  }, [sendControl]);

  const spawnLocalLander = useCallback(async (blueprintId?: string) => {
    try {
      const response = await fetch("/api/labs/lunar-lander/landers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pilot: "desktop",
          ...(blueprintId ? { blueprintId } : {}),
        }),
      });
      if (!response.ok) {
        throw new Error(`Spawn failed with ${response.status}`);
      }

      const spawned = (await response.json()) as SpawnResponse;
      const pilot = { id: spawned.lander.id, token: spawned.controlToken };
      writeStoredPilot(pilot);
      localPilotRef.current = pilot;
      setLocalPilot(pilot);
      pressedRef.current = RELEASED;
      keyboardInputRef.current = NEUTRAL;
      gamepadInputRef.current = NEUTRAL;
      desktopInputRef.current = NEUTRAL;
      setWorldLanders((current) => [
        spawned.lander,
        ...current.filter((lander) => lander.id !== spawned.lander.id),
      ]);
      updateCameraViewBox(
        clamp(spawned.lander.state.position.x - VIEWPORT.width * 0.35, MIN_CAMERA_X, MAX_CAMERA_X),
      );
      setStatus(`Spawned ${spawned.lander.label}. Use W/A/D plus Q/E side thrust or the Xbox controller to pilot it.`);
      if (blueprintId) setBaseActionStatus(`Spawned ${spawned.lander.blueprintName ?? "base-kit craft"}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to spawn a lander.");
      if (blueprintId) setBaseActionStatus("Unable to spawn base-kit craft.");
    }
  }, [updateCameraViewBox]);

  const sendBaseAction = useCallback(
    async (label: string, url: string, payload: Record<string, unknown> = {}) => {
      const pilot = localPilotRef.current;
      if (!pilot) {
        setBaseActionStatus("Spawn a local pilot before sending base commands.");
        setStatus("Spawn a local pilot before sending base commands.");
        return;
      }

      setBaseActionStatus(`${label} pending...`);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...payload, landerId: pilot.id, token: pilot.token }),
        });
        if (!response.ok) {
          const error = (await response.json().catch(() => null)) as { error?: string } | null;
          setBaseActionStatus(`${label} failed: ${error?.error ?? response.status}`);
          return;
        }
        setBaseActionStatus(`${label} accepted.`);
      } catch {
        setBaseActionStatus(`${label} failed: network offline.`);
      }
    },
    [],
  );

  const updatePressed = useCallback(
    (nextPressed: PressedState) => {
      pressedRef.current = nextPressed;
      const nextKeyboardInput = controlFromPressed(nextPressed);
      keyboardInputRef.current = nextKeyboardInput;
      commitDesktopInput(nextKeyboardInput);
    },
    [commitDesktopInput],
  );

  useEffect(() => {
    let cancelled = false;
    let timeout = 0;

    async function pollWorld() {
      try {
        const response = await fetch("/api/labs/lunar-lander/world", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const snapshot = (await response.json()) as WorldSnapshotResponse;
        if (!cancelled) {
          setServerTime(snapshot.serverTime);
          setWorldTerrain(snapshot.terrain);
          setLandingPads(snapshot.landingPads ?? LUNAR_LANDER_PADS.map((pad) => ({ ...pad })));
          setCrashEvents(snapshot.crashes);
          setOutposts(snapshot.outposts);
          setBases(snapshot.bases ?? []);
          setStations(snapshot.stations ?? []);
          setFlights(snapshot.flights ?? []);
          setCommanders(snapshot.commanders ?? []);
          setWorldLanders(snapshot.landers);
        }
      } catch {
        if (!cancelled) {
          setStatus("World signal interrupted. Retrying...");
        }
      }

      if (!cancelled) {
        timeout = window.setTimeout(
          pollWorld,
          document.hidden ? HIDDEN_WORLD_POLL_MS : WORLD_POLL_MS,
        );
      }
    }

    void pollWorld();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!localPilot) return;

    const sendActiveControl = () => {
      const currentInput = desktopInputRef.current;
      if (hasActiveLanderInput(currentInput)) {
        void sendControl(currentInput);
      }
    };

    sendActiveControl();
    const interval = window.setInterval(sendActiveControl, CONTROL_HEARTBEAT_MS);
    return () => window.clearInterval(interval);
  }, [localPilot, sendControl]);

  useEffect(() => {
    setSelectedBaseIndex((current) =>
      bases.length === 0 ? 0 : clamp(current, 0, bases.length - 1),
    );
  }, [bases.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        if (!event.repeat) void spawnLocalLander();
        return;
      }

      if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
        event.preventDefault();
        cameraPanRef.current = {
          ...cameraPanRef.current,
          [event.code === "ArrowLeft" ? "left" : "right"]: true,
        };
        return;
      }

      if (event.code === "KeyR") {
        event.preventDefault();
        resetLocalLander();
        return;
      }

      if (event.code === "KeyB") {
        event.preventDefault();
        if (!event.repeat) setShowBasePanel((current) => !current);
        return;
      }

      if (event.code === "KeyV") {
        event.preventDefault();
        if (!event.repeat && bases.length > 1) {
          setSelectedBaseIndex((current) => (current + 1) % bases.length);
        }
        return;
      }

      if (
        event.code === "KeyW" ||
        event.code === "KeyA" ||
        event.code === "KeyD" ||
        event.code === "KeyQ" ||
        event.code === "KeyE"
      ) {
        event.preventDefault();
        if (!localPilotRef.current) {
          setStatus("Press Space to spawn your lander before piloting.");
          return;
        }

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

    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
        event.preventDefault();
        cameraPanRef.current = {
          ...cameraPanRef.current,
          [event.code === "ArrowLeft" ? "left" : "right"]: false,
        };
        return;
      }

      if (
        event.code === "KeyW" ||
        event.code === "KeyA" ||
        event.code === "KeyD" ||
        event.code === "KeyQ" ||
        event.code === "KeyE"
      ) {
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

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [bases.length, resetLocalLander, spawnLocalLander, updatePressed]);

  useEffect(() => {
    if (!navigator.getGamepads) return;

    let frame = 0;
    let wasSpawnPressed = false;
    let wasResetPressed = false;

    function setActiveGamepadName(nextName: string | null) {
      if (nextName === gamepadNameRef.current) return;
      gamepadNameRef.current = nextName;
    }

    function releaseGamepadInput() {
      setActiveGamepadName(null);
      wasSpawnPressed = false;
      wasResetPressed = false;
      cameraPanRef.current = { ...cameraPanRef.current, gamepad: 0 };

      if (!sameInput(gamepadInputRef.current, NEUTRAL)) {
        gamepadInputRef.current = NEUTRAL;
        commitDesktopInput();
      }
    }

    function pollGamepads() {
      const control = getLunarLanderGamepadControl(navigator.getGamepads());

      if (!control) {
        releaseGamepadInput();
        frame = window.requestAnimationFrame(pollGamepads);
        return;
      }

      setActiveGamepadName(control.id);
      cameraPanRef.current = { ...cameraPanRef.current, gamepad: control.cameraPan };

      if (!sameInput(control.input, gamepadInputRef.current)) {
        gamepadInputRef.current = control.input;
        commitDesktopInput();
      }

      if (control.spawn && !wasSpawnPressed) {
        void spawnLocalLander();
      }

      if (control.reset && !wasResetPressed) {
        resetLocalLander();
      }

      wasSpawnPressed = control.spawn;
      wasResetPressed = control.reset;
      frame = window.requestAnimationFrame(pollGamepads);
    }

    frame = window.requestAnimationFrame(pollGamepads);
    return () => window.cancelAnimationFrame(frame);
  }, [commitDesktopInput, resetLocalLander, spawnLocalLander]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.08);
      last = now;
      const direction =
        (cameraPanRef.current.right ? 1 : 0) -
        (cameraPanRef.current.left ? 1 : 0) +
        cameraPanRef.current.gamepad;
      if (direction !== 0) {
        updateCameraViewBox(
          clamp(
            cameraXRef.current + clamp(direction, -1, 1) * CAMERA_SPEED * dt,
            MIN_CAMERA_X,
            MAX_CAMERA_X,
          ),
        );
      }
      frame = window.requestAnimationFrame(tick);
    }

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [updateCameraViewBox]);

  const controllerUrl = useMemo(() => {
    if (!browserOrigin) return null;
    return createNetworkControllerLaunchUrl({
      currentOrigin: browserOrigin,
      networkOrigin: NETWORK_ORIGIN,
      preferPortlessLan: USE_PORTLESS_LAN,
    });
  }, [browserOrigin]);

  useEffect(() => {
    let cancelled = false;
    if (!controllerUrl) {
      setQrSvg(null);
      return;
    }

    QRCode.toString(controllerUrl, {
      type: "svg",
      margin: 1,
      width: 180,
      color: {
        dark: "#ffffff",
        light: "#000000",
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

  const localLander = localPilot
    ? (worldLanders.find((lander) => lander.id === localPilot.id) ?? null)
    : null;
  const focusedLander = localLander ?? worldLanders[0] ?? null;
  const terrainLine = useMemo(() => terrainPolylinePoints(worldTerrain), [worldTerrain]);
  const altitude = focusedLander
    ? Math.max(
        0,
        focusedLander.state.position.y -
          terrainSurfaceY(focusedLander.state.position.x, worldTerrain),
      )
    : 0;
  const score = focusedLander ? touchdownScore(focusedLander.state, landingPads, outposts) : 0;
  const pad = focusedLander ? findLandingPad(focusedLander.state.position.x, landingPads) : null;
  const focusedStats = focusedLander?.flightStats;
  const hasSafetyHud = focusedStats?.hasSafetySystem ?? false;
  const horizontalSafe = focusedStats
    ? Math.abs(focusedLander?.state.velocity.x ?? 0) <= focusedStats.safeHorizontalSpeed
    : true;
  const verticalSafe = focusedStats
    ? Math.abs(focusedLander?.state.velocity.y ?? 0) <= focusedStats.safeVerticalSpeed
    : true;
  const angleSafe = focusedStats
    ? Math.abs(focusedLander?.state.angle ?? 0) <= focusedStats.safeAbsAngle
    : true;
  const focusedTrajectory = focusedLander ? trajectoryPolylinePoints(focusedLander, worldTerrain) : "";
  const instruction = localInstruction(localLander);
  const selectedBase = bases[selectedBaseIndex] ?? null;
  const selectedCommander = selectedBase
    ? commanders.find((commander) => commander.id === selectedBase.commanderId) ?? null
    : null;
  const selectPreviousBase = useCallback(() => {
    setSelectedBaseIndex((current) => (bases.length > 0 ? (current + bases.length - 1) % bases.length : 0));
  }, [bases.length]);
  const selectNextBase = useCallback(() => {
    setSelectedBaseIndex((current) => (bases.length > 0 ? (current + 1) % bases.length : 0));
  }, [bases.length]);

  return (
    <div className="relative h-screen min-h-screen overflow-hidden bg-black font-mono text-white">
      <svg
        ref={svgRef}
        viewBox={`${MIN_CAMERA_X} 0 ${VIEWPORT.width} ${VIEWPORT.height}`}
        role="img"
        aria-label="Shared lunar lander vector playfield"
        className="absolute inset-0 h-full w-full bg-black"
      >
        <rect
          x={TERRAIN_MIN_X}
          y="0"
          width={TERRAIN_WIDTH}
          height={VIEWPORT.height}
          fill="#000000"
        />

        <g>
          {STAR_FIELD.map((star) => (
            <rect
              key={`${star.x}-${star.y}`}
              x={star.x}
              y={screenY(star.y)}
              width={star.size}
              height={star.size}
              fill="#ffffff"
            />
          ))}
        </g>

        <polyline
          points={terrainLine}
          fill="none"
          stroke="#ffffff"
          strokeLinecap="square"
          strokeLinejoin="miter"
          strokeWidth="1.35"
          vectorEffect="non-scaling-stroke"
        />

        {landingPads.map((landingPad) => {
          const y = screenY(terrainSurfaceY(landingPad.x + landingPad.width / 2, worldTerrain));
          return (
            <g key={`${landingPad.x}-${landingPad.width}-${landingPad.label}`}>
              <line
                x1={landingPad.x}
                x2={landingPad.x + landingPad.width}
                y1={y}
                y2={y}
                stroke="#ffffff"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={landingPad.x + landingPad.width / 2}
                y={y + 24}
                fill="#ffffff"
                textAnchor="middle"
                className="select-none text-[18px] uppercase tracking-[0.18em]"
              >
                {landingPad.label}
              </text>
            </g>
          );
        })}

        {outposts.map((outpost) => (
          <LandingOutpost key={outpost.id} outpost={outpost} serverTime={serverTime} />
        ))}

        {bases.map((base) => (
          <BaseDrawing key={base.id} base={base} />
        ))}

        {crashEvents.map((crash) => (
          <CrashExplosion key={crash.id} crash={crash} serverTime={serverTime} />
        ))}

        {focusedTrajectory && (
          <polyline
            points={focusedTrajectory}
            fill="none"
            stroke="#67e8f9"
            strokeDasharray="8 12"
            strokeLinecap="square"
            strokeLinejoin="miter"
            strokeWidth="1"
            opacity="0.7"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {worldLanders.map((lander) => {
          const isLocal = lander.id === localPilot?.id;
          const stroke = isLocal ? "#fbbf24" : lander.pilot === "phone" ? "#67e8f9" : "#ffffff";
          return (
            <g key={lander.id}>
              <g
                transform={`translate(${lander.state.position.x} ${screenY(
                  lander.state.position.y,
                )}) rotate(${lander.state.angle})`}
              >
                <LanderDrawing lander={lander} stroke={stroke} serverTime={serverTime} />
              </g>
              <text
                x={lander.state.position.x}
                y={screenY(lander.state.position.y) - 24}
                fill={stroke}
                textAnchor="middle"
                className="select-none text-[14px] uppercase tracking-[0.18em]"
              >
                {lander.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        aria-label={instruction.label}
        className="pointer-events-none absolute left-1/2 top-[6vh] z-10 flex -translate-x-1/2 items-center justify-center gap-[0.75em] whitespace-nowrap text-center text-[clamp(14px,1.35vw,20px)] uppercase leading-[1.15] tracking-[0.28em] text-white"
      >
        {instruction.content}
      </div>

      <div className="pointer-events-none absolute left-[3.4vw] top-[6vh] grid grid-cols-[auto_auto] gap-x-5 text-[clamp(14px,1.35vw,20px)] uppercase leading-[1.15] tracking-[0.28em]">
        <span>World</span>
        <span>{formatMetric(worldLanders.length)}</span>
        <span>Ship</span>
        <span>{focusedLander?.label ?? "NONE"}</span>
        <span>Loadout</span>
        <span>{focusedLander?.blueprintName ?? "----"}</span>
        <span>Time</span>
        <span>{formatTime(focusedLander?.elapsed ?? 0)}</span>
        <span>Fuel</span>
        <span>{formatMetric(focusedLander?.state.fuel ?? 0)}</span>
        <span>Fuel Cap</span>
        <span>{formatMetric(focusedStats?.fuelCapacity ?? 0)}</span>
        <span>Systems</span>
        <span>
          {focusedStats?.lateralThrustAcceleration ? "SIDE " : ""}
          {focusedStats?.hasSafetySystem ? "SAFE " : ""}
          {focusedStats?.hasFlightComputer ? "COMP" : ""}
          {!focusedStats?.lateralThrustAcceleration &&
          !focusedStats?.hasSafetySystem &&
          !focusedStats?.hasFlightComputer
            ? "BASIC"
            : ""}
        </span>
      </div>

      <div className="pointer-events-none absolute right-[3.4vw] top-[6vh] grid grid-cols-[auto_auto] gap-x-8 text-[clamp(14px,1.35vw,20px)] uppercase leading-[1.15] tracking-[0.28em]">
        <span>Score</span>
        <span className="text-right">{formatMetric(score)}</span>
        <span>Altitude</span>
        <span className="text-right">{formatMetric(altitude)}</span>
        <span>Horizontal Speed</span>
        <span className={safetyTextClass(hasSafetyHud, horizontalSafe)}>
          {formatSpeed(focusedLander?.state.velocity.x ?? 0)}
        </span>
        <span>Vertical Speed</span>
        <span className={safetyTextClass(hasSafetyHud, verticalSafe)}>
          {formatSpeed(focusedLander?.state.velocity.y ?? 0)}
        </span>
        <span>Angle</span>
        <span className={safetyTextClass(hasSafetyHud, angleSafe)}>
          {formatSpeed(focusedLander?.state.angle ?? 0)}
        </span>
      </div>

      {pad && focusedLander?.state.status === "flying" && (
        <div className="pointer-events-none absolute left-1/2 top-[16vh] -translate-x-1/2 text-center text-xs uppercase tracking-[0.32em] opacity-70">
          landing zone {pad.label}
        </div>
      )}

      <button
        type="button"
        className="absolute bottom-3 left-3 z-10 text-left text-[clamp(10px,1vw,14px)] uppercase tracking-[0.28em] text-white/80 transition hover:text-white"
        onClick={() => setShowPhonePanel((current) => !current)}
      >
        Phone QR
      </button>

      <button
        type="button"
        className="absolute bottom-3 left-36 z-10 text-left text-[clamp(10px,1vw,14px)] uppercase tracking-[0.28em] text-white/80 transition hover:text-white"
        onClick={() => setShowBasePanel((current) => !current)}
      >
        Base Ops {bases.length > 0 ? formatMetric(bases.length) : "----"}
      </button>

      <button
        type="button"
        className="absolute bottom-3 left-72 z-10 text-left text-[clamp(10px,1vw,14px)] uppercase tracking-[0.28em] text-white/80 transition hover:text-white"
        onClick={() => void spawnLocalLander(STARTER_BASE_KIT_LANDER_BLUEPRINT.id)}
      >
        Deploy Base Kit
      </button>

      <Link
        href="/labs"
        className="absolute bottom-3 right-3 z-10 text-[clamp(10px,1vw,14px)] uppercase tracking-[0.28em] text-white/80 transition hover:text-white"
      >
        Alex Kafer
      </Link>

      {showPhonePanel && (
        <div className="absolute bottom-12 left-3 z-20 w-80 border border-white bg-black p-4 text-xs uppercase tracking-[0.22em] text-white">
          <p>Phone QR</p>
          <p className="mt-2 leading-relaxed text-white/70">Scan for phone controls.</p>
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
          {controllerUrl && (
            <a
              href={controllerUrl}
              className="mt-3 block break-all border border-white/50 p-2 text-[10px] leading-relaxed hover:bg-white hover:text-black"
            >
              {controllerUrl}
            </a>
          )}
        </div>
      )}

      {showBasePanel && (
        <BaseOpsPanel
          bases={bases}
          stations={stations}
          flights={flights}
          selectedBase={selectedBase}
          selectedCommander={selectedCommander}
          selectedIndex={selectedBaseIndex}
          serverTime={serverTime}
          onSelectPrevious={selectPreviousBase}
          onSelectNext={selectNextBase}
          actionStatus={baseActionStatus}
          onResearchAutomationControl={() =>
            void sendBaseAction("Research automation", "/api/labs/lunar-lander/tech/research", {
              techId: "automation-control",
            })
          }
          onToggleAutomation={(baseId, automationId, enabled) =>
            void sendBaseAction(
              `${enabled ? "Enable" : "Disable"} ${formatAutomationLabel(automationId)}`,
              `/api/labs/lunar-lander/bases/${encodeURIComponent(baseId)}/automations`,
              { automationId, enabled },
            )
          }
          onBuildStorage={(baseId) =>
            void sendBaseAction("Build storage", `/api/labs/lunar-lander/bases/${encodeURIComponent(baseId)}/rooms`, {
              roomId: "storage-bay",
            })
          }
          onBuildMine={(baseId) =>
            void sendBaseAction("Build mine", `/api/labs/lunar-lander/bases/${encodeURIComponent(baseId)}/rooms`, {
              roomId: "regolith-mine",
            })
          }
          onRepair={(baseId) =>
            void sendBaseAction("Repair base", `/api/labs/lunar-lander/bases/${encodeURIComponent(baseId)}/repair`, {
              amount: 20,
            })
          }
          onLaunchToStation={(baseId) =>
            void sendBaseAction(
              "Launch to station",
              `/api/labs/lunar-lander/bases/${encodeURIComponent(baseId)}/ascent`,
              {},
            )
          }
          onTransferMoonToMars={() =>
            void sendBaseAction(
              "Moon-Mars transfer",
              "/api/labs/lunar-lander/stations/moon-orbit/transfer",
              { destinationBodyId: "mars" },
            )
          }
        />
      )}
    </div>
  );
}
