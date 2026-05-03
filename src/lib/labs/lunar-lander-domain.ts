export const LUNAR_RESOURCE_IDS = {
  credits: "credits",
  fuel: "fuel",
  regolith: "regolith",
  ore: "ore",
  ice: "ice",
  water: "water",
  oxygen: "oxygen",
  metal: "metal",
  electronics: "electronics",
  research: "research",
} as const;

export type LunarResourceId = (typeof LUNAR_RESOURCE_IDS)[keyof typeof LUNAR_RESOURCE_IDS];

export type LunarResourceMap = Partial<Record<LunarResourceId, number>>;

export type LunarUnlockSet = ReadonlySet<LunarTechId> | readonly LunarTechId[];

export type LunarRequirementCheck = {
  ok: boolean;
  missingTech: LunarTechId[];
  missingComponents: LunarLanderComponentId[];
};

export type LunarComponentSlot =
  | "capsule"
  | "fuel-tank"
  | "main-engine"
  | "landing-gear"
  | "attitude-control"
  | "lateral-thruster"
  | "cargo"
  | "base-kit"
  | "flight-computer"
  | "safety-system";

export type LunarLanderComponentId =
  | "training-capsule"
  | "training-fuel-tank"
  | "training-main-engine"
  | "training-landing-gear"
  | "training-attitude-control"
  | "survey-cargo-pod"
  | "compact-base-kit"
  | "puff-lateral-thrusters"
  | "guidance-computer-mk1"
  | "landing-safety-package";

export type LunarTechId =
  | "orbital-survey"
  | "modular-construction"
  | "base-habitat"
  | "ice-processing"
  | "lateral-thrusters"
  | "flight-computers"
  | "safety-systems"
  | "automation-control"
  | "interplanetary-navigation";

export type LunarRoomId =
  | "command-habitat"
  | "storage-bay"
  | "regolith-mine"
  | "ice-processor"
  | "workshop"
  | "landing-pad"
  | "reinforced-shield"
  | "launch-control";

export type LunarBodyId = "moon" | "mars" | "europa";

export type LunarStationId = "moon-orbit" | "mars-orbit" | "europa-orbit";

export type LunarAutomationId =
  | "auto-mining"
  | "auto-refining"
  | "auto-repair"
  | "auto-logistics";

export type LunarLanderComponentStats = {
  mass: number;
  fuelCapacity: number;
  mainThrustAcceleration: number;
  fuelBurnPerSecond: number;
  lateralFuelBurnPerSecond: number;
  rotationDegreesPerSecond: number;
  maxAbsAngle: number;
  safeVerticalSpeed: number;
  safeHorizontalSpeed: number;
  safeAbsAngle: number;
  lateralThrustAcceleration: number;
  cargoCapacity: number;
  baseKitCapacity: number;
  hasFlightComputer: boolean;
  hasSafetySystem: boolean;
};

export type LunarLanderComponent = {
  id: LunarLanderComponentId;
  name: string;
  slot: LunarComponentSlot;
  description: string;
  stats: Partial<LunarLanderComponentStats>;
  buildCost: LunarResourceMap;
  requiredTech?: readonly LunarTechId[];
  requiredComponents?: readonly LunarLanderComponentId[];
};

export type LunarLanderBlueprint = {
  id: string;
  name: string;
  description: string;
  componentIds: readonly LunarLanderComponentId[];
  cargo?: LunarResourceMap;
};

export type ResolvedLanderBlueprint = {
  blueprint: LunarLanderBlueprint;
  components: readonly LunarLanderComponent[];
  stats: LunarLanderComponentStats;
};

export type LunarTechDefinition = {
  id: LunarTechId;
  name: string;
  description: string;
  cost: LunarResourceMap;
  prerequisites?: readonly LunarTechId[];
  unlocks: {
    components?: readonly LunarLanderComponentId[];
    rooms?: readonly LunarRoomId[];
    bodies?: readonly LunarBodyId[];
    automation?: readonly LunarAutomationId[];
  };
};

