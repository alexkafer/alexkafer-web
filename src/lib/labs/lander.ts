import {
  DEFAULT_LANDER_BLUEPRINT,
  deriveLanderStats,
  type LunarLanderComponentStats,
} from "./lunar-lander-domain";

export type LanderStatus = "idle" | "flying" | "landed" | "crashed";

export type LanderVector = {
  x: number;
  y: number;
};

export type LanderInput = {
  thrust: boolean;
  rotate: number;
  lateral?: number;
};

export type LanderFlightStats = Pick<
  LunarLanderComponentStats,
  | "fuelCapacity"
  | "mass"
  | "mainThrustAcceleration"
  | "fuelBurnPerSecond"
  | "lateralFuelBurnPerSecond"
  | "rotationDegreesPerSecond"
  | "maxAbsAngle"
  | "safeVerticalSpeed"
  | "safeHorizontalSpeed"
  | "safeAbsAngle"
  | "lateralThrustAcceleration"
  | "baseKitCapacity"
  | "hasFlightComputer"
  | "hasSafetySystem"
>;

export type LanderState = {
  position: LanderVector;
  velocity: LanderVector;
  angle: number;
  fuel: number;
  status: LanderStatus;
};

export type LandingPad = {
  x: number;
  width: number;
  label: string;
  multiplier: number;
};

export const LUNAR_LANDER_PADS: readonly LandingPad[] = [
  { x: -675, width: 82, label: "3x", multiplier: 3 },
  { x: -42, width: 78, label: "4x", multiplier: 4 },
  { x: 455, width: 116, label: "2x", multiplier: 2 },
  { x: 710, width: 58, label: "5x", multiplier: 5 },
  { x: 1048, width: 96, label: "2x", multiplier: 2 },
  { x: 1220, width: 82, label: "3x", multiplier: 3 },
];

export const LUNAR_TERRAIN_POINTS: readonly LanderVector[] = [
  { x: -900, y: 68 },
  { x: -878, y: 124 },
  { x: -846, y: 156 },
  { x: -810, y: 214 },
  { x: -778, y: 238 },
  { x: -744, y: 210 },
  { x: -710, y: 198 },
  { x: -690, y: 224 },
  { x: -675, y: 224 },
  { x: -593, y: 224 },
  { x: -578, y: 158 },
  { x: -540, y: 128 },
  { x: -500, y: 156 },
  { x: -458, y: 208 },
  { x: -420, y: 244 },
  { x: -380, y: 216 },
  { x: -346, y: 168 },
  { x: -318, y: 174 },
  { x: -286, y: 132 },
  { x: -246, y: 104 },
  { x: -206, y: 126 },
  { x: -176, y: 202 },
  { x: -136, y: 248 },
  { x: -92, y: 310 },
  { x: -58, y: 390 },
  { x: -42, y: 418 },
  { x: 36, y: 418 },
  { x: 70, y: 382 },
  { x: 112, y: 318 },
  { x: 156, y: 298 },
  { x: 206, y: 224 },
  { x: 244, y: 166 },
  { x: 296, y: 102 },
  { x: 354, y: 74 },
  { x: 455, y: 74 },
  { x: 571, y: 74 },
  { x: 594, y: 136 },
  { x: 628, y: 160 },
  { x: 676, y: 166 },
  { x: 710, y: 188 },
  { x: 768, y: 188 },
  { x: 796, y: 132 },
  { x: 848, y: 86 },
  { x: 902, y: 76 },
  { x: 1048, y: 76 },
  { x: 1144, y: 76 },
  { x: 1186, y: 178 },
  { x: 1220, y: 224 },
  { x: 1302, y: 224 },
  { x: 1324, y: 178 },
  { x: 1368, y: 154 },
  { x: 1428, y: 194 },
  { x: 1482, y: 246 },
  { x: 1544, y: 214 },
  { x: 1606, y: 126 },
  { x: 1674, y: 72 },
];

const GRAVITY = -15.5;
const COLLISION_TOLERANCE = 0.1;
const COLLISION_SAMPLE_SPACING = 3;

export const DEFAULT_LANDER_FLIGHT_STATS: LanderFlightStats = deriveLanderStats(
  DEFAULT_LANDER_BLUEPRINT,
);

