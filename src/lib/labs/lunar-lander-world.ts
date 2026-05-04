import {
  LUNAR_LANDER_PADS,
  LUNAR_TERRAIN_POINTS,
  createInitialLanderState,
  findLandingPad,
  startLander,
  stepLander,
  type LanderFlightStats,
  type LanderInput,
  type LandingPad,
  type LanderState,
  type LanderVector,
  terrainSurfaceY,
} from "./lander";
import {
  DEFAULT_LANDER_BLUEPRINT,
  LUNAR_BODY_DEFINITIONS,
  LUNAR_AUTOMATION_DEFINITIONS,
  LUNAR_ROOM_DEFINITIONS,
  LUNAR_STATIONS,
  LUNAR_TECH_DEFINITIONS,
  STARTER_BASE_KIT_LANDER_BLUEPRINT,
  addResourceMaps,
  createResourceMap,
  deriveLanderStats,
  hasResources,
  type LunarAutomationId,
  type LunarBaseAutomationLogEntry,
  type LunarBaseAutomationState,
  type LunarBaseBuildQueueItem,
  type LunarBase,
  type LunarBaseArea,
  type LunarBaseDamageEvent,
  type LunarBaseProductionJob,
  type LunarBodyId,
  type LunarFlight,
  type LunarLanderBlueprint,
  type LunarLanderComponentId,
  type LunarResourceId,
  type LunarResourceMap,
  type LunarRoomId,
  type LunarStationId,
  type LunarStation,
  type LunarTechId,
} from "./lunar-lander-domain";

export type LunarLanderPilotKind = "desktop" | "phone";

export type LunarLanderWorldControlInput = LanderInput & {
  reset?: boolean;
};

export type LunarLanderWorldLander = {
  id: string;
  label: string;
  commanderId: string;
  bodyId: LunarBodyId;
  blueprintId: string;
  blueprintName: string;
  flightStats: LanderFlightStats;
  installedComponentIds: readonly LunarLanderComponentId[];
  state: LanderState;
  input: LanderInput;
  pilot: LunarLanderPilotKind;
  elapsed: number;
  createdAt: number;
  updatedAt: number;
  inputUpdatedAt: number;
  resolvedAt: number | null;
};

export type LunarLanderCrashEvent = {
  id: string;
  x: number;
  y: number;
  createdAt: number;
};