export type LunarRoomDefinition = {
  id: LunarRoomId;
  name: string;
  description: string;
  footprint: { width: number; height: number };
  buildCost: LunarResourceMap;
  storage?: LunarResourceMap;
  productionPerTick?: LunarResourceMap;
  consumesPerTick?: LunarResourceMap;
  requiredTech?: readonly LunarTechId[];
};

export type LunarBaseRoom = {
  instanceId: string;
  roomId: LunarRoomId;
  position: { x: number; y: number };
  integrity: number;
  maxIntegrity: number;
  assignedCrew: number;
};

export type LunarBaseArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LunarBaseBuildQueueItem = {
  id: string;
  roomId: LunarRoomId;
  position: { x: number; y: number };
  cost: LunarResourceMap;
  queuedAt: number;
  startedAt: number | null;
  completesAt: number;
};

export type LunarBaseProductionJob = {
  id: string;
  roomInstanceId: string;
  roomId: LunarRoomId;
  consumesPerTick: LunarResourceMap;
  productionPerTick: LunarResourceMap;
  lastProducedAt: number;
  producedTicks: number;
};

export type LunarBaseAutomationState = {
  automationId: LunarAutomationId;
  enabled: boolean;
  updatedAt: number;
  lastRanAt: number | null;
  lastWarningAt: number | null;
};

export type LunarBaseAutomationLogEntry = {
  id: string;
  createdAt: number;
  automationId: LunarAutomationId;
  message: string;
};

export type LunarBaseDamageEvent = {
  id: string;
  createdAt: number;
  amount: number;
  integrityBefore: number;
  integrityAfter: number;
  impactSpeed: number;
  impactMass: number;
  roomInstanceId: string | null;
};

export type LunarResourceShipmentStatus = "planned" | "in-transit" | "delivered" | "cancelled";

export type LunarResourceShipment = {
  id: string;
  status: LunarResourceShipmentStatus;
  resources: LunarResourceMap;
  originBaseId?: string;
  destinationBaseId?: string;
  stationId?: LunarStationId;
  createdAt: number;
  arrivesAt?: number;
  deliveredAt?: number;
};

export type LunarBase = {
  id: string;
  name: string;
  commanderId: string;
  bodyId: LunarBodyId;
  position: { x: number; y: number };
  integrity: number;
  maxIntegrity: number;
  footprint: LunarBaseArea;
  landingPads: readonly LunarBaseArea[];
  rooms: readonly LunarBaseRoom[];
  storage: LunarResourceMap;
  buildQueue: readonly LunarBaseBuildQueueItem[];
  productionJobs: readonly LunarBaseProductionJob[];
  automation: Partial<Record<LunarAutomationId, LunarBaseAutomationState>>;
  automationLog: readonly LunarBaseAutomationLogEntry[];
  damageEvents: readonly LunarBaseDamageEvent[];
  shipments: readonly LunarResourceShipment[];
  economyUpdatedAt: number;
};

export type LunarStation = {
  id: LunarStationId;
  name: string;
  bodyId: LunarBodyId;
  dockingPads: number;
  rooms: readonly LunarRoomId[];
  storage: LunarResourceMap;
};

export type LunarCelestialBodyDefinition = {
  id: LunarBodyId;
  name: string;
  gravity: number;
  description: string;
  surfaceResources: LunarResourceMap;
  stationId: LunarStationId;
  unlockedByDefault: boolean;
  requiredTech?: readonly LunarTechId[];
};

export type LunarFlightStatus = "planned" | "active" | "arrived" | "cancelled";
export type LunarFlightRouteKind = "surface-to-orbit" | "station-to-station" | "orbit-to-surface";

export type LunarFlight = {
  id: string;
  blueprintId: string;
  routeKind: LunarFlightRouteKind;
  originBodyId: LunarBodyId;
  destinationBodyId: LunarBodyId;
  originBaseId?: string;
  destinationBaseId?: string;
  originStationId?: LunarStationId;
  destinationStationId?: LunarStationId;
  fuelCost: LunarResourceMap;
  cargo: LunarResourceMap;
  departedAt: number;
  arrivesAt: number;
  status: LunarFlightStatus;
};