type LocalCollisionPoint = LanderVector & {
  kind: "foot" | "hull";
};

export type LanderTerrainContact = LanderVector & {
  kind: "foot" | "hull";
  surfaceY: number;
  penetration: number;
};

const COLLISION_SEGMENTS: readonly (readonly [LocalCollisionPoint, LocalCollisionPoint])[] = [
  [
    { x: 0, y: -12, kind: "hull" },
    { x: 8, y: -2, kind: "hull" },
  ],
  [
    { x: 8, y: -2, kind: "hull" },
    { x: 8, y: 8, kind: "hull" },
  ],
  [
    { x: 8, y: 8, kind: "hull" },
    { x: 3, y: 12, kind: "hull" },
  ],
  [
    { x: 3, y: 12, kind: "hull" },
    { x: -3, y: 12, kind: "hull" },
  ],
  [
    { x: -3, y: 12, kind: "hull" },
    { x: -8, y: 8, kind: "hull" },
  ],
  [
    { x: -8, y: 8, kind: "hull" },
    { x: -8, y: -2, kind: "hull" },
  ],
  [
    { x: -8, y: -2, kind: "hull" },
    { x: 0, y: -12, kind: "hull" },
  ],
  [
    { x: -7, y: 7, kind: "hull" },
    { x: -13, y: 13, kind: "hull" },
  ],
  [
    { x: -14, y: 14, kind: "foot" },
    { x: -9, y: 14, kind: "foot" },
  ],
  [
    { x: 7, y: 7, kind: "hull" },
    { x: 13, y: 13, kind: "hull" },
  ],
  [
    { x: 9, y: 14, kind: "foot" },
    { x: 14, y: 14, kind: "foot" },
  ],
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function localToWorld(state: LanderState, point: LocalCollisionPoint): LocalCollisionPoint {
  const radians = (state.angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const screenX = point.x * cos - point.y * sin;
  const screenY = point.x * sin + point.y * cos;

  return {
    kind: point.kind,
    x: state.position.x + screenX,
    y: state.position.y - screenY,
  };
}

function sampleSegment(
  start: LocalCollisionPoint,
  end: LocalCollisionPoint,
): LocalCollisionPoint[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(length / COLLISION_SAMPLE_SPACING));

  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;
    return {
      kind: start.kind === "foot" && end.kind === "foot" ? "foot" : "hull",
      x: start.x + dx * progress,
      y: start.y + dy * progress,
    };
  });
}

export function terrainSurfaceY(
  x: number,
  points: readonly LanderVector[] = LUNAR_TERRAIN_POINTS,
): number {
  if (x <= points[0].x) return points[0].y;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];
    if (x <= next.x) {
      const progress = (x - previous.x) / (next.x - previous.x);
      return previous.y + (next.y - previous.y) * progress;
    }
  }

  return points[points.length - 1].y;
}

export function landerCollisionSamples(state: LanderState): readonly LocalCollisionPoint[] {
  return COLLISION_SEGMENTS.flatMap(([start, end]) =>
    sampleSegment(start, end).map((point) => localToWorld(state, point)),
  );
}

export function landerTerrainContacts(
  state: LanderState,
  points: readonly LanderVector[] = LUNAR_TERRAIN_POINTS,
): readonly LanderTerrainContact[] {
  return landerCollisionSamples(state)
    .map((point) => {
      const surfaceY = terrainSurfaceY(point.x, points);
      return {
        ...point,
        surfaceY,
        penetration: surfaceY - point.y,
      };
    })
    .filter((point) => point.penetration >= -COLLISION_TOLERANCE);
}

export function createInitialLanderState(
  stats: LanderFlightStats = DEFAULT_LANDER_FLIGHT_STATS,
): LanderState {
  return {
    position: { x: -420, y: 610 },
    velocity: { x: 78, y: -5 },
    angle: 0,
    fuel: stats.fuelCapacity,
    status: "idle",
  };
}

export function startLander(state: LanderState): LanderState {
  if (state.status !== "idle") return state;
  return { ...state, status: "flying" };
}

