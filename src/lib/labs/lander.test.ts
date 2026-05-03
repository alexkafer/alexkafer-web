import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LANDER_FLIGHT_STATS,
  LUNAR_LANDER_PADS,
  LUNAR_TERRAIN_POINTS,
  classifyTouchdown,
  createInitialLanderState,
  landerTerrainContacts,
  startLander,
  stepLander,
  terrainSurfaceY,
} from "./lander";

test("createInitialLanderState starts in attract mode until play begins", () => {
  const idle = createInitialLanderState();
  const flying = startLander(idle);

  assert.equal(idle.status, "idle");
  assert.equal(flying.status, "flying");
});

test("default flight stats preserve the existing fixed-craft behavior", () => {
  const initial = createInitialLanderState();
  const state = {
    ...startLander(initial),
    velocity: { x: 0, y: 0 },
  };
  const next = stepLander(state, { thrust: true, rotate: 0 }, 0.08);
  const rotating = stepLander(state, { thrust: false, rotate: 1 }, 0.08);

  assert.equal(initial.fuel, 1000);
  assert.equal(rotating.angle, 8.96);
  assert.equal(next.velocity.y, 1.8);
  assert.equal(next.fuel, 999.04);
});

test("stepLander makes thrust slow descent and consume fuel", () => {
  const state = {
    ...startLander(createInitialLanderState()),
    velocity: { x: 0, y: -24 },
    fuel: 500,
  };

  const drifting = stepLander(state, { thrust: false, rotate: 0 }, 0.5);
  const burning = stepLander(state, { thrust: true, rotate: 0 }, 0.5);

  assert.ok(burning.velocity.y > drifting.velocity.y);
  assert.ok(burning.fuel < drifting.fuel);
});

test("stepLander applies upgraded lateral thrusters and separate fuel burn", () => {
  const state = {
    ...startLander(createInitialLanderState()),
    velocity: { x: 0, y: 0 },
    fuel: 500,
  };
  const baseline = stepLander(state, { thrust: false, rotate: 0 }, 0.08);
  const upgraded = stepLander(
    state,
    { thrust: false, rotate: 0, lateral: 2 },
    0.08,
    LUNAR_LANDER_PADS,
    LUNAR_TERRAIN_POINTS,
    {
      ...DEFAULT_LANDER_FLIGHT_STATS,
      lateralThrustAcceleration: 8,
      lateralFuelBurnPerSecond: 2,
    },
  );

  assert.equal(upgraded.velocity.x, baseline.velocity.x + 0.64);
  assert.equal(upgraded.fuel, baseline.fuel - 0.16);
});

test("stepLander ignores lateral input without lateral thrusters", () => {
  const state = {
    ...startLander(createInitialLanderState()),
    velocity: { x: 0, y: 0 },
    fuel: 500,
  };

  assert.deepEqual(
    stepLander(state, { thrust: false, rotate: 0, lateral: -1 }, 0.08),
    stepLander(state, { thrust: false, rotate: 0 }, 0.08),
  );
});

test("classifyTouchdown lands safely inside a designated pad", () => {
  const x = LUNAR_LANDER_PADS[0].x + 25;
  const result = classifyTouchdown(
    {
      ...createInitialLanderState(),
      status: "flying",
      position: { x, y: terrainSurfaceY(x) + 14 },
      velocity: { x: 2, y: -5 },
      angle: 3,
    },
    LUNAR_LANDER_PADS,
  );

  assert.equal(result, "landed");
});

test("classifyTouchdown uses supplied flight safety stats", () => {
  const x = LUNAR_LANDER_PADS[0].x + 25;
  const result = classifyTouchdown(
    {
      ...createInitialLanderState(),
      status: "flying",
      position: { x, y: terrainSurfaceY(x) + 14 },
      velocity: { x: 2, y: -18 },
      angle: 3,
    },
    LUNAR_LANDER_PADS,
    LUNAR_TERRAIN_POINTS,
    { ...DEFAULT_LANDER_FLIGHT_STATS, safeVerticalSpeed: 20 },
  );

  assert.equal(result, "landed");
});

test("classifyTouchdown crashes when speed or target alignment is unsafe", () => {
  const padX = LUNAR_LANDER_PADS[0].x + 25;
  const offPadX = LUNAR_LANDER_PADS[0].x - 20;
  const tooFast = classifyTouchdown(
    {
      ...createInitialLanderState(),
      status: "flying",
      position: { x: padX, y: terrainSurfaceY(padX) + 14 },
      velocity: { x: 2, y: -18 },
      angle: 3,
    },
    LUNAR_LANDER_PADS,
  );
  const offPad = classifyTouchdown(
    {
      ...createInitialLanderState(),
      status: "flying",
      position: { x: offPadX, y: terrainSurfaceY(offPadX) + 14 },
      velocity: { x: 2, y: -5 },
      angle: 3,
    },
    LUNAR_LANDER_PADS,
  );

  assert.equal(tooFast, "crashed");
  assert.equal(offPad, "crashed");
});

test("terrain contact uses the lander feet instead of the center point", () => {
  const x = LUNAR_LANDER_PADS[0].x + 25;
  const surfaceY = terrainSurfaceY(x);
  const clear = {
    ...startLander(createInitialLanderState()),
    position: { x, y: surfaceY + 16 },
    velocity: { x: 0, y: -2 },
    angle: 0,
  };
  const touching = {
    ...clear,
    position: { x, y: surfaceY + 13 },
  };

  assert.equal(landerTerrainContacts(clear).length, 0);
  assert.ok(landerTerrainContacts(touching).some((contact) => contact.kind === "foot"));
});

test("stepLander lands as soon as the feet touch a safe pad", () => {
  const x = LUNAR_LANDER_PADS[0].x + 25;
  const next = stepLander(
    {
      ...startLander(createInitialLanderState()),
      position: { x, y: terrainSurfaceY(x) + 13 },
      velocity: { x: 0, y: -2 },
      angle: 0,
    },
    { thrust: false, rotate: 0 },
    0,
  );

  assert.equal(next.status, "landed");
  assert.equal(next.position.y, terrainSurfaceY(x) + 14);
});

test("stepLander uses supplied mutable terrain for touchdown checks", () => {
  const terrain = [
    { x: -100, y: 40 },
    { x: 100, y: 40 },
  ];
  const pads = [{ x: -30, width: 60, label: "1x", multiplier: 1 }];
  const next = stepLander(
    {
      ...startLander(createInitialLanderState()),
      position: { x: 0, y: terrainSurfaceY(0, terrain) + 14 },
      velocity: { x: 0, y: -2 },
      angle: 0,
    },
    { thrust: false, rotate: 0 },
    0,
    pads,
    terrain,
  );

  assert.equal(next.status, "landed");
  assert.equal(next.position.y, terrainSurfaceY(0, terrain) + 14);
});