export type LunarAutomationDefinition = {
  id: LunarAutomationId;
  name: string;
  description: string;
  requiredTech: readonly LunarTechId[];
  requiredRooms: readonly LunarRoomId[];
  upkeepPerTick: LunarResourceMap;
};

export const EMPTY_LANDER_STATS: LunarLanderComponentStats = {
  mass: 0,
  fuelCapacity: 0,
  mainThrustAcceleration: 0,
  fuelBurnPerSecond: 0,
  lateralFuelBurnPerSecond: 0,
  rotationDegreesPerSecond: 0,
  maxAbsAngle: 0,
  safeVerticalSpeed: 0,
  safeHorizontalSpeed: 0,
  safeAbsAngle: 0,
  lateralThrustAcceleration: 0,
  cargoCapacity: 0,
  baseKitCapacity: 0,
  hasFlightComputer: false,
  hasSafetySystem: false,
};

export const LUNAR_LANDER_COMPONENTS: Readonly<Record<LunarLanderComponentId, LunarLanderComponent>> = {
  "training-capsule": {
    id: "training-capsule",
    name: "Training capsule",
    slot: "capsule",
    description: "The default crew shell used by the current arcade lander.",
    stats: { mass: 120, maxAbsAngle: 82 },
    buildCost: { metal: 40, electronics: 5 },
  },
  "training-fuel-tank": {
    id: "training-fuel-tank",
    name: "Training fuel tank",
    slot: "fuel-tank",
    description: "A single tank sized to match the existing 1000 unit fuel load.",
    stats: { mass: 40, fuelCapacity: 1000 },
    buildCost: { metal: 20 },
  },
  "training-main-engine": {
    id: "training-main-engine",
    name: "Training main engine",
    slot: "main-engine",
    description: "Main descent engine matching the existing fixed thrust and burn rate.",
    stats: { mass: 60, mainThrustAcceleration: 38, fuelBurnPerSecond: 12 },
    buildCost: { metal: 35, electronics: 4 },
  },
  "training-landing-gear": {
    id: "training-landing-gear",
    name: "Training landing gear",
    slot: "landing-gear",
    description: "Basic legs matching the existing safe touchdown envelope.",
    stats: { mass: 30, safeVerticalSpeed: 16, safeHorizontalSpeed: 18, safeAbsAngle: 10 },
    buildCost: { metal: 24 },
  },
  "training-attitude-control": {
    id: "training-attitude-control",
    name: "Training attitude control",
    slot: "attitude-control",
    description: "Rotational jets matching the existing turn authority.",
    stats: { mass: 10, rotationDegreesPerSecond: 112 },
    buildCost: { metal: 12, fuel: 20 },
  },
  "survey-cargo-pod": {
    id: "survey-cargo-pod",
    name: "Survey cargo pod",
    slot: "cargo",
    description: "A small cargo pod for early resource shipments.",
    stats: { mass: 35, cargoCapacity: 150 },
    buildCost: { metal: 30 },
    requiredTech: ["modular-construction"],
  },
  "compact-base-kit": {
    id: "compact-base-kit",
    name: "Compact base kit",
    slot: "base-kit",
    description: "Deploys one starter habitat after a safe touchdown.",
    stats: { mass: 120, cargoCapacity: 50, baseKitCapacity: 1 },
    buildCost: { metal: 120, electronics: 12 },
    requiredTech: ["base-habitat"],
  },
  "puff-lateral-thrusters": {
    id: "puff-lateral-thrusters",
    name: "Puff lateral thrusters",
    slot: "lateral-thruster",
    description: "Low-power side thrusters for future fine maneuvering controls.",
    stats: { mass: 24, lateralThrustAcceleration: 8, lateralFuelBurnPerSecond: 2 },
    buildCost: { metal: 30, fuel: 50 },
    requiredTech: ["lateral-thrusters"],
  },
  "guidance-computer-mk1": {
    id: "guidance-computer-mk1",
    name: "Guidance computer Mk I",
    slot: "flight-computer",
    description: "Unlocks future trajectory and autopilot assistance.",
    stats: { mass: 12, hasFlightComputer: true },
    buildCost: { electronics: 40, research: 20 },
    requiredTech: ["flight-computers"],
  },
  "landing-safety-package": {
    id: "landing-safety-package",
    name: "Landing safety package",
    slot: "safety-system",
    description: "Unlocks future visual safety cues and automated warnings.",
    stats: { mass: 18, safeVerticalSpeed: 2, safeHorizontalSpeed: 2, safeAbsAngle: 2, hasSafetySystem: true },
    buildCost: { electronics: 30, research: 30 },
    requiredTech: ["safety-systems"],
    requiredComponents: ["guidance-computer-mk1"],
  },
};

