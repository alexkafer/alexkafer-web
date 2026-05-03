import assert from "node:assert/strict";
import test from "node:test";
import {
  LUNAR_LANDER_PADS,
  classifyTouchdown,
  createInitialLanderState,
  stepLander,
} from "./lander";

test("stepLander makes thrust slow descent and consume fuel", () => {
  const state = {
    ...createInitialLanderState(),
    velocity: { x: 0, y: -24 },
    fuel: 50,
  };

  const drifting = stepLander(state, { thrust: false, rotate: 0 }, 0.5);
  const burning = stepLander(state, { thrust: true, rotate: 0 }, 0.5);

  assert.ok(burning.velocity.y > drifting.velocity.y);
  assert.ok(burning.fuel < drifting.fuel);
});

test("classifyTouchdown lands safely inside a designated pad", () => {
  const result = classifyTouchdown(
    {
      ...createInitialLanderState(),
      position: { x: LUNAR_LANDER_PADS[0].x + 8, y: 0 },
      velocity: { x: 2, y: -5 },
      angle: 3,
    },
    LUNAR_LANDER_PADS,
  );

  assert.equal(result, "landed");
});

test("classifyTouchdown crashes when speed or target alignment is unsafe", () => {
  const tooFast = classifyTouchdown(
    {
      ...createInitialLanderState(),
      position: { x: LUNAR_LANDER_PADS[0].x + 8, y: 0 },
      velocity: { x: 2, y: -18 },
      angle: 3,
    },
    LUNAR_LANDER_PADS,
  );
  const offPad = classifyTouchdown(
    {
      ...createInitialLanderState(),
      position: { x: 0, y: 0 },
      velocity: { x: 2, y: -5 },
      angle: 3,
    },
    LUNAR_LANDER_PADS,
  );

  assert.equal(tooFast, "crashed");
  assert.equal(offPad, "crashed");
});