export function findLandingPad(
  x: number,
  pads: readonly LandingPad[] = LUNAR_LANDER_PADS,
): LandingPad | null {
  return pads.find((pad) => x >= pad.x && x <= pad.x + pad.width) ?? null;
}

export function classifyTouchdown(
  state: LanderState,
  pads: readonly LandingPad[] = LUNAR_LANDER_PADS,
  terrainPoints: readonly LanderVector[] = LUNAR_TERRAIN_POINTS,
  stats: LanderFlightStats = DEFAULT_LANDER_FLIGHT_STATS,
): Exclude<LanderStatus, "idle" | "flying"> {
  const contacts = landerTerrainContacts(state, terrainPoints);
  const footContacts = contacts.filter((contact) => contact.kind === "foot");
  const allContactsAreFeet = contacts.every((contact) => contact.kind === "foot");
  const allFeetAreOnPads =
    footContacts.length > 0 &&
    footContacts.every((contact) => Boolean(findLandingPad(contact.x, pads)));
  const safe =
    contacts.length > 0 &&
    allContactsAreFeet &&
    allFeetAreOnPads &&
    Math.abs(state.velocity.y) <= stats.safeVerticalSpeed &&
    Math.abs(state.velocity.x) <= stats.safeHorizontalSpeed &&
    Math.abs(state.angle) <= stats.safeAbsAngle;

  return safe ? "landed" : "crashed";
}

export function stepLander(
  state: LanderState,
  input: LanderInput,
  deltaSeconds: number,
  pads: readonly LandingPad[] = LUNAR_LANDER_PADS,
  terrainPoints: readonly LanderVector[] = LUNAR_TERRAIN_POINTS,
  stats: LanderFlightStats = DEFAULT_LANDER_FLIGHT_STATS,
): LanderState {
  if (state.status !== "flying") return state;

  const dt = clamp(deltaSeconds, 0, 0.08);
  const rotate = clamp(input.rotate, -1, 1);
  const lateral = clamp(input.lateral ?? 0, -1, 1);
  const nextAngle = clamp(
    state.angle + rotate * stats.rotationDegreesPerSecond * dt,
    -stats.maxAbsAngle,
    stats.maxAbsAngle,
  );
  const thrusting = input.thrust && state.fuel > 0;
  const lateralThrusting =
    lateral !== 0 && stats.lateralThrustAcceleration > 0 && state.fuel > 0;
  const radians = (nextAngle * Math.PI) / 180;
  const thrustX = thrusting ? Math.sin(radians) * stats.mainThrustAcceleration : 0;
  const thrustY = thrusting ? Math.cos(radians) * stats.mainThrustAcceleration : 0;
  const lateralThrustX = lateralThrusting ? lateral * stats.lateralThrustAcceleration : 0;
  const fuelBurn =
    (thrusting ? stats.fuelBurnPerSecond : 0) +
    (lateralThrusting ? Math.abs(lateral) * stats.lateralFuelBurnPerSecond : 0);
  const nextFuel = fuelBurn > 0 ? Math.max(0, state.fuel - fuelBurn * dt) : state.fuel;
  const nextVelocity = {
    x: state.velocity.x + (thrustX + lateralThrustX) * dt,
    y: state.velocity.y + (GRAVITY + thrustY) * dt,
  };
  const nextPosition = {
    x: state.position.x + nextVelocity.x * dt,
    y: state.position.y + nextVelocity.y * dt,
  };
  const tentativeState: LanderState = {
    position: nextPosition,
    velocity: nextVelocity,
    angle: nextAngle,
    fuel: nextFuel,
    status: "flying",
  };
  const contacts = landerTerrainContacts(tentativeState, terrainPoints);
  const penetration = contacts.reduce(
    (deepest, contact) => Math.max(deepest, contact.penetration),
    0,
  );
  const grounded = contacts.length > 0;
  const adjustedPosition = grounded
    ? { ...nextPosition, y: nextPosition.y + penetration }
    : nextPosition;
  const nextState: LanderState = {
    position: adjustedPosition,
    velocity: nextVelocity,
    angle: nextAngle,
    fuel: nextFuel,
    status: "flying",
  };

  if (grounded) {
    return {
      ...nextState,
      status: classifyTouchdown(nextState, pads, terrainPoints, stats),
    };
  }

  return nextState;
}