export const DEFAULT_LANDER_BLUEPRINT: LunarLanderBlueprint = {
  id: "training-lander",
  name: "Training lander",
  description: "The current fixed lunar lander represented as a reusable blueprint.",
  componentIds: [
    "training-capsule",
    "training-fuel-tank",
    "training-main-engine",
    "training-landing-gear",
    "training-attitude-control",
  ],
};

export const STARTER_BASE_KIT_LANDER_BLUEPRINT: LunarLanderBlueprint = {
  id: "starter-base-kit-lander",
  name: "Starter base-kit lander",
  description: "A test/deployment craft carrying a compact base kit and starter supplies.",
  componentIds: [...DEFAULT_LANDER_BLUEPRINT.componentIds, "compact-base-kit"],
  cargo: { fuel: 500, metal: 300, ice: 10, oxygen: 20 },
};

export const LUNAR_TECH_DEFINITIONS: Readonly<Record<LunarTechId, LunarTechDefinition>> = {
  "orbital-survey": {
    id: "orbital-survey",
    name: "Orbital survey",
    description: "Maps nearby bodies, stations, and surface resources.",
    cost: { research: 50 },
    unlocks: { bodies: ["mars", "europa"] },
  },
  "modular-construction": {
    id: "modular-construction",
    name: "Modular construction",
    description: "Allows cargo pods and workshop expansion.",
    cost: { research: 80, metal: 30 },
    unlocks: { components: ["survey-cargo-pod"], rooms: ["workshop"] },
  },
  "base-habitat": {
    id: "base-habitat",
    name: "Base habitat",
    description: "Allows founding and expanding surface bases.",
    cost: { research: 120, metal: 80 },
    prerequisites: ["modular-construction"],
    unlocks: { components: ["compact-base-kit"], rooms: ["command-habitat", "storage-bay", "landing-pad"] },
  },
  "ice-processing": {
    id: "ice-processing",
    name: "Ice processing",
    description: "Turns ice into water, oxygen, and fuel feedstock.",
    cost: { research: 150, metal: 90 },
    prerequisites: ["base-habitat"],
    unlocks: { rooms: ["ice-processor"] },
  },
  "lateral-thrusters": {
    id: "lateral-thrusters",
    name: "Lateral thrusters",
    description: "Adds fine side maneuver authority to upgraded craft.",
    cost: { research: 90, metal: 60 },
    unlocks: { components: ["puff-lateral-thrusters"] },
  },
  "flight-computers": {
    id: "flight-computers",
    name: "Flight computers",
    description: "Enables guidance hardware for trajectory helpers.",
    cost: { research: 140, electronics: 30 },
    unlocks: { components: ["guidance-computer-mk1"] },
  },
  "safety-systems": {
    id: "safety-systems",
    name: "Safety systems",
    description: "Enables landing safety packages and warning overlays.",
    cost: { research: 160, electronics: 35 },
    prerequisites: ["flight-computers"],
    unlocks: { components: ["landing-safety-package"], rooms: ["reinforced-shield"] },
  },
  "automation-control": {
    id: "automation-control",
    name: "Automation control",
    description: "Allows inspectable idle production and logistics loops.",
    cost: { research: 220, electronics: 60 },
    prerequisites: ["base-habitat"],
    unlocks: { automation: ["auto-mining", "auto-refining", "auto-repair", "auto-logistics"] },
  },
  "interplanetary-navigation": {
    id: "interplanetary-navigation",
    name: "Interplanetary navigation",
    description: "Enables station transfers and longer flight planning.",
    cost: { research: 320, fuel: 500 },
    prerequisites: ["orbital-survey", "flight-computers"],
    unlocks: { rooms: ["launch-control"] },
  },
};

