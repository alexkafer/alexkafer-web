export type LanderStatus = "flying" | "landed" | "crashed";

export type LanderVector = {
  x: number;
  y: number;
};

export type LanderInput = {
  thrust: boolean;
  rotate: number;
};

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
};

export const LUNAR_LANDER_PADS: readonly LandingPad[] = [
  { x: -132, width: 54, label: "Tranquility Base" },
  { x: 86, width: 44, label: "Surveyor Ridge" },
];

const GRAVITY = -18;
const THRUST_ACCELERATION = 46;
const ROTATION_DEGREES_PER_SECOND = 92;
const FUEL_BURN_PER_SECOND = 18;
const MAX_ABS_ANGLE = 55;
const SAFE_VERTICAL_SPEED = 8;
const SAFE_HORIZONTAL_SPEED = 7;
const SAFE_ABS_ANGLE = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createInitialLanderState(): LanderState {
  return {
    position: { x: -32, y: 230 },
    velocity: { x: 12, y: -8 },
    angle: 0,
    fuel: 100,
    status: "flying",
  };
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
): Exclude<LanderStatus, "flying"> {
  const pad = findLandingPad(state.position.x, pads);
  const safe =
    pad &&
    Math.abs(state.velocity.y) <= SAFE_VERTICAL_SPEED &&
    Math.abs(state.velocity.x) <= SAFE_HORIZONTAL_SPEED &&
    Math.abs(state.angle) <= SAFE_ABS_ANGLE;

  return safe ? "landed" : "crashed";
}

export function stepLander(
  state: LanderState,
  input: LanderInput,
  deltaSeconds: number,
  pads: readonly LandingPad[] = LUNAR_LANDER_PADS,
): LanderState {
  if (state.status !== "flying") return state;

  const dt = clamp(deltaSeconds, 0, 0.08);
  const rotate = clamp(input.rotate, -1, 1);
  const nextAngle = clamp(
    state.angle + rotate * ROTATION_DEGREES_PER_SECOND * dt,
    -MAX_ABS_ANGLE,
    MAX_ABS_ANGLE,
  );
  const thrusting = input.thrust && state.fuel > 0;
  const radians = (nextAngle * Math.PI) / 180;
  const thrustX = thrusting ? Math.sin(radians) * THRUST_ACCELERATION : 0;
  const thrustY = thrusting ? Math.cos(radians) * THRUST_ACCELERATION : 0;
  const nextFuel = thrusting
    ? Math.max(0, state.fuel - FUEL_BURN_PER_SECOND * dt)
    : state.fuel;
  const nextVelocity = {
    x: state.velocity.x + thrustX * dt,
    y: state.velocity.y + (GRAVITY + thrustY) * dt,
  };
  const nextPosition = {
    x: state.position.x + nextVelocity.x * dt,
    y: Math.max(0, state.position.y + nextVelocity.y * dt),
  };
  const nextState: LanderState = {
    position: nextPosition,
    velocity: nextVelocity,
    angle: nextAngle,
    fuel: nextFuel,
    status: "flying",
  };

  if (nextPosition.y === 0) {
    return {
      ...nextState,
      status: classifyTouchdown(nextState, pads),
    };
  }

  return nextState;
}
