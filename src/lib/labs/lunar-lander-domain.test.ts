import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LANDER_BLUEPRINT,
  LUNAR_AUTOMATION_DEFINITIONS,
  LUNAR_BODY_DEFINITIONS,
  LUNAR_LANDER_COMPONENTS,
  LUNAR_ROOM_DEFINITIONS,
  addResourceMaps,
  checkComponentRequirements,
  createResourceMap,
  deriveLanderStats,
  hasResources,
  isTechUnlocked,
  validateLanderBlueprint,
  type LunarLanderBlueprint,
} from "./lunar-lander-domain";

test("default lander blueprint derives the existing fixed-craft stats", () => {
  const stats = deriveLanderStats(DEFAULT_LANDER_BLUEPRINT);

  assert.equal(stats.fuelCapacity, 1000);
  assert.equal(stats.mainThrustAcceleration, 38);
  assert.equal(stats.fuelBurnPerSecond, 12);
  assert.equal(stats.lateralFuelBurnPerSecond, 0);
  assert.equal(stats.rotationDegreesPerSecond, 112);
  assert.equal(stats.maxAbsAngle, 82);
  assert.equal(stats.safeVerticalSpeed, 16);
  assert.equal(stats.safeHorizontalSpeed, 18);
  assert.equal(stats.safeAbsAngle, 10);
  assert.equal(stats.lateralThrustAcceleration, 0);
  assert.equal(stats.hasFlightComputer, false);
  assert.equal(stats.hasSafetySystem, false);
  assert.equal(stats.cargoCapacity, 0);
  assert.equal(stats.baseKitCapacity, 0);
  assert.ok(stats.mass > 0);
});

test("lateral thruster upgrade derives separate side-thruster fuel burn", () => {
  const stats = deriveLanderStats({
    ...DEFAULT_LANDER_BLUEPRINT,
    componentIds: [...DEFAULT_LANDER_BLUEPRINT.componentIds, "puff-lateral-thrusters"],
  });

  assert.equal(stats.fuelBurnPerSecond, 12);
  assert.equal(stats.lateralThrustAcceleration, 8);
  assert.equal(stats.lateralFuelBurnPerSecond, 2);
});

test("resource helpers create, add, and compare resource maps", () => {
  const starting = createResourceMap({ fuel: 100, ore: 5, water: 0 });
  const delta = createResourceMap({ fuel: -20, metal: 3 });
  const combined = addResourceMaps(starting, delta, { ore: 4 });

  assert.deepEqual(starting, { fuel: 100, ore: 5 });
  assert.deepEqual(combined, { fuel: 80, ore: 9, metal: 3 });
  assert.equal(hasResources(combined, { fuel: 80, ore: 9 }), true);
  assert.equal(hasResources(combined, { fuel: 81 }), false);
});

test("blueprint validation reports missing and duplicate required parts", () => {
  const incomplete: LunarLanderBlueprint = {
    id: "invalid-lander",
    name: "Invalid lander",
    description: "Missing several required parts and has two capsules.",
    componentIds: ["training-capsule", "training-capsule", "training-main-engine"],
  };

  const result = validateLanderBlueprint(incomplete);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.includes("Duplicate capsule")));
    assert.ok(result.errors.some((error) => error.includes("Missing required fuel-tank")));
    assert.ok(result.errors.some((error) => error.includes("Missing required landing-gear")));
    assert.ok(result.errors.some((error) => error.includes("Missing required attitude-control")));
  }
});

test("valid default blueprint resolves components and stats", () => {
  const result = validateLanderBlueprint(DEFAULT_LANDER_BLUEPRINT);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.components.length, DEFAULT_LANDER_BLUEPRINT.componentIds.length);
    assert.equal(result.value.stats.fuelCapacity, 1000);
  }
});

test("component and tech requirement helpers detect locked upgrades", () => {
  const guidance = LUNAR_LANDER_COMPONENTS["guidance-computer-mk1"];
  const safety = LUNAR_LANDER_COMPONENTS["landing-safety-package"];

  assert.equal(isTechUnlocked("flight-computers", ["flight-computers"]), true);
  assert.equal(isTechUnlocked("safety-systems", new Set(["flight-computers"])), false);

  assert.deepEqual(checkComponentRequirements(guidance, []).missingTech, ["flight-computers"]);
  assert.equal(checkComponentRequirements(guidance, ["flight-computers"]).ok, true);

  const safetyCheck = checkComponentRequirements(safety, ["safety-systems"], []);
  assert.equal(safetyCheck.ok, false);
  assert.deepEqual(safetyCheck.missingComponents, ["guidance-computer-mk1"]);
});

test("body, room, and automation default data exposes the first progression hooks", () => {
  assert.equal(LUNAR_BODY_DEFINITIONS.moon.unlockedByDefault, true);
  assert.equal(LUNAR_BODY_DEFINITIONS.moon.stationId, "moon-orbit");
  assert.ok(LUNAR_ROOM_DEFINITIONS["command-habitat"].storage?.oxygen);
  assert.deepEqual(LUNAR_ROOM_DEFINITIONS["ice-processor"].requiredTech, ["ice-processing"]);
  assert.deepEqual(LUNAR_AUTOMATION_DEFINITIONS["auto-mining"].requiredRooms, ["regolith-mine"]);
  assert.deepEqual(LUNAR_AUTOMATION_DEFINITIONS["auto-logistics"].requiredTech, [
    "automation-control",
    "interplanetary-navigation",
  ]);
});