export const LUNAR_ROOM_DEFINITIONS: Readonly<Record<LunarRoomId, LunarRoomDefinition>> = {
  "command-habitat": {
    id: "command-habitat",
    name: "Command habitat",
    description: "Starter living and command space for a surface base.",
    footprint: { width: 2, height: 1 },
    buildCost: { metal: 100, oxygen: 20 },
    storage: { oxygen: 100, water: 60 },
    productionPerTick: { research: 0.5 },
    requiredTech: ["base-habitat"],
  },
  "storage-bay": {
    id: "storage-bay",
    name: "Storage bay",
    description: "Expands base inventory capacity.",
    footprint: { width: 1, height: 1 },
    buildCost: { metal: 50 },
    storage: { regolith: 500, ore: 300, ice: 300, metal: 150, fuel: 250 },
    requiredTech: ["base-habitat"],
  },
  "regolith-mine": {
    id: "regolith-mine",
    name: "Regolith mine",
    description: "Extracts regolith and trace ore from the local surface.",
    footprint: { width: 2, height: 1 },
    buildCost: { metal: 80 },
    productionPerTick: { regolith: 4, ore: 1 },
    requiredTech: ["base-habitat"],
  },
  "ice-processor": {
    id: "ice-processor",
    name: "Ice processor",
    description: "Converts ice into water, oxygen, and fuel supplies.",
    footprint: { width: 2, height: 1 },
    buildCost: { metal: 90, electronics: 10 },
    consumesPerTick: { ice: 2 },
    productionPerTick: { water: 1, oxygen: 1, fuel: 1 },
    requiredTech: ["ice-processing"],
  },
  workshop: {
    id: "workshop",
    name: "Workshop",
    description: "Builds and repairs modular lander components.",
    footprint: { width: 2, height: 1 },
    buildCost: { metal: 120, electronics: 25 },
    requiredTech: ["modular-construction"],
  },
  "landing-pad": {
    id: "landing-pad",
    name: "Landing pad",
    description: "A reinforced surface pad for deliveries and launches.",
    footprint: { width: 2, height: 1 },
    buildCost: { metal: 140, regolith: 250 },
    requiredTech: ["base-habitat"],
  },
  "reinforced-shield": {
    id: "reinforced-shield",
    name: "Reinforced shield",
    description: "Reduces future crash and micrometeorite damage.",
    footprint: { width: 1, height: 1 },
    buildCost: { metal: 180, electronics: 20 },
    requiredTech: ["safety-systems"],
  },
  "launch-control": {
    id: "launch-control",
    name: "Launch control",
    description: "Plans ascent, orbital rendezvous, and station transfers.",
    footprint: { width: 2, height: 1 },
    buildCost: { metal: 160, electronics: 60 },
    requiredTech: ["interplanetary-navigation"],
  },
};

export const LUNAR_BODY_DEFINITIONS: Readonly<Record<LunarBodyId, LunarCelestialBodyDefinition>> = {
  moon: {
    id: "moon",
    name: "Moon",
    gravity: -15.5,
    description: "The training surface used by the current lunar lander game.",
    surfaceResources: { regolith: 1, ore: 0.35, ice: 0.1 },
    stationId: "moon-orbit",
    unlockedByDefault: true,
  },
  mars: {
    id: "mars",
    name: "Mars",
    gravity: -36.9,
    description: "A future destination with stronger gravity and richer ore.",
    surfaceResources: { regolith: 0.8, ore: 0.8, ice: 0.25 },
    stationId: "mars-orbit",
    unlockedByDefault: false,
    requiredTech: ["orbital-survey"],
  },
  europa: {
    id: "europa",
    name: "Europa",
    gravity: -13.1,
    description: "An icy moon for later fuel and oxygen supply chains.",
    surfaceResources: { ice: 1, water: 0.3, ore: 0.15 },
    stationId: "europa-orbit",
    unlockedByDefault: false,
    requiredTech: ["orbital-survey"],
  },
};

