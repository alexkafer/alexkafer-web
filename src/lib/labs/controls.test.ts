import assert from "node:assert/strict";
import test from "node:test";
import { getKeyboardControlAction } from "./controls";

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
});