export type LunarLanderOutpost = {
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

export type LunarLanderCommander = {
  id: string;
  label: string;
  resources: LunarResourceMap;
  unlockedTech: readonly LunarTechId[];
  selectedBlueprintId: string;
  createdAt: number;
  updatedAt: number;
};

export type LunarLanderWorldBody = {
  id: LunarBodyId;
  name: string;
  terrain: LanderVector[];
  crashes: LunarLanderCrashEvent[];
  outposts: LunarLanderOutpost[];
  landingPads: LandingPad[];
  unlocked: boolean;
};

export type LunarLanderSpawnResult = {
  lander: LunarLanderWorldLander;
  controlToken: string;
};

export type LunarLanderActionAuth = {
  landerId: string;
  token: string;
};

export type LunarLanderWorldSnapshot = {
  serverTime: number;
  economyUpdatedAt: number;
  activeBodyId: LunarBodyId;
  terrain: LanderVector[];
  crashes: LunarLanderCrashEvent[];
  outposts: LunarLanderOutpost[];
  landingPads: LandingPad[];
  landers: LunarLanderWorldLander[];
  commanders: LunarLanderCommander[];
  bodies: LunarLanderWorldBody[];
  stations: LunarStation[];
  bases: LunarBase[];
  flights: LunarFlight[];
};

export type SerializedLunarLanderWorldBody = {
  id: LunarBodyId;
  terrain: LanderVector[];
  crashes: LunarLanderCrashEvent[];
  outposts: LunarLanderOutpost[];
  landingPads?: LandingPad[];
};

export type SerializedLunarLanderWorldLander = LunarLanderWorldLander & {
  controlToken: string;
  spawnIndex: number;
  lastSteppedAt: number;
};

export type SerializedLunarLanderWorldState = {
  version: 1;
  activeBodyId: LunarBodyId;
  commanders: LunarLanderCommander[];
  bodies: SerializedLunarLanderWorldBody[];
  stations: LunarStation[];
  bases: LunarBase[];
  flights: LunarFlight[];
  landers: SerializedLunarLanderWorldLander[];
  spawnCount: number;
  worldEventCount: number;
  economyUpdatedAt: number;
};

type StoredLander = LunarLanderWorldLander & {
  controlToken: string;
  spawnIndex: number;
  lastSteppedAt: number;
};

type WorldStoreOptions = {
  now?: () => number;
  createId?: () => string;
  createToken?: () => string;
  createSpawnState?: (spawnIndex: number, stats: LanderFlightStats) => LanderState;
  initialTerrain?: readonly LanderVector[];
  serializedState?: SerializedLunarLanderWorldState;
  blueprints?: readonly LunarLanderBlueprint[] | Readonly<Record<string, LunarLanderBlueprint>>;
  ttlMs?: number;
  maxLanders?: number;
  inputStaleMs?: number;
};

export type LunarBaseActionResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type QueueBaseRoomOptions = {
  position?: { x: number; y: number };
  auth?: LunarLanderActionAuth;
};

export type ResearchTechOptions = {
  auth?: LunarLanderActionAuth;
  commanderId?: string;
};

export type ToggleBaseAutomationOptions = {
  auth?: LunarLanderActionAuth;
};

export type RepairBaseOptions = {
  amount?: number;
  roomInstanceId?: string;
  auth?: LunarLanderActionAuth;
};

export type LaunchBaseAscentOptions = {
  cargo?: LunarResourceMap;
  auth?: LunarLanderActionAuth;
};

export type PlanStationTransferOptions = {
  cargo?: LunarResourceMap;
  auth?: LunarLanderActionAuth;
};

export type LunarTravelRoute = {
  kind: "surface-to-orbit" | "station-to-station";
  originBodyId: LunarBodyId;
  destinationBodyId: LunarBodyId;
  originStationId?: LunarStationId;
  destinationStationId: LunarStationId;
  fuelCost: LunarResourceMap;
  durationMs: number;
};

const DEFAULT_TTL_MS = 1000 * 60 * 2;
const DEFAULT_MAX_LANDERS = 48;
const DEFAULT_INPUT_STALE_MS = 500;
const NEUTRAL_INPUT: LanderInput = { thrust: false, rotate: 0 };
const DEFAULT_COMMANDER_ID = "commander-default";
const DEFAULT_COMMANDER_LABEL = "Commander";
const DEFAULT_COMMANDER_RESOURCES: LunarResourceMap = {
  credits: 1_000,
  fuel: 1_000,
  metal: 250,
  electronics: 90,
  research: 320,
};
const STARTER_BASE_TECH: readonly LunarTechId[] = ["modular-construction", "base-habitat"];
const INTERPLANETARY_TRAVEL_TECH: readonly LunarTechId[] = ["interplanetary-navigation"];
const CRASH_EVENT_TTL_MS = 2800;
const CRATER_RADIUS = 36;
const CRATER_DEPTH = 18;
const LANDING_SMOOTH_HALF_WIDTH = 42;
const LANDING_SMOOTH_TRANSITION = 24;
const OUTPOST_DECK_WIDTH = 44;
const PLATFORM_BUILD_MS = 5000;
const PLATFORM_SIDE_WIDTH = 6;
const ECONOMY_TICK_MS = 1000;
const BASE_ROOM_BUILD_MS = 5000;
const STARTER_BASE_INTEGRITY = 120;
const STARTER_ROOM_INTEGRITY = 100;
const AUTOMATION_WARNING_THROTTLE_MS = 60_000;
const AUTO_MINING_PRODUCTION: LunarResourceMap = { regolith: 1, ore: 0.25 };
const AUTO_REPAIR_AMOUNT = 5;
const ENABLED_AUTOMATION_HANDLERS = new Set<LunarAutomationId>([
  "auto-mining",
  "auto-repair",
  "auto-logistics",
]);
const BASE_FOOTPRINT_WIDTH = 108;
const BASE_FOOTPRINT_HEIGHT = 52;
const LANDING_PAD_HEIGHT = 18;
const BASE_ASCENT_FUEL_COST = 120;
const BASE_ASCENT_DURATION_MS = 60_000;
const STATION_TRANSFER_DURATION_MS = 180_000;
const STATION_TRANSFER_FUEL_COSTS: Readonly<Record<string, number>> = {
  "moon:mars": 260,
  "mars:moon": 260,
  "moon:europa": 320,
  "europa:moon": 320,
  "mars:europa": 220,
  "europa:mars": 220,
};
const MULTIPLIER_PAD_CANDIDATE_CENTERS = [
  -820,
  -520,
  -300,
  180,
  620,
  890,
  1360,
  1520,
] as const;
const LANDER_BLUEPRINTS: Readonly<Record<string, LunarLanderBlueprint>> = {
  [DEFAULT_LANDER_BLUEPRINT.id]: DEFAULT_LANDER_BLUEPRINT,
  [STARTER_BASE_KIT_LANDER_BLUEPRINT.id]: STARTER_BASE_KIT_LANDER_BLUEPRINT,
};

type StoredWorldBody = {
  id: LunarBodyId;
  terrain: LanderVector[];
  crashes: LunarLanderCrashEvent[];
  outposts: LunarLanderOutpost[];
  landingPads: LandingPad[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cloneTerrain(points: readonly LanderVector[]): LanderVector[] {
  return points.map((point) => ({ x: point.x, y: point.y }));
}

function cloneInput(input: LanderInput): LanderInput {
  return {
    thrust: input.thrust,
    rotate: input.rotate,
    ...(input.lateral === undefined ? {} : { lateral: input.lateral }),
  };
}

function cloneLanderState(state: LanderState): LanderState {
  return {
    position: { ...state.position },
    velocity: { ...state.velocity },
    angle: state.angle,
    fuel: state.fuel,
    status: state.status,
  };
}

function cloneFlightStats(stats: LanderFlightStats): LanderFlightStats {
  return { ...stats };
}

function cloneLandingPad(pad: LandingPad): LandingPad {
  return { ...pad };
}

function cloneLandingPads(pads: readonly LandingPad[]): LandingPad[] {
  return pads.map(cloneLandingPad);
}

function cloneResources(resources: LunarResourceMap): LunarResourceMap {
  return createResourceMap(resources);
}

function cloneArea(area: LunarBaseArea): LunarBaseArea {
  return { ...area };
}

function cloneBaseAutomationState(
  automation: Partial<Record<LunarAutomationId, LunarBaseAutomationState>> = {},
): Partial<Record<LunarAutomationId, LunarBaseAutomationState>> {
  return Object.fromEntries(
    Object.entries(automation).map(([automationId, state]) => [
      automationId,
      {
        automationId: state.automationId,
        enabled: state.enabled,
        updatedAt: state.updatedAt,
        lastRanAt: state.lastRanAt,
        lastWarningAt: state.lastWarningAt,
      },
    ]),
  ) as Partial<Record<LunarAutomationId, LunarBaseAutomationState>>;
}

function cloneAutomationLog(
  log: readonly LunarBaseAutomationLogEntry[] = [],
): LunarBaseAutomationLogEntry[] {
  return log.map((entry) => ({ ...entry }));
}

function cloneBase(base: LunarBase): LunarBase {
  const commanderId = "commanderId" in base ? base.commanderId : DEFAULT_COMMANDER_ID;
  const legacyBase = base as LunarBase & {
    automation?: Partial<Record<LunarAutomationId, LunarBaseAutomationState>>;
    automationLog?: readonly LunarBaseAutomationLogEntry[];
  };
  return {
    ...base,
    commanderId,
    position: { ...base.position },
    footprint: cloneArea(base.footprint),
    landingPads: base.landingPads.map(cloneArea),
    rooms: base.rooms.map((room) => ({
      ...room,
      position: { ...room.position },
    })),
    storage: cloneResources(base.storage),
    buildQueue: base.buildQueue.map((item) => ({
      ...item,
      position: { ...item.position },
      cost: cloneResources(item.cost),
    })),
    productionJobs: base.productionJobs.map((job) => ({
      ...job,
      consumesPerTick: cloneResources(job.consumesPerTick),
      productionPerTick: cloneResources(job.productionPerTick),
    })),
    automation: cloneBaseAutomationState(legacyBase.automation),
    automationLog: cloneAutomationLog(legacyBase.automationLog),
    damageEvents: base.damageEvents.map((event) => ({ ...event })),
    shipments: base.shipments.map((shipment) => ({
      ...shipment,
      resources: cloneResources(shipment.resources),
    })),
  };
}

function cloneFlight(flight: LunarFlight): LunarFlight {
  return {
    ...flight,
    fuelCost: cloneResources(flight.fuelCost),
    cargo: cloneResources(flight.cargo),
  };
}

function publicCommander(commander: LunarLanderCommander): LunarLanderCommander {
  return {
    ...commander,
    resources: cloneResources(commander.resources),
    unlockedTech: [...commander.unlockedTech],
  };
}

function createDefaultCommander(initialTime: number): LunarLanderCommander {
  return {
    id: DEFAULT_COMMANDER_ID,
    label: DEFAULT_COMMANDER_LABEL,
    resources: cloneResources(DEFAULT_COMMANDER_RESOURCES),
    unlockedTech: [...STARTER_BASE_TECH],
    selectedBlueprintId: DEFAULT_LANDER_BLUEPRINT.id,
    createdAt: initialTime,
    updatedAt: initialTime,
  };
}

function missingRequiredTech(
  unlockedTech: readonly LunarTechId[],
  requiredTech: readonly LunarTechId[] = [],
): LunarTechId[] {
  return requiredTech.filter((techId) => !unlockedTech.includes(techId));
}

function bodyMissingTech(
  bodyId: LunarBodyId,
  unlockedTech: readonly LunarTechId[],
): LunarTechId[] {
  const definition = LUNAR_BODY_DEFINITIONS[bodyId];
  if (!definition || definition.unlockedByDefault) return [];
  return missingRequiredTech(unlockedTech, definition.requiredTech ?? []);
}

function sameLandingPad(left: LandingPad, right: LandingPad): boolean {
  return (
    left.label === right.label &&
    Math.abs(left.x - right.x) < 0.01 &&
    Math.abs(left.width - right.width) < 0.01
  );
}

function landingPadCenter(pad: LandingPad): number {
  return pad.x + pad.width / 2;
}

function landingPadsOverlap(left: LandingPad, right: LandingPad, margin = 28): boolean {
  return left.x - margin < right.x + right.width && right.x - margin < left.x + left.width;
}

function normalizeTerrain(points: readonly LanderVector[]): LanderVector[] {
  return cloneTerrain(points)
    .sort((left, right) => left.x - right.x)
    .reduce<LanderVector[]>((normalized, point) => {
      const previous = normalized[normalized.length - 1];
      const nextPoint = {
        x: Number(point.x.toFixed(2)),
        y: Number(point.y.toFixed(2)),
      };

      if (previous && Math.abs(previous.x - nextPoint.x) < 0.01) {
        normalized[normalized.length - 1] = nextPoint;
      } else {
        normalized.push(nextPoint);
      }

      return normalized;
    }, []);
}

function replaceTerrainSpan(
  points: readonly LanderVector[],
  startX: number,
  endX: number,
  replacement: readonly LanderVector[],
): LanderVector[] {
  const terrainMinX = points[0].x;
  const terrainMaxX = points[points.length - 1].x;
  const boundedStartX = clamp(Math.min(startX, endX), terrainMinX, terrainMaxX);
  const boundedEndX = clamp(Math.max(startX, endX), terrainMinX, terrainMaxX);

  if (boundedEndX <= boundedStartX) return cloneTerrain(points);

  return normalizeTerrain([
    ...points.filter((point) => point.x < boundedStartX || point.x > boundedEndX),
    { x: boundedStartX, y: terrainSurfaceY(boundedStartX, points) },
    ...replacement.filter((point) => point.x > boundedStartX && point.x < boundedEndX),
    { x: boundedEndX, y: terrainSurfaceY(boundedEndX, points) },
  ]);
}

function applyCrashCrater(points: readonly LanderVector[], impactX: number): LanderVector[] {
  const sampleOffsets = [-0.76, -0.44, 0, 0.44, 0.76];
  const replacement = sampleOffsets.map((offset) => {
    const x = impactX + offset * CRATER_RADIUS;
    const distance = Math.abs(offset);
    const bowl = Math.cos(distance * (Math.PI / 2));
    const rim = distance > 0.58 ? (distance - 0.58) / 0.18 : 0;

    return {
      x,
      y: terrainSurfaceY(x, points) - CRATER_DEPTH * bowl + 5 * rim,
    };
  });

  return replaceTerrainSpan(
    points,
    impactX - CRATER_RADIUS,
    impactX + CRATER_RADIUS,
    replacement,
  );
}

function smoothLandingArea(points: readonly LanderVector[], centerX: number): LanderVector[] {
  const surfaceY = terrainSurfaceY(centerX, points);
  const leftX = centerX - LANDING_SMOOTH_HALF_WIDTH;
  const rightX = centerX + LANDING_SMOOTH_HALF_WIDTH;

  return replaceTerrainSpan(
    points,
    leftX - LANDING_SMOOTH_TRANSITION,
    rightX + LANDING_SMOOTH_TRANSITION,
    [
      { x: leftX, y: surfaceY },
      { x: centerX, y: surfaceY },
      { x: rightX, y: surfaceY },
    ],
  );
}

function applyCompletedPlatform(
  points: readonly LanderVector[],
  outpost: LunarLanderOutpost,
): LanderVector[] {
  const halfWidth = outpost.width / 2;
  const leftX = outpost.x - halfWidth;
  const rightX = outpost.x + halfWidth;

  return replaceTerrainSpan(
    points,
    leftX - PLATFORM_SIDE_WIDTH,
    rightX + PLATFORM_SIDE_WIDTH,
    [
      { x: leftX, y: outpost.deckY },
      { x: outpost.x, y: outpost.deckY },
      { x: rightX, y: outpost.deckY },
    ],
  );
}

function createRandomId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return randomHex(16);
}

function createControlToken(): string {
  return createRandomId();
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random number generation is unavailable.");
  }

  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function publicLander(lander: StoredLander): LunarLanderWorldLander {
  return {
    id: lander.id,
    label: lander.label,
    commanderId: lander.commanderId,
    bodyId: lander.bodyId,
    blueprintId: lander.blueprintId,
    blueprintName: lander.blueprintName,
    flightStats: cloneFlightStats(lander.flightStats),
    installedComponentIds: [...lander.installedComponentIds],
    state: cloneLanderState(lander.state),
    input: cloneInput(lander.input),
    pilot: lander.pilot,
    elapsed: lander.elapsed,
    createdAt: lander.createdAt,
    updatedAt: lander.updatedAt,
    inputUpdatedAt: lander.inputUpdatedAt,
    resolvedAt: lander.resolvedAt,
  };
}

function createDefaultSpawnState(
  spawnIndex: number,
  stats: LanderFlightStats = deriveLanderStats(DEFAULT_LANDER_BLUEPRINT),
): LanderState {
  const base = createInitialLanderState(stats);
  const spawnSlots = [-760, -520, -280, -40, 220, 460, 700, 940, 1180];
  const x = spawnSlots[spawnIndex % spawnSlots.length];
  const wave = Math.floor(spawnIndex / spawnSlots.length);

  return startLander({
    ...base,
    position: {
      x,
      y: base.position.y + (wave % 3) * 34,
    },
    velocity: {
      x: 44 + (spawnIndex % 4) * 8,
      y: -5 - (wave % 2) * 2,
    },
    });
}

function normalizeBlueprints(
  blueprints?: readonly LunarLanderBlueprint[] | Readonly<Record<string, LunarLanderBlueprint>>,
): Readonly<Record<string, LunarLanderBlueprint>> {
  const entries = Array.isArray(blueprints)
    ? blueprints.map((blueprint) => [blueprint.id, blueprint] as const)
    : Object.entries(blueprints ?? {});

  return {
    ...LANDER_BLUEPRINTS,
    ...Object.fromEntries(entries),
  };
}

export function createLunarLanderWorldStore({
  now = () => Date.now(),
  createId = createRandomId,
  createToken = createControlToken,
  createSpawnState = createDefaultSpawnState,
  initialTerrain = LUNAR_TERRAIN_POINTS,
  serializedState,
  blueprints,
  ttlMs = DEFAULT_TTL_MS,
  maxLanders = DEFAULT_MAX_LANDERS,
  inputStaleMs = DEFAULT_INPUT_STALE_MS,
}: WorldStoreOptions = {}) {
  const initialTime = now();
  const landerBlueprints = normalizeBlueprints(blueprints);
  const landers = new Map<string, StoredLander>(
    (serializedState?.landers ?? []).map((lander) => [
      lander.id,
      {
        ...lander,
        state: cloneLanderState(lander.state),
        input: cloneInput(lander.input),
        flightStats: cloneFlightStats(lander.flightStats),
        installedComponentIds: [...lander.installedComponentIds],
      },
    ]),
  );
  const commanders = new Map<string, LunarLanderCommander>(
    (serializedState?.commanders ?? [createDefaultCommander(initialTime)]).map((commander) => [
      commander.id,
      publicCommander(commander),
    ]),
  );
  if (commanders.size === 0) {
    commanders.set(DEFAULT_COMMANDER_ID, createDefaultCommander(initialTime));
  }
  const bodies = new Map<LunarBodyId, StoredWorldBody>();
  for (const bodyDefinition of Object.values(LUNAR_BODY_DEFINITIONS)) {
    bodies.set(bodyDefinition.id, {
      id: bodyDefinition.id,
      terrain: cloneTerrain(initialTerrain),
      crashes: [],
      outposts: [],
      landingPads: cloneLandingPads(LUNAR_LANDER_PADS),
    });
  }
  for (const body of serializedState?.bodies ?? []) {
    bodies.set(body.id, {
      id: body.id,
      terrain: cloneTerrain(body.terrain),
      crashes: body.crashes.map((crash) => ({ ...crash })),
      outposts: body.outposts.map((outpost) => ({ ...outpost })),
      landingPads: cloneLandingPads(body.landingPads ?? LUNAR_LANDER_PADS),
    });
  }
  const stations: LunarStation[] = (serializedState?.stations ?? Object.values(LUNAR_STATIONS)).map(
    (station) => ({
      ...station,
      rooms: [...station.rooms],
      storage: cloneResources(station.storage),
    }),
  );
  const bases: LunarBase[] = (serializedState?.bases ?? []).map(cloneBase);
  const flights: LunarFlight[] = (serializedState?.flights ?? []).map(cloneFlight);
  const activeBodyId: LunarBodyId = serializedState?.activeBodyId ?? "moon";
  let spawnCount = serializedState?.spawnCount ?? landers.size;
  let worldEventCount = serializedState?.worldEventCount ?? 0;
  let economyUpdatedAt = serializedState?.economyUpdatedAt ?? initialTime;

  function activeBody(): StoredWorldBody {
    return bodyState(activeBodyId);
  }

  function bodyState(bodyId: LunarBodyId): StoredWorldBody {
    let body = bodies.get(bodyId);
    if (!body) {
      body = {
        id: bodyId,
        terrain: cloneTerrain(initialTerrain),
        crashes: [],
        outposts: [],
        landingPads: cloneLandingPads(LUNAR_LANDER_PADS),
      };
      bodies.set(bodyId, body);
    }
    return body;
  }

  function createWorldEventId(prefix: string): string {
    worldEventCount += 1;
    return `${prefix}-${worldEventCount.toString().padStart(3, "0")}`;
  }

  function replacementMultiplierPad(body: StoredWorldBody, claimedPad: LandingPad): LandingPad {
    const terrainMinX = body.terrain[0].x;
    const terrainMaxX = body.terrain[body.terrain.length - 1].x;
    const activePads = body.landingPads.filter((pad) => !sameLandingPad(pad, claimedPad));
    const claimedCenter = landingPadCenter(claimedPad);
    const seed =
      Math.abs(Math.round(claimedCenter + worldEventCount * 37)) %
      MULTIPLIER_PAD_CANDIDATE_CENTERS.length;

    for (let offset = 0; offset < MULTIPLIER_PAD_CANDIDATE_CENTERS.length; offset += 1) {
      const center = MULTIPLIER_PAD_CANDIDATE_CENTERS[
        (seed + offset) % MULTIPLIER_PAD_CANDIDATE_CENTERS.length
      ];
      const candidate: LandingPad = {
        ...claimedPad,
        x: clamp(center - claimedPad.width / 2, terrainMinX, terrainMaxX - claimedPad.width),
      };
      const isElsewhere = Math.abs(landingPadCenter(candidate) - claimedCenter) > claimedPad.width;
      const overlapsActivePad = activePads.some((pad) => landingPadsOverlap(candidate, pad));
      const overlapsOutpost = body.outposts.some((outpost) => {
        const outpostPad = {
          x: outpost.x - outpost.width / 2,
          width: outpost.width,
          label: "outpost",
          multiplier: 1,
        };
        return landingPadsOverlap(candidate, outpostPad, 40);
      });

      if (isElsewhere && !overlapsActivePad && !overlapsOutpost) return candidate;
    }

    const fallbackCenter = clamp(
      claimedCenter + claimedPad.width * 3,
      terrainMinX + claimedPad.width / 2,
      terrainMaxX - claimedPad.width / 2,
    );
    return { ...claimedPad, x: fallbackCenter - claimedPad.width / 2 };
  }

  function claimMultiplierPad(body: StoredWorldBody, claimedPad: LandingPad): void {
    const replacement = replacementMultiplierPad(body, claimedPad);
    body.landingPads = [
      ...body.landingPads.filter((pad) => !sameLandingPad(pad, claimedPad)),
      replacement,
    ].sort((left, right) => left.x - right.x);
    body.terrain = smoothLandingArea(body.terrain, landingPadCenter(replacement));
  }

  function appendAutomationLog(
    base: LunarBase,
    automationId: LunarAutomationId,
    message: string,
    currentTime: number,
  ): void {
    const entry: LunarBaseAutomationLogEntry = {
      id: createWorldEventId("automation"),
      createdAt: currentTime,
      automationId,
      message,
    };
    base.automationLog = [...base.automationLog, entry].slice(-30);
  }

  function logAutomationWarning(
    base: LunarBase,
    state: LunarBaseAutomationState,
    message: string,
    currentTime: number,
  ): void {
    if (
      state.lastWarningAt !== null &&
      currentTime - state.lastWarningAt < AUTOMATION_WARNING_THROTTLE_MS
    ) {
      return;
    }

    state.lastWarningAt = currentTime;
    appendAutomationLog(base, state.automationId, message, currentTime);
  }

  function spendResources(
    storage: LunarResourceMap,
    cost: LunarResourceMap,
  ): LunarBaseActionResult<LunarResourceMap> {
    if (
      Object.values(cost).some(
        (amount) => typeof amount !== "number" || !Number.isFinite(amount) || amount < 0,
      )
    ) {
      return { ok: false, error: "Invalid resource cost" };
    }
    if (!hasResources(storage, cost)) return { ok: false, error: "Insufficient resources" };

    const spent = Object.fromEntries(
      Object.entries(cost).map(([resourceId, amount]) => [resourceId, -amount]),
    ) as LunarResourceMap;
    return { ok: true, value: addResourceMaps(storage, spent) };
  }

  function commanderResourceNetwork(commander: LunarLanderCommander): LunarResourceMap {
    return addResourceMaps(
      commander.resources,
      ...bases
        .filter((base) => base.commanderId === commander.id)
        .map((base) => base.storage),
    );
  }

  function consumeResource(
    storage: LunarResourceMap,
    resourceId: LunarResourceId,
    amount: number,
  ): { storage: LunarResourceMap; remaining: number } {
    if (amount <= 0) return { storage, remaining: 0 };

    const available = Math.max(0, storage[resourceId] ?? 0);
    const consumed = Math.min(available, amount);
    if (consumed <= 0) return { storage, remaining: amount };

    return {
      storage: addResourceMaps(storage, { [resourceId]: -consumed }),
      remaining: amount - consumed,
    };
  }

  function spendCommanderNetworkResources(
    commander: LunarLanderCommander,
    cost: LunarResourceMap,
  ): LunarBaseActionResult<null> {
    if (
      Object.values(cost).some(
        (amount) => typeof amount !== "number" || !Number.isFinite(amount) || amount < 0,
      )
    ) {
      return { ok: false, error: "Invalid resource cost" };
    }
    if (!hasResources(commanderResourceNetwork(commander), cost)) {
      return { ok: false, error: "Insufficient resources" };
    }

    const ownedBases = bases.filter((base) => base.commanderId === commander.id);
    for (const [resourceId, amount] of Object.entries(cost) as [LunarResourceId, number][]) {
      let remaining = amount;
      const commanderSpend = consumeResource(commander.resources, resourceId, remaining);
      commander.resources = commanderSpend.storage;
      remaining = commanderSpend.remaining;

      for (const base of ownedBases) {
        if (remaining <= 0) break;
        const baseSpend = consumeResource(base.storage, resourceId, remaining);
        base.storage = baseSpend.storage;
        remaining = baseSpend.remaining;
      }
    }

    return { ok: true, value: null };
  }

  function grantCommanderTech(
    commander: LunarLanderCommander,
    techIds: readonly LunarTechId[],
    currentTime: number,
  ): void {
    const nextTech = new Set(commander.unlockedTech);
    for (const techId of techIds) {
      if (LUNAR_TECH_DEFINITIONS[techId]) nextTech.add(techId);
    }
    if (nextTech.size === commander.unlockedTech.length) return;
    commander.unlockedTech = Array.from(nextTech);
    commander.updatedAt = currentTime;
  }

  function commanderCanUseStationTransfer(
    commander: LunarLanderCommander,
    destinationBodyId: LunarBodyId,
  ): LunarBaseActionResult<null> {
    const missingTravelTech = missingRequiredTech(
      commander.unlockedTech,
      INTERPLANETARY_TRAVEL_TECH,
    );
    if (missingTravelTech.length > 0) {
      return { ok: false, error: `Missing required tech: ${missingTravelTech.join(", ")}` };
    }

    const missingBodyTech = bodyMissingTech(destinationBodyId, commander.unlockedTech);
    if (missingBodyTech.length > 0) {
      return { ok: false, error: `Destination body locked: ${missingBodyTech.join(", ")}` };
    }

    return { ok: true, value: null };
  }

  function resolveCommanderForAction(
    options: ResearchTechOptions = {},
  ): LunarBaseActionResult<LunarLanderCommander> {
    if (options.commanderId) {
      const commander = commanders.get(options.commanderId);
      return commander ? { ok: true, value: commander } : { ok: false, error: "Unknown commander" };
    }
    if (options.auth) {
      const authorized = authorizeLanderAction(options.auth);
      if (!authorized.ok) return authorized;
      const commander = commanders.get(authorized.value.commanderId);
      return commander ? { ok: true, value: commander } : { ok: false, error: "Unknown commander" };
    }

    return { ok: false, error: "Missing commander auth" };
  }

  function validateCargo(cargo: LunarResourceMap = {}): LunarBaseActionResult<LunarResourceMap> {
    if (
      Object.values(cargo).some(
        (amount) => typeof amount !== "number" || !Number.isFinite(amount) || amount < 0,
      )
    ) {
      return { ok: false, error: "Invalid cargo" };
    }

    return { ok: true, value: cloneResources(cargo) };
  }

  function stationById(stationId: LunarStationId): LunarStation | null {
    return stations.find((station) => station.id === stationId) ?? null;
  }

  function orbitalStationForBody(bodyId: LunarBodyId): LunarStation | null {
    const stationId = LUNAR_BODY_DEFINITIONS[bodyId]?.stationId;
    return stationId ? stationById(stationId) : null;
  }

  function stationTransferFuelCost(originBodyId: LunarBodyId, destinationBodyId: LunarBodyId): number {
    if (originBodyId === destinationBodyId) return 0;
    return STATION_TRANSFER_FUEL_COSTS[`${originBodyId}:${destinationBodyId}`] ?? 300;
  }

  function hasDockingReservation(station: LunarStation): boolean {
    const inboundActiveFlights = flights.filter(
      (flight) => flight.status === "active" && flight.destinationStationId === station.id,
    ).length;
    return inboundActiveFlights < station.dockingPads;
  }

  function readAvailableTravelRoutes(originStationId?: LunarStationId): LunarTravelRoute[] {
    const routeCommanders = Array.from(commanders.values());
    const stationRoutes = stations.flatMap((originStation) =>
      stations
        .filter((destinationStation) => destinationStation.id !== originStation.id)
        .filter((destinationStation) =>
          routeCommanders.some(
            (commander) => commanderCanUseStationTransfer(commander, destinationStation.bodyId).ok,
          ),
        )
        .map((destinationStation) => ({
          kind: "station-to-station" as const,
          originBodyId: originStation.bodyId,
          destinationBodyId: destinationStation.bodyId,
          originStationId: originStation.id,
          destinationStationId: destinationStation.id,
          fuelCost: { fuel: stationTransferFuelCost(originStation.bodyId, destinationStation.bodyId) },
          durationMs: STATION_TRANSFER_DURATION_MS,
        })),
    );

    return originStationId
      ? stationRoutes.filter((route) => route.originStationId === originStationId)
      : stationRoutes;
  }

  function createRoomInstance(
    roomId: LunarRoomId,
    position: { x: number; y: number },
    integrity = STARTER_ROOM_INTEGRITY,
  ) {
    return {
      instanceId: createWorldEventId("room"),
      roomId,
      position: { ...position },
      integrity,
      maxIntegrity: STARTER_ROOM_INTEGRITY,
      assignedCrew: 0,
    };
  }

  function productionJobForRoom(
    roomInstanceId: string,
    roomId: LunarRoomId,
    currentTime: number,
  ): LunarBaseProductionJob | null {
    const definition = LUNAR_ROOM_DEFINITIONS[roomId];
    if (!definition.productionPerTick) return null;

    return {
      id: createWorldEventId("production"),
      roomInstanceId,
      roomId,
      consumesPerTick: cloneResources(definition.consumesPerTick ?? {}),
      productionPerTick: cloneResources(definition.productionPerTick),
      lastProducedAt: currentTime,
      producedTicks: 0,
    };
  }

  function addProductionJobForRoom(base: LunarBase, roomInstanceId: string, roomId: LunarRoomId, currentTime: number): void {
    const job = productionJobForRoom(roomInstanceId, roomId, currentTime);
    if (job) {
      base.productionJobs = [...base.productionJobs, job];
    }
  }

  function createBaseFromLanding(
    lander: StoredLander,
    landingX: number,
    deckY: number,
    currentTime: number,
  ): LunarBase {
    const halfWidth = BASE_FOOTPRINT_WIDTH / 2;
    const landingPad: LunarBaseArea = {
      x: landingX - OUTPOST_DECK_WIDTH / 2,
      y: deckY,
      width: OUTPOST_DECK_WIDTH,
      height: LANDING_PAD_HEIGHT,
    };
    const commandHabitat = createRoomInstance("command-habitat", { x: landingX - 18, y: deckY });
    const starterPad = createRoomInstance("landing-pad", { x: landingX + 18, y: deckY });
    const blueprint = landerBlueprints[lander.blueprintId] ?? DEFAULT_LANDER_BLUEPRINT;
    const commander = commanders.get(lander.commanderId);
    if (commander) grantCommanderTech(commander, STARTER_BASE_TECH, currentTime);
    const productionJobs = [commandHabitat, starterPad]
      .map((room) => productionJobForRoom(room.instanceId, room.roomId, currentTime))
      .filter((job): job is LunarBaseProductionJob => Boolean(job));

    return {
      id: createWorldEventId("base"),
      name: `${blueprint.name} base`,
      commanderId: lander.commanderId,
      bodyId: lander.bodyId,
      position: { x: landingX, y: deckY },
      integrity: STARTER_BASE_INTEGRITY,
      maxIntegrity: STARTER_BASE_INTEGRITY,
      footprint: {
        x: landingX - halfWidth,
        y: deckY - BASE_FOOTPRINT_HEIGHT / 2,
        width: BASE_FOOTPRINT_WIDTH,
        height: BASE_FOOTPRINT_HEIGHT,
      },
      landingPads: [landingPad],
      rooms: [commandHabitat, starterPad],
      storage: cloneResources(blueprint.cargo ?? {}),
      buildQueue: [],
      productionJobs,
      automation: {},
      automationLog: [],
      damageEvents: [],
      shipments: [],
      economyUpdatedAt: currentTime,
    };
  }

  function impactIntersectsBase(base: LunarBase, bodyId: LunarBodyId, impactX: number): boolean {
    if (base.bodyId !== bodyId) return false;
    const inFootprint = impactX >= base.footprint.x && impactX <= base.footprint.x + base.footprint.width;
    const inPad = base.landingPads.some(
      (pad) => impactX >= pad.x && impactX <= pad.x + pad.width,
    );
    return inFootprint || inPad;
  }

  function damageBaseFromCrash(
    base: LunarBase,
    lander: StoredLander,
    currentTime: number,
  ): void {
    const impactSpeed = Math.hypot(lander.state.velocity.x, lander.state.velocity.y);
    const impactMass = Math.max(1, Number("mass" in lander.flightStats ? lander.flightStats.mass : 1));
    const amount = Math.max(1, Math.round((impactSpeed * impactMass) / 180));
    const integrityBefore = base.integrity;
    base.integrity = Math.max(0, base.integrity - amount);

    let damagedRoomInstanceId: string | null = null;
    const damagedRoom = base.rooms.find((room) => room.integrity > 0);
    if (damagedRoom) {
      damagedRoomInstanceId = damagedRoom.instanceId;
      damagedRoom.integrity = Math.max(0, damagedRoom.integrity - Math.ceil(amount / 2));
    }

    const event: LunarBaseDamageEvent = {
      id: createWorldEventId("damage"),
      createdAt: currentTime,
      amount,
      integrityBefore,
      integrityAfter: base.integrity,
      impactSpeed,
      impactMass,
      roomInstanceId: damagedRoomInstanceId,
    };
    base.damageEvents = [...base.damageEvents, event].slice(-20);
  }

  function cleanupCrashEvents(currentTime = now(), body = activeBody()): void {
    body.crashes = body.crashes.filter(
      (crash) => currentTime - crash.createdAt <= CRASH_EVENT_TTL_MS,
    );
  }

  function cleanupAllCrashEvents(currentTime = now()): void {
    bodies.forEach((body) => cleanupCrashEvents(currentTime, body));
  }

  function completeBaseBuilds(currentTime: number): void {
    for (const base of bases) {
      const completed = base.buildQueue.filter((item) => item.completesAt <= currentTime);
      if (completed.length === 0) continue;

      for (const item of completed) {
        const room = createRoomInstance(item.roomId, item.position);
        base.rooms = [...base.rooms, room];
        addProductionJobForRoom(base, room.instanceId, room.roomId, currentTime);
      }
      base.buildQueue = base.buildQueue.filter((item) => item.completesAt > currentTime);
    }
  }

  function completeArrivedFlights(currentTime: number): void {
    for (const flight of flights) {
      if (flight.status !== "active" || currentTime < flight.arrivesAt) continue;

      if (flight.destinationStationId) {
        const station = stationById(flight.destinationStationId);
        if (station) station.storage = addResourceMaps(station.storage, flight.cargo);
      } else if (flight.destinationBaseId) {
        const base = bases.find((candidate) => candidate.id === flight.destinationBaseId);
        if (base) base.storage = addResourceMaps(base.storage, flight.cargo);
      }

      flight.status = "arrived";
    }
  }

  function hasRequiredAutomationRooms(base: LunarBase, automationId: LunarAutomationId): boolean {
    const definition = LUNAR_AUTOMATION_DEFINITIONS[automationId];
    return definition.requiredRooms.every((roomId) =>
      base.rooms.some((room) => room.roomId === roomId && room.integrity > 0),
    );
  }

  function consumeAutomationUpkeep(
    base: LunarBase,
    state: LunarBaseAutomationState,
    currentTime: number,
    extraCost: LunarResourceMap = {},
  ): boolean {
    const definition = LUNAR_AUTOMATION_DEFINITIONS[state.automationId];
    if (!hasRequiredAutomationRooms(base, state.automationId)) {
      logAutomationWarning(base, state, `${definition.name} paused: required room offline.`, currentTime);
      return false;
    }

    const cost = addResourceMaps(definition.upkeepPerTick, extraCost);
    const spent = spendResources(base.storage, cost);
    if (!spent.ok) {
      logAutomationWarning(base, state, `${definition.name} paused: ${spent.error.toLowerCase()}.`, currentTime);
      return false;
    }

    base.storage = spent.value;
    state.lastRanAt = currentTime;
    return true;
  }

  function tickAutoMining(
    base: LunarBase,
    state: LunarBaseAutomationState,
    currentTime: number,
  ): void {
    if (!consumeAutomationUpkeep(base, state, currentTime)) return;
    base.storage = addResourceMaps(base.storage, AUTO_MINING_PRODUCTION);
  }

  function tickAutoRepair(
    base: LunarBase,
    state: LunarBaseAutomationState,
    currentTime: number,
  ): void {
    const room = base.rooms.find((candidate) => candidate.integrity < candidate.maxIntegrity);
    const baseRepair = Math.min(AUTO_REPAIR_AMOUNT, base.maxIntegrity - base.integrity);
    const roomRepair = room ? Math.min(AUTO_REPAIR_AMOUNT, room.maxIntegrity - room.integrity) : 0;
    if (baseRepair <= 0 && roomRepair <= 0) return;

    if (!consumeAutomationUpkeep(base, state, currentTime, { metal: 1 })) return;
    base.integrity += baseRepair;
    if (room) room.integrity += roomRepair;
  }

  function tickAutoLogistics(
    base: LunarBase,
    state: LunarBaseAutomationState,
    currentTime: number,
  ): void {
    if (!hasRequiredAutomationRooms(base, state.automationId)) {
      logAutomationWarning(base, state, "Automated logistics paused: required room offline.", currentTime);
      return;
    }
    if (
      state.lastRanAt === null ||
      currentTime - state.lastRanAt >= AUTOMATION_WARNING_THROTTLE_MS
    ) {
      appendAutomationLog(base, state.automationId, "Automated logistics ready; shipments require a future planner.", currentTime);
    }
    state.lastRanAt = currentTime;
  }

  function tickBaseAutomation(base: LunarBase, currentTime: number): void {
    for (const state of Object.values(base.automation)) {
      if (!state?.enabled) continue;

      if (state.automationId === "auto-mining") {
        tickAutoMining(base, state, currentTime);
      } else if (state.automationId === "auto-repair") {
        tickAutoRepair(base, state, currentTime);
      } else if (state.automationId === "auto-logistics") {
        tickAutoLogistics(base, state, currentTime);
      } else {
        logAutomationWarning(base, state, "Automation paused: runtime handler is not implemented.", currentTime);
      }
    }
  }

  function tickBaseEconomy(currentTime: number): void {
    for (const base of bases) {
      if (currentTime <= base.economyUpdatedAt) continue;

      const ticks = Math.floor((currentTime - base.economyUpdatedAt) / ECONOMY_TICK_MS);
      if (ticks <= 0) continue;

      for (let tick = 0; tick < ticks; tick += 1) {
        for (const job of base.productionJobs) {
          const room = base.rooms.find((candidate) => candidate.instanceId === job.roomInstanceId);
          if (!room || room.integrity <= 0) continue;
          if (!hasResources(base.storage, job.consumesPerTick)) continue;

          const consumed = Object.fromEntries(
            Object.entries(job.consumesPerTick).map(([resourceId, amount]) => [
              resourceId,
              -amount,
            ]),
          ) as LunarResourceMap;
          base.storage = addResourceMaps(base.storage, consumed, job.productionPerTick);
          job.producedTicks += 1;
          job.lastProducedAt = base.economyUpdatedAt + (tick + 1) * ECONOMY_TICK_MS;
        }
        tickBaseAutomation(base, base.economyUpdatedAt + (tick + 1) * ECONOMY_TICK_MS);
      }
      base.economyUpdatedAt += ticks * ECONOMY_TICK_MS;
    }

    economyUpdatedAt = currentTime;
  }

  function recordCrash(
    body: StoredWorldBody,
    lander: StoredLander,
    state: LanderState,
    currentTime: number,
  ): void {
    const impactX = state.position.x;
    const impactY = terrainSurfaceY(impactX, body.terrain);

    body.terrain = applyCrashCrater(body.terrain, impactX);
    body.crashes.push({
      id: createWorldEventId("crash"),
      x: impactX,
      y: impactY,
      createdAt: currentTime,
    });
    bases
      .filter((base) => impactIntersectsBase(base, lander.bodyId, impactX))
      .forEach((base) => damageBaseFromCrash(base, lander, currentTime));
    cleanupCrashEvents(currentTime, body);
  }

  function recordLanding(
    body: StoredWorldBody,
    lander: StoredLander,
    state: LanderState,
    currentTime: number,
  ): void {
    const landingX = state.position.x;
    const claimedPad = findLandingPad(landingX, body.landingPads);
    const claimedMultiplierPad =
      claimedPad && claimedPad.multiplier > 1 ? cloneLandingPad(claimedPad) : null;

    body.terrain = smoothLandingArea(body.terrain, landingX);
    const halfWidth = OUTPOST_DECK_WIDTH / 2;
    body.outposts.push({
      id: createWorldEventId("outpost"),
      x: landingX,
      surfaceY: terrainSurfaceY(landingX, body.terrain),
      leftSupportY: terrainSurfaceY(landingX - halfWidth, body.terrain),
      rightSupportY: terrainSurfaceY(landingX + halfWidth, body.terrain),
      deckY: state.position.y + 12,
      width: OUTPOST_DECK_WIDTH,
      claimedPad: claimedMultiplierPad,
      createdAt: currentTime,
      terrainAppliedAt: null,
    });
    if (claimedMultiplierPad) claimMultiplierPad(body, claimedMultiplierPad);
    if (lander.flightStats.baseKitCapacity > 0) {
      bases.push(createBaseFromLanding(lander, landingX, state.position.y + 12, currentTime));
    }
  }

  function completeBuiltPlatforms(currentTime: number, body?: StoredWorldBody): void {
    const targetBodies = body ? [body] : Array.from(bodies.values());
    targetBodies.forEach((targetBody) => {
      targetBody.outposts.forEach((outpost) => {
        if (outpost.terrainAppliedAt || currentTime - outpost.createdAt < PLATFORM_BUILD_MS) return;

        targetBody.terrain = applyCompletedPlatform(targetBody.terrain, outpost);
        outpost.terrainAppliedAt = currentTime;
      });
    });
  }

  function landingPads(body: StoredWorldBody): readonly LandingPad[] {
    const completedPlatforms = body.outposts
      .filter((outpost) => outpost.terrainAppliedAt)
      .map((outpost) => ({
        x: outpost.x - outpost.width / 2,
        width: outpost.width,
        label: "1x",
        multiplier: 1,
      }));

    return [...body.landingPads, ...completedPlatforms];
  }

  function resolveTerminalLander(lander: StoredLander, state: LanderState, currentTime: number): void {
    if (lander.resolvedAt || state.status === "flying") return;

    const body = bodyState(lander.bodyId);
    lander.resolvedAt = currentTime;
    if (state.status === "crashed") {
      recordCrash(body, lander, state, currentTime);
    } else if (state.status === "landed") {
      recordLanding(body, lander, state, currentTime);
    }
  }

  function stepStoredLander(lander: StoredLander, currentTime: number): void {
    if (currentTime <= lander.lastSteppedAt) return;

    const body = bodyState(lander.bodyId);
    let simulatedAt = lander.lastSteppedAt;
    const inputStaleAt = lander.inputUpdatedAt + inputStaleMs;

    while (simulatedAt < currentTime) {
      const input = simulatedAt < inputStaleAt ? lander.input : NEUTRAL_INPUT;
      const boundary = input === lander.input ? Math.min(currentTime, inputStaleAt) : currentTime;
      const dtMs = Math.min(boundary - simulatedAt, 80);
      const dt = dtMs / 1000;
      const nextState = stepLander(
        lander.state,
        input,
        dt,
        landingPads(body),
        body.terrain,
        lander.flightStats,
      );
      if (nextState.status === "flying") {
        lander.elapsed += dt;
      }
      lander.state = nextState;
      simulatedAt += dtMs;
      if (nextState.status !== "flying") {
        resolveTerminalLander(lander, nextState, currentTime);
        break;
      }
    }

    lander.lastSteppedAt = currentTime;
  }

  function stepWorld(currentTime = now()): void {
    completeBuiltPlatforms(currentTime);
    tickBaseEconomy(currentTime);
    completeBaseBuilds(currentTime);
    completeArrivedFlights(currentTime);
    landers.forEach((lander) => stepStoredLander(lander, currentTime));
  }

  function cleanupExpired(currentTime = now()): void {
    landers.forEach((lander, id) => {
      if (currentTime - lander.updatedAt > ttlMs) {
        landers.delete(id);
      }
    });
  }

  function evictOldestUntilRoom(): void {
    while (landers.size >= maxLanders) {
      let oldestId: string | null = null;
      let oldestUpdatedAt = Number.POSITIVE_INFINITY;

      landers.forEach((lander, id) => {
        if (lander.updatedAt < oldestUpdatedAt) {
          oldestUpdatedAt = lander.updatedAt;
          oldestId = id;
        }
      });

      if (!oldestId) return;
      landers.delete(oldestId);
    }
  }

  function selectedBlueprint(
    commander: LunarLanderCommander,
    blueprintId?: string,
  ): LunarLanderBlueprint {
    if (blueprintId) return landerBlueprints[blueprintId] ?? DEFAULT_LANDER_BLUEPRINT;
    return landerBlueprints[commander.selectedBlueprintId] ?? DEFAULT_LANDER_BLUEPRINT;
  }

  function hasLanderBlueprint(blueprintId: string): boolean {
    return Boolean(landerBlueprints[blueprintId]);
  }

  function authorizeLanderAction(auth: LunarLanderActionAuth): LunarBaseActionResult<{ commanderId: string }> {
    const currentTime = now();
    cleanupExpired(currentTime);
    const lander = landers.get(auth.landerId);
    if (!lander || lander.controlToken !== auth.token) return { ok: false, error: "Unauthorized" };
    return { ok: true, value: { commanderId: lander.commanderId } };
  }

  function authorizeBaseAction(base: LunarBase, auth?: LunarLanderActionAuth): LunarBaseActionResult<null> {
    if (!auth) return { ok: true, value: null };
    const authorized = authorizeLanderAction(auth);
    if (!authorized.ok) return authorized;
    if (base.commanderId !== authorized.value.commanderId) return { ok: false, error: "Forbidden" };
    return { ok: true, value: null };
  }

  function unlockedTechIds(): Set<LunarTechId> {
    return new Set(Array.from(commanders.values()).flatMap((commander) => commander.unlockedTech));
  }

  function spawnLander(
    pilot: LunarLanderPilotKind = "desktop",
    options: { blueprintId?: string } = {},
  ): LunarLanderSpawnResult {
    const currentTime = now();
    cleanupExpired(currentTime);
    stepWorld(currentTime);
    cleanupAllCrashEvents(currentTime);
    evictOldestUntilRoom();

    const commander = commanders.get(DEFAULT_COMMANDER_ID) ?? Array.from(commanders.values())[0];
    const blueprint = selectedBlueprint(commander, options.blueprintId);
    const flightStats = deriveLanderStats(blueprint);
    const spawnIndex = spawnCount;
    spawnCount += 1;
    const id = createId();
    const state = createSpawnState(spawnIndex, flightStats);
    const lander: StoredLander = {
      id,
      label: `L-${(spawnIndex + 1).toString().padStart(2, "0")}`,
      commanderId: commander.id,
      bodyId: activeBodyId,
      blueprintId: blueprint.id,
      blueprintName: blueprint.name,
      flightStats,
      installedComponentIds: [...blueprint.componentIds],
      state,
      input: cloneInput(NEUTRAL_INPUT),
      pilot,
      elapsed: 0,
      createdAt: currentTime,
      updatedAt: currentTime,
      inputUpdatedAt: 0,
      resolvedAt: null,
      controlToken: createToken(),
      spawnIndex,
      lastSteppedAt: currentTime,
    };

    landers.set(id, lander);

    return {
      lander: publicLander(lander),
      controlToken: lander.controlToken,
    };
  }

  function readWorldSnapshot(): LunarLanderWorldSnapshot {
    const currentTime = now();
    cleanupExpired(currentTime);
    stepWorld(currentTime);
    cleanupAllCrashEvents(currentTime);
    const body = activeBody();
    const unlockedTech = unlockedTechIds();

    return {
      serverTime: currentTime,
      economyUpdatedAt,
      activeBodyId,
      terrain: cloneTerrain(body.terrain),
      crashes: body.crashes.map((crash) => ({ ...crash })),
      outposts: body.outposts.map((outpost) => ({ ...outpost })),
      landingPads: cloneLandingPads(body.landingPads),
      landers: Array.from(landers.values()).map(publicLander),
      commanders: Array.from(commanders.values()).map(publicCommander),
      bodies: Array.from(bodies.values()).map((worldBody) => {
        const definition = LUNAR_BODY_DEFINITIONS[worldBody.id];
        return {
          id: worldBody.id,
          name: definition.name,
          terrain: cloneTerrain(worldBody.terrain),
          crashes: worldBody.crashes.map((crash) => ({ ...crash })),
          outposts: worldBody.outposts.map((outpost) => ({ ...outpost })),
          landingPads: cloneLandingPads(worldBody.landingPads),
          unlocked:
            definition.unlockedByDefault ||
            (definition.requiredTech ?? []).every((techId) => unlockedTech.has(techId)),
        };
      }),
      stations: stations.map((station) => ({
        ...station,
        rooms: [...station.rooms],
        storage: cloneResources(station.storage),
      })),
      bases: bases.map(cloneBase),
      flights: flights.map(cloneFlight),
    };
  }

  function writeControl(
    id: string,
    controlToken: string,
    input: LunarLanderWorldControlInput,
  ): LunarLanderWorldLander | null {
    const currentTime = now();
    cleanupExpired(currentTime);
    cleanupAllCrashEvents(currentTime);

    const lander = landers.get(id);
    if (!lander || lander.controlToken !== controlToken) return null;
    completeBuiltPlatforms(currentTime, bodyState(lander.bodyId));
    tickBaseEconomy(currentTime);
    completeBaseBuilds(currentTime);
    stepStoredLander(lander, currentTime);

    if (input.reset) {
      lander.state = createSpawnState(lander.spawnIndex, lander.flightStats);
      lander.elapsed = 0;
      lander.resolvedAt = null;
      lander.lastSteppedAt = currentTime;
    }

    lander.input = {
      thrust: Boolean(input.thrust),
      rotate: clamp(Number(input.rotate) || 0, -1, 1),
      ...(input.lateral === undefined
        ? {}
        : { lateral: clamp(Number(input.lateral) || 0, -1, 1) }),
    };
    lander.inputUpdatedAt = currentTime;
    lander.updatedAt = currentTime;

    return publicLander(lander);
  }

  function researchTech(
    techId: LunarTechId,
    options: ResearchTechOptions = {},
  ): LunarBaseActionResult<LunarLanderCommander> {
    const currentTime = now();
    cleanupExpired(currentTime);
    stepWorld(currentTime);

    const definition = LUNAR_TECH_DEFINITIONS[techId];
    if (!definition) return { ok: false, error: "Unknown tech" };

    const commanderResult = resolveCommanderForAction(options);
    if (!commanderResult.ok) return commanderResult;
    const commander = commanderResult.value;
    if (commander.unlockedTech.includes(techId)) return { ok: false, error: "Tech already researched" };

    const missingPrerequisites = missingRequiredTech(
      commander.unlockedTech,
      definition.prerequisites ?? [],
    );
    if (missingPrerequisites.length > 0) {
      return { ok: false, error: `Missing prerequisite tech: ${missingPrerequisites.join(", ")}` };
    }

    const spent = spendCommanderNetworkResources(commander, definition.cost);
    if (!spent.ok) return { ok: false, error: spent.error };

    commander.unlockedTech = [...commander.unlockedTech, techId];
    commander.updatedAt = currentTime;

    return { ok: true, value: publicCommander(commander) };
  }

  function toggleBaseAutomation(
    baseId: string,
    automationId: LunarAutomationId,
    enabled: boolean,
    options: ToggleBaseAutomationOptions = {},
  ): LunarBaseActionResult<LunarBase> {
    const currentTime = now();
    cleanupExpired(currentTime);
    stepWorld(currentTime);

    const base = bases.find((candidate) => candidate.id === baseId);
    if (!base) return { ok: false, error: "Unknown base" };
    const authorized = authorizeBaseAction(base, options.auth);
    if (!authorized.ok) return authorized;

    const definition = LUNAR_AUTOMATION_DEFINITIONS[automationId];
    if (!definition) return { ok: false, error: "Unknown automation" };
    if (enabled && !ENABLED_AUTOMATION_HANDLERS.has(automationId)) {
      return { ok: false, error: "Automation is not implemented" };
    }

    if (enabled) {
      const commander = commanders.get(base.commanderId);
      if (!commander) return { ok: false, error: "Unknown commander" };
      const missingTech = definition.requiredTech.filter(
        (techId) => !commander.unlockedTech.includes(techId),
      );
      if (missingTech.length > 0) {
        return { ok: false, error: `Missing required tech: ${missingTech.join(", ")}` };
      }

      const missingRooms = definition.requiredRooms.filter(
        (roomId) => !base.rooms.some((room) => room.roomId === roomId && room.integrity > 0),
      );
      if (missingRooms.length > 0) {
        return { ok: false, error: `Missing required room: ${missingRooms.join(", ")}` };
      }
    }

    const previous = base.automation[automationId];
    const nextState: LunarBaseAutomationState = {
      automationId,
      enabled,
      updatedAt: currentTime,
      lastRanAt: previous?.lastRanAt ?? null,
      lastWarningAt: previous?.lastWarningAt ?? null,
    };
    base.automation = {
      ...base.automation,
      [automationId]: nextState,
    };
    appendAutomationLog(
      base,
      automationId,
      `${definition.name} ${enabled ? "enabled" : "disabled"}.`,
      currentTime,
    );

    return { ok: true, value: cloneBase(base) };
  }

  function queueBaseRoom(
    baseId: string,
    roomId: LunarRoomId,
    options: QueueBaseRoomOptions = {},
  ): LunarBaseActionResult<LunarBaseBuildQueueItem> {
    const currentTime = now();
    cleanupExpired(currentTime);
    stepWorld(currentTime);

    const base = bases.find((candidate) => candidate.id === baseId);
    if (!base) return { ok: false, error: "Unknown base" };
    const authorized = authorizeBaseAction(base, options.auth);
    if (!authorized.ok) return authorized;

    const definition = LUNAR_ROOM_DEFINITIONS[roomId];
    if (!definition) return { ok: false, error: "Unknown room" };
    const commander = commanders.get(base.commanderId);
    if (!commander) return { ok: false, error: "Unknown commander" };
    const missingTech = missingRequiredTech(commander.unlockedTech, definition.requiredTech);
    if (missingTech.length > 0) {
      return { ok: false, error: `Missing required tech: ${missingTech.join(", ")}` };
    }

    const spent = spendResources(base.storage, definition.buildCost);
    if (!spent.ok) return { ok: false, error: spent.error };

    base.storage = spent.value;
    const item: LunarBaseBuildQueueItem = {
      id: createWorldEventId("build"),
      roomId,
      position: {
        x: options.position?.x ?? base.position.x + base.rooms.length * 18,
        y: options.position?.y ?? base.position.y,
      },
      cost: cloneResources(definition.buildCost),
      queuedAt: currentTime,
      startedAt: currentTime,
      completesAt: currentTime + BASE_ROOM_BUILD_MS,
    };
    base.buildQueue = [...base.buildQueue, item];

    return { ok: true, value: { ...item, position: { ...item.position }, cost: cloneResources(item.cost) } };
  }

  function repairBase(
    baseId: string,
    options: RepairBaseOptions = {},
  ): LunarBaseActionResult<LunarBase> {
    const currentTime = now();
    cleanupExpired(currentTime);
    stepWorld(currentTime);

    const base = bases.find((candidate) => candidate.id === baseId);
    if (!base) return { ok: false, error: "Unknown base" };
    const authorized = authorizeBaseAction(base, options.auth);
    if (!authorized.ok) return authorized;

    const amount = options.amount ?? 10;
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Invalid repair amount" };

    const room = options.roomInstanceId
      ? base.rooms.find((candidate) => candidate.instanceId === options.roomInstanceId)
      : base.rooms.find((candidate) => candidate.integrity < candidate.maxIntegrity);
    if (options.roomInstanceId && !room) return { ok: false, error: "Unknown room instance" };

    const baseRepair = Math.min(amount, base.maxIntegrity - base.integrity);
    const roomRepair = room ? Math.min(amount, room.maxIntegrity - room.integrity) : 0;
    const repairAmount = Math.max(baseRepair, roomRepair);
    if (repairAmount <= 0) return { ok: false, error: "Nothing to repair" };

    const cost = { metal: Math.ceil(repairAmount / 10) };
    const spent = spendResources(base.storage, cost);
    if (!spent.ok) return { ok: false, error: spent.error };

    base.storage = spent.value;
    base.integrity += baseRepair;
    if (room) room.integrity += roomRepair;

    return { ok: true, value: cloneBase(base) };
  }

  function launchBaseAscent(
    baseId: string,
    options: LaunchBaseAscentOptions = {},
  ): LunarBaseActionResult<LunarFlight> {
    const currentTime = now();
    cleanupExpired(currentTime);
    stepWorld(currentTime);

    const base = bases.find((candidate) => candidate.id === baseId);
    if (!base) return { ok: false, error: "Unknown base" };
    const authorized = authorizeBaseAction(base, options.auth);
    if (!authorized.ok) return authorized;

    const destinationStation = orbitalStationForBody(base.bodyId);
    if (!destinationStation) return { ok: false, error: "No orbital station" };
    if (!hasDockingReservation(destinationStation)) {
      return { ok: false, error: "No docking capacity" };
    }

    const cargo = validateCargo(options.cargo);
    if (!cargo.ok) return cargo;

    const fuelCost = { fuel: BASE_ASCENT_FUEL_COST };
    const totalCost = addResourceMaps(fuelCost, cargo.value);
    const spent = spendResources(base.storage, totalCost);
    if (!spent.ok) return { ok: false, error: spent.error };

    base.storage = spent.value;
    const flight: LunarFlight = {
      id: createWorldEventId("flight"),
      blueprintId: "base-ascent",
      routeKind: "surface-to-orbit",
      originBodyId: base.bodyId,
      destinationBodyId: base.bodyId,
      originBaseId: base.id,
      destinationStationId: destinationStation.id,
      fuelCost,
      cargo: cargo.value,
      departedAt: currentTime,
      arrivesAt: currentTime + BASE_ASCENT_DURATION_MS,
      status: "active",
    };
    flights.push(flight);

    return { ok: true, value: cloneFlight(flight) };
  }

  function planStationTransfer(
    originStationId: LunarStationId,
    destinationBodyId: LunarBodyId,
    options: PlanStationTransferOptions = {},
  ): LunarBaseActionResult<LunarFlight> {
    const currentTime = now();
    cleanupExpired(currentTime);
    let commander: LunarLanderCommander | undefined;
    if (options.auth) {
      const authorized = authorizeLanderAction(options.auth);
      if (!authorized.ok) return authorized;
      commander = commanders.get(authorized.value.commanderId);
    } else {
      commander = commanders.get(DEFAULT_COMMANDER_ID) ?? Array.from(commanders.values())[0];
    }
    if (!commander) return { ok: false, error: "Unknown commander" };
    stepWorld(currentTime);

    const originStation = stationById(originStationId);
    if (!originStation) return { ok: false, error: "Unknown origin station" };

    const destinationStation = orbitalStationForBody(destinationBodyId);
    if (!destinationStation) return { ok: false, error: "Unknown destination body" };
    const transferAccess = commanderCanUseStationTransfer(commander, destinationBodyId);
    if (!transferAccess.ok) return transferAccess;
    if (originStation.id === destinationStation.id) {
      return { ok: false, error: "Destination must differ from origin" };
    }
    if (!hasDockingReservation(destinationStation)) {
      return { ok: false, error: "No docking capacity" };
    }

    const cargo = validateCargo(options.cargo);
    if (!cargo.ok) return cargo;

    const fuelCost = { fuel: stationTransferFuelCost(originStation.bodyId, destinationBodyId) };
    const totalCost = addResourceMaps(fuelCost, cargo.value);
    const spent = spendResources(originStation.storage, totalCost);
    if (!spent.ok) return { ok: false, error: spent.error };

    originStation.storage = spent.value;
    const flight: LunarFlight = {
      id: createWorldEventId("flight"),
      blueprintId: "station-transfer",
      routeKind: "station-to-station",
      originBodyId: originStation.bodyId,
      destinationBodyId,
      originStationId: originStation.id,
      destinationStationId: destinationStation.id,
      fuelCost,
      cargo: cargo.value,
      departedAt: currentTime,
      arrivesAt: currentTime + STATION_TRANSFER_DURATION_MS,
      status: "active",
    };
    flights.push(flight);

    return { ok: true, value: cloneFlight(flight) };
  }

  function serializeWorld(): SerializedLunarLanderWorldState {
    const currentTime = now();
    cleanupExpired(currentTime);
    stepWorld(currentTime);
    cleanupAllCrashEvents(currentTime);

    return {
      version: 1,
      activeBodyId,
      commanders: Array.from(commanders.values()).map(publicCommander),
      bodies: Array.from(bodies.values()).map((body) => ({
        id: body.id,
        terrain: cloneTerrain(body.terrain),
        crashes: body.crashes.map((crash) => ({ ...crash })),
        outposts: body.outposts.map((outpost) => ({ ...outpost })),
        landingPads: cloneLandingPads(body.landingPads),
      })),
      stations: stations.map((station) => ({
        ...station,
        rooms: [...station.rooms],
        storage: cloneResources(station.storage),
      })),
      bases: bases.map(cloneBase),
      flights: flights.map(cloneFlight),
      landers: Array.from(landers.values()).map((lander) => ({
        ...publicLander(lander),
        controlToken: lander.controlToken,
        spawnIndex: lander.spawnIndex,
        lastSteppedAt: lander.lastSteppedAt,
      })),
      spawnCount,
      worldEventCount,
      economyUpdatedAt,
    };
  }

  return {
    spawnLander,
    hasLanderBlueprint,
    authorizeLanderAction,
    readWorldSnapshot,
    writeControl,
    researchTech,
    toggleBaseAutomation,
    queueBaseRoom,
    repairBase,
    launchBaseAscent,
    planStationTransfer,
    readAvailableTravelRoutes,
    serializeWorld,
  };
}