export const LUNAR_STATIONS: Readonly<Record<LunarStationId, LunarStation>> = {
  "moon-orbit": {
    id: "moon-orbit",
    name: "Moon orbital station",
    bodyId: "moon",
    dockingPads: 2,
    rooms: ["landing-pad", "storage-bay"],
    storage: { fuel: 500, oxygen: 100 },
  },
  "mars-orbit": {
    id: "mars-orbit",
    name: "Mars orbital station",
    bodyId: "mars",
    dockingPads: 2,
    rooms: ["landing-pad", "storage-bay"],
    storage: {},
  },
  "europa-orbit": {
    id: "europa-orbit",
    name: "Europa orbital station",
    bodyId: "europa",
    dockingPads: 1,
    rooms: ["landing-pad", "storage-bay"],
    storage: {},
  },
};

export const LUNAR_AUTOMATION_DEFINITIONS: Readonly<Record<LunarAutomationId, LunarAutomationDefinition>> = {
  "auto-mining": {
    id: "auto-mining",
    name: "Automated mining",
    description: "Keeps mines producing while the player pilots or travels.",
    requiredTech: ["automation-control"],
    requiredRooms: ["regolith-mine"],
    upkeepPerTick: { oxygen: 0.05 },
  },
  "auto-refining": {
    id: "auto-refining",
    name: "Automated refining",
    description: "Maintains ice and ore processing queues.",
    requiredTech: ["automation-control", "ice-processing"],
    requiredRooms: ["ice-processor"],
    upkeepPerTick: { oxygen: 0.08 },
  },
  "auto-repair": {
    id: "auto-repair",
    name: "Automated repair",
    description: "Spends stored metal to repair damaged rooms over time.",
    requiredTech: ["automation-control", "safety-systems"],
    requiredRooms: ["workshop"],
    upkeepPerTick: { electronics: 0.02 },
  },
  "auto-logistics": {
    id: "auto-logistics",
    name: "Automated logistics",
    description: "Schedules later cargo shipments between bases and stations.",
    requiredTech: ["automation-control", "interplanetary-navigation"],
    requiredRooms: ["launch-control"],
    upkeepPerTick: { fuel: 0.1, electronics: 0.02 },
  },
};

export function createResourceMap(resources: LunarResourceMap = {}): LunarResourceMap {
  return Object.fromEntries(
    Object.entries(resources).filter(([, amount]) => typeof amount === "number" && amount !== 0),
  ) as LunarResourceMap;
}

export function addResourceMaps(...maps: readonly LunarResourceMap[]): LunarResourceMap {
  const total: Partial<Record<LunarResourceId, number>> = {};
  for (const map of maps) {
    for (const [resourceId, amount] of Object.entries(map) as [LunarResourceId, number][]) {
      if (amount === 0) continue;
      total[resourceId] = (total[resourceId] ?? 0) + amount;
    }
  }

  return createResourceMap(total);
}

export function hasResources(available: LunarResourceMap, required: LunarResourceMap): boolean {
  return (Object.entries(required) as [LunarResourceId, number][]).every(
    ([resourceId, amount]) => (available[resourceId] ?? 0) >= amount,
  );
}

function isUnlockArray(unlockedTech: LunarUnlockSet): unlockedTech is readonly LunarTechId[] {
  return Array.isArray(unlockedTech);
}

export function isTechUnlocked(techId: LunarTechId, unlockedTech: LunarUnlockSet): boolean {
  return isUnlockArray(unlockedTech) ? unlockedTech.includes(techId) : unlockedTech.has(techId);
}

export function checkTechRequirements(
  requiredTech: readonly LunarTechId[] | undefined,
  unlockedTech: LunarUnlockSet,
): LunarTechId[] {
  return (requiredTech ?? []).filter((techId) => !isTechUnlocked(techId, unlockedTech));
}

export function checkComponentRequirements(
  component: LunarLanderComponent,
  unlockedTech: LunarUnlockSet,
  installedComponentIds: readonly LunarLanderComponentId[] = [],
): LunarRequirementCheck {
  const missingTech = checkTechRequirements(component.requiredTech, unlockedTech);
  const missingComponents = (component.requiredComponents ?? []).filter(
    (componentId) => !installedComponentIds.includes(componentId),
  );

  return {
    ok: missingTech.length === 0 && missingComponents.length === 0,
    missingTech,
    missingComponents,
  };
}

