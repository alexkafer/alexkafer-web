import assert from "node:assert/strict";
import test from "node:test";
import {
  combineLanderInputs,
  getKeyboardControlAction,
  getLunarLanderGamepadControl,
  hasActiveLanderInput,
  type GamepadButtonLike,
  type LunarLanderGamepadLike,
} from "./controls";

function createButtons(pressed: Record<number, boolean | number> = {}): GamepadButtonLike[] {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));

  Object.entries(pressed).forEach(([index, value]) => {
    const numericValue = typeof value === "number" ? value : value ? 1 : 0;
    buttons[Number(index)] = {
      pressed: numericValue > 0,
      value: numericValue,
    };
  });

  return buttons;
}

function createGamepad({
  id = "Xbox Wireless Controller",
  axes = [],
  buttons = {},
}: {
  id?: string;
  axes?: readonly number[];
  buttons?: Record<number, boolean | number>;
} = {}): LunarLanderGamepadLike {
  return {
    id,
    connected: true,
    axes,
    buttons: createButtons(buttons),
  };
}

test("getKeyboardControlAction maps Space to reset", () => {
  assert.deepEqual(getKeyboardControlAction("Space"), { kind: "reset" });
});

test("getKeyboardControlAction maps flight keys to thrust and rotation", () => {
  assert.deepEqual(getKeyboardControlAction("ArrowUp"), {
    kind: "thrust",
  });
  assert.deepEqual(getKeyboardControlAction("ArrowLeft"), {
    kind: "rotate",
    direction: -1,
  });
  assert.deepEqual(getKeyboardControlAction("ArrowRight"), {
    kind: "rotate",
    direction: 1,
  });
  assert.deepEqual(getKeyboardControlAction("KeyQ"), {
    kind: "lateral",
    direction: -1,
  });
  assert.deepEqual(getKeyboardControlAction("KeyE"), {
    kind: "lateral",
    direction: 1,
  });
});

test("getLunarLanderGamepadControl maps Xbox thrust, rotation, and actions", () => {
  const control = getLunarLanderGamepadControl([
    createGamepad({
      axes: [0.72, 0, -0.64],
      buttons: {
        7: 0.8,
        9: true,
        3: true,
      },
    }),
  ]);

  assert.deepEqual(control, {
    id: "Xbox Wireless Controller",
    input: { thrust: true, rotate: 0.72, lateral: -0.64 },
    spawn: true,
    reset: true,
    cameraPan: -0.64,
  });
});

test("getLunarLanderGamepadControl uses bumpers and d-pad for digital rotation", () => {
  assert.equal(
    getLunarLanderGamepadControl([createGamepad({ axes: [0.72], buttons: { 4: true } })])?.input
      .rotate,
    -1,
  );
  assert.equal(
    getLunarLanderGamepadControl([createGamepad({ axes: [-0.72], buttons: { 15: true } })])?.input
      .rotate,
    1,
  );
});

test("getLunarLanderGamepadControl ignores disconnected controllers and stick drift", () => {
  assert.equal(
    getLunarLanderGamepadControl([
      { ...createGamepad(), connected: false },
      createGamepad({ axes: [0.12], buttons: {} }),
    ])?.input.rotate,
    0,
  );
});

test("combineLanderInputs merges keyboard and controller controls", () => {
  assert.deepEqual(
    combineLanderInputs(
      { thrust: false, rotate: -0.7, lateral: -0.6 },
      { thrust: true, rotate: 0.4, lateral: 0.2 },
    ),
    { thrust: true, rotate: -0.3, lateral: -0.4 },
  );
  assert.deepEqual(
    combineLanderInputs({ thrust: false, rotate: -1 }, { thrust: false, rotate: -1 }),
    { thrust: false, rotate: -1 },
  );
});

test("hasActiveLanderInput only treats thrust, rotation, or lateral thrust as active", () => {
  assert.equal(hasActiveLanderInput({ thrust: false, rotate: 0 }), false);
  assert.equal(hasActiveLanderInput({ thrust: true, rotate: 0 }), true);
  assert.equal(hasActiveLanderInput({ thrust: false, rotate: -1 }), true);
  assert.equal(hasActiveLanderInput({ thrust: false, rotate: 0, lateral: 1 }), true);
});