function addStats(
  current: LunarLanderComponentStats,
  stats: Partial<LunarLanderComponentStats>,
): LunarLanderComponentStats {
  return {
    mass: current.mass + (stats.mass ?? 0),
    fuelCapacity: current.fuelCapacity + (stats.fuelCapacity ?? 0),
    mainThrustAcceleration: current.mainThrustAcceleration + (stats.mainThrustAcceleration ?? 0),
    fuelBurnPerSecond: current.fuelBurnPerSecond + (stats.fuelBurnPerSecond ?? 0),
    lateralFuelBurnPerSecond:
      current.lateralFuelBurnPerSecond + (stats.lateralFuelBurnPerSecond ?? 0),
    rotationDegreesPerSecond: current.rotationDegreesPerSecond + (stats.rotationDegreesPerSecond ?? 0),
    maxAbsAngle: current.maxAbsAngle + (stats.maxAbsAngle ?? 0),
    safeVerticalSpeed: current.safeVerticalSpeed + (stats.safeVerticalSpeed ?? 0),
    safeHorizontalSpeed: current.safeHorizontalSpeed + (stats.safeHorizontalSpeed ?? 0),
    safeAbsAngle: current.safeAbsAngle + (stats.safeAbsAngle ?? 0),
    lateralThrustAcceleration: current.lateralThrustAcceleration + (stats.lateralThrustAcceleration ?? 0),
    cargoCapacity: current.cargoCapacity + (stats.cargoCapacity ?? 0),
    baseKitCapacity: current.baseKitCapacity + (stats.baseKitCapacity ?? 0),
    hasFlightComputer: current.hasFlightComputer || (stats.hasFlightComputer ?? false),
    hasSafetySystem: current.hasSafetySystem || (stats.hasSafetySystem ?? false),
  };
}

export function deriveLanderStats(
  blueprint: LunarLanderBlueprint,
  components: Readonly<Record<LunarLanderComponentId, LunarLanderComponent>> = LUNAR_LANDER_COMPONENTS,
): LunarLanderComponentStats {
  return blueprint.componentIds.reduce<LunarLanderComponentStats>((stats, componentId) => {
    const component = components[componentId];
    return component ? addStats(stats, component.stats) : stats;
  }, EMPTY_LANDER_STATS);
}

export function validateLanderBlueprint(
  blueprint: LunarLanderBlueprint,
  components: Readonly<Record<LunarLanderComponentId, LunarLanderComponent>> = LUNAR_LANDER_COMPONENTS,
): { ok: true; value: ResolvedLanderBlueprint } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const resolvedComponents: LunarLanderComponent[] = [];
  const seenSlots = new Map<LunarComponentSlot, LunarLanderComponentId>();
  const requiredSlots: readonly LunarComponentSlot[] = [
    "capsule",
    "fuel-tank",
    "main-engine",
    "landing-gear",
    "attitude-control",
  ];
  const singletonSlots: ReadonlySet<LunarComponentSlot> = new Set<LunarComponentSlot>([
    "capsule",
    "main-engine",
    "landing-gear",
    "attitude-control",
    "flight-computer",
    "safety-system",
  ]);

  for (const componentId of blueprint.componentIds) {
    const component = components[componentId];
    if (!component) {
      errors.push(`Unknown component: ${componentId}`);
      continue;
    }

    const previous = seenSlots.get(component.slot);
    if (previous && singletonSlots.has(component.slot)) {
      errors.push(`Duplicate ${component.slot} components: ${previous}, ${componentId}`);
    }
    seenSlots.set(component.slot, componentId);
    resolvedComponents.push(component);
  }

  for (const slot of requiredSlots) {
    if (!seenSlots.has(slot)) errors.push(`Missing required ${slot} component`);
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      blueprint,
      components: resolvedComponents,
      stats: deriveLanderStats(blueprint, components),
    },
  };
}
