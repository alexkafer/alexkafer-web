import assert from "node:assert/strict";
import test from "node:test";
import { createLunarLanderWorldStore } from "./lunar-lander-world";
import {
  LUNAR_LANDER_PADS,
  createInitialLanderState,
  startLander,
  terrainSurfaceY,
} from "./lander";
import {
  DEFAULT_LANDER_BLUEPRINT,
  LUNAR_STATIONS,
  STARTER_BASE_KIT_LANDER_BLUEPRINT,
  deriveLanderStats,
  type LunarLanderBlueprint,
  type LunarTechId,
} from "./lunar-lander-domain";

const INTERPLANETARY_TECH: LunarTechId[] = [
  "orbital-survey",
  "flight-computers",
  "interplanetary-navigation",
];

const BASE_KIT_BLUEPRINT: LunarLanderBlueprint = {
  id: "base-kit-test-lander",
  name: "Base kit test lander",
  description: "Test lander carrying a starter base kit.",
  componentIds: [...DEFAULT_LANDER_BLUEPRINT.componentIds, "compact-base-kit"],
  cargo: { metal: 300, ice: 10 },
};

const TRAVEL_BASE_KIT_BLUEPRINT: LunarLanderBlueprint = {
  ...BASE_KIT_BLUEPRINT,
  id: "travel-base-kit-test-lander",
  name: "Travel base kit test lander",
  cargo: { fuel: 500, metal: 300, ice: 10, oxygen: 20 },
};

function serializedStateForBlueprint(blueprintId: string, now: number) {
  return {
    version: 1 as const,
    activeBodyId: "moon" as const,
    commanders: [
      {
        id: "commander-default",
        label: "Commander",
        resources: {},
        unlockedTech: [],
        selectedBlueprintId: blueprintId,
        createdAt: now,
        updatedAt: now,
      },
    ],
    bodies: [],
    stations: Object.values(LUNAR_STATIONS),
    bases: [],
    flights: [],
    landers: [],
    spawnCount: 0,
    worldEventCount: 0,
    economyUpdatedAt: now,
  };
}

function createLandingStore(nowRef: { value: number }, blueprint = BASE_KIT_BLUEPRINT) {
  const landingX = LUNAR_LANDER_PADS[0].x + LUNAR_LANDER_PADS[0].width / 2;
  const landingSurfaceY = terrainSurfaceY(landingX);
  const store = createLunarLanderWorldStore({
    now: () => nowRef.value,
    createId: () => `lander-${nowRef.value}`,
    createToken: () => `token-${nowRef.value}`,
    blueprints: [blueprint],
    serializedState: serializedStateForBlueprint(blueprint.id, nowRef.value),
    createSpawnState: (spawnIndex, stats) =>
      startLander({
        ...createInitialLanderState(stats),
        position: { x: landingX, y: landingSurfaceY + (spawnIndex === 0 ? 18 : 80) },
        velocity: { x: 0, y: spawnIndex === 0 ? -2 : -80 },
        angle: spawnIndex === 0 ? 0 : 25,
      }),
  });

  return { store, landingX };
}

function createInterplanetaryStore(nowRef: { value: number }) {
  return createLunarLanderWorldStore({
    now: () => nowRef.value,
    serializedState: {
      ...serializedStateForBlueprint(DEFAULT_LANDER_BLUEPRINT.id, nowRef.value),
      commanders: [
        {
          id: "commander-default",
          label: "Commander",
          resources: {},
          unlockedTech: INTERPLANETARY_TECH,
          selectedBlueprintId: DEFAULT_LANDER_BLUEPRINT.id,
          createdAt: nowRef.value,
          updatedAt: nowRef.value,
        },
      ],
    },
  });
}

test("world store spawns landers into the shared snapshot", () => {
  const store = createLunarLanderWorldStore({
    now: () => 1_000,
    createId: () => "lander-1",
    createToken: () => "token-1",
  });

  const spawned = store.spawnLander("phone");
  const snapshot = store.readWorldSnapshot();

  assert.equal(spawned.lander.id, "lander-1");
  assert.equal(spawned.controlToken, "token-1");
  assert.equal(spawned.lander.pilot, "phone");
  assert.equal(spawned.lander.state.status, "flying");
  assert.equal(snapshot.landers.length, 1);
  assert.equal(snapshot.landers[0].label, "L-01");
});

test("world store clamps controls and requires the lander control token", () => {
  const store = createLunarLanderWorldStore({
    now: () => 1_000,
    createId: () => "lander-1",
    createToken: () => "token-1",
  });

  const spawned = store.spawnLander();

  assert.equal(
    store.writeControl(spawned.lander.id, "wrong-token", { thrust: true, rotate: 1 }),
    null,
  );

  const controlled = store.writeControl(spawned.lander.id, spawned.controlToken, {
    thrust: true,
    rotate: 9,
  });

  assert.equal(controlled?.input.thrust, true);
  assert.equal(controlled?.input.rotate, 1);
});

test("world store advances physics when snapshots are read", () => {
  let now = 1_000;
  const store = createLunarLanderWorldStore({
    now: () => now,
    createId: () => "lander-1",
    createToken: () => "token-1",
  });

  const spawned = store.spawnLander();
  store.writeControl(spawned.lander.id, spawned.controlToken, {
    thrust: true,
    rotate: 0,
  });
  now += 500;

  const snapshot = store.readWorldSnapshot();

  assert.equal(snapshot.landers.length, 1);
  assert.ok(snapshot.landers[0].elapsed > 0);
  assert.ok(snapshot.landers[0].state.fuel < spawned.lander.state.fuel);
});

test("world store applies controls until the stale cutoff within a long tick", () => {
  let now = 1_000;
  const store = createLunarLanderWorldStore({
    now: () => now,
    createId: () => "lander-1",
    createToken: () => "token-1",
    inputStaleMs: 500,
  });

  const spawned = store.spawnLander();
  store.writeControl(spawned.lander.id, spawned.controlToken, {
    thrust: true,
    rotate: 0,
  });
  now += 600;

  const snapshot = store.readWorldSnapshot();

  assert.ok(snapshot.landers[0].state.fuel < spawned.lander.state.fuel);
});

test("world store expires stale landers", () => {
  let now = 1_000;
  const store = createLunarLanderWorldStore({
    now: () => now,
    createId: () => "lander-1",
    createToken: () => "token-1",
    ttlMs: 100,
  });

  store.spawnLander();
  now += 15_000;

  const snapshot = store.readWorldSnapshot();

  assert.equal(snapshot.landers.length, 0);
  assert.equal(snapshot.crashes.length, 0);
});

test("world store records crash explosions and permanently craters terrain", () => {
  let now = 1_000;
  const store = createLunarLanderWorldStore({
    now: () => now,
    createId: () => "lander-1",
    createToken: () => "token-1",
  });

  store.spawnLander();
  now += 15_000;
  const snapshot = store.readWorldSnapshot();
  const crash = snapshot.crashes[0];

  assert.equal(snapshot.landers[0].state.status, "crashed");
  assert.equal(snapshot.crashes.length, 1);
  assert.ok(terrainSurfaceY(crash.x, snapshot.terrain) < terrainSurfaceY(crash.x));
  assert.equal(store.readWorldSnapshot().crashes.length, 1);
});

test("world store records landed outposts and smoothed terrain platforms", () => {
  let now = 1_000;
  const landingX = LUNAR_LANDER_PADS[0].x + LUNAR_LANDER_PADS[0].width / 2;
  const landingSurfaceY = terrainSurfaceY(landingX);
  const store = createLunarLanderWorldStore({
    now: () => now,
    createId: () => "lander-1",
    createToken: () => "token-1",
    createSpawnState: () =>
      startLander({
        ...createInitialLanderState(),
        position: { x: landingX, y: landingSurfaceY + 18 },
        velocity: { x: 0, y: -2 },
        angle: 0,
      }),
  });

  store.spawnLander();
  now += 1_000;
  const snapshot = store.readWorldSnapshot();
  const outpost = snapshot.outposts[0];

  assert.equal(snapshot.landers[0].state.status, "landed");
  assert.equal(snapshot.outposts.length, 1);
  assert.equal(outpost.claimedPad?.label, LUNAR_LANDER_PADS[0].label);
  assert.equal(snapshot.landingPads.length, LUNAR_LANDER_PADS.length);
  assert.equal(
    snapshot.landingPads.some((pad) => pad.x === LUNAR_LANDER_PADS[0].x),
    false,
  );
  assert.ok(snapshot.landingPads.some((pad) => pad.label === LUNAR_LANDER_PADS[0].label));
  assert.equal(outpost.x, snapshot.landers[0].state.position.x);
  assert.ok(outpost.deckY > outpost.surfaceY);
  assert.ok(
    snapshot.terrain.some((point) => point.x === outpost.x && point.y === outpost.surfaceY),
  );
});

test("world store bakes completed platforms into terrain for stacked landings", () => {
  let now = 1_000;
  let completedDeckY = 0;
  const landingX = LUNAR_LANDER_PADS[0].x + LUNAR_LANDER_PADS[0].width / 2;
  const landingSurfaceY = terrainSurfaceY(landingX);
  const store = createLunarLanderWorldStore({
    now: () => now,
    createId: () => `lander-${now}`,
    createToken: () => `token-${now}`,
    createSpawnState: (spawnIndex) =>
      startLander({
        ...createInitialLanderState(),
        position: {
          x: landingX,
          y: (spawnIndex === 0 ? landingSurfaceY : completedDeckY) + 18,
        },
        velocity: { x: 0, y: -2 },
        angle: 0,
      }),
  });

  const first = store.spawnLander();
  now += 1_000;
  let snapshot = store.readWorldSnapshot();
  const firstOutpost = snapshot.outposts[0];

  assert.equal(snapshot.landers[0].state.status, "landed");
  assert.equal(firstOutpost.terrainAppliedAt, null);
  assert.notEqual(terrainSurfaceY(landingX, snapshot.terrain), firstOutpost.deckY);

  now = firstOutpost.createdAt + 5_000;
  snapshot = store.readWorldSnapshot();
  completedDeckY = firstOutpost.deckY;

  assert.equal(snapshot.outposts[0].terrainAppliedAt, now);
  assert.equal(terrainSurfaceY(landingX, snapshot.terrain), completedDeckY);

  const second = store.spawnLander();
  now += 1_000;
  snapshot = store.readWorldSnapshot();

  assert.notEqual(second.lander.id, first.lander.id);
  assert.equal(snapshot.landers.find((lander) => lander.id === second.lander.id)?.state.status, "landed");
  assert.equal(snapshot.outposts.length, 2);
  assert.ok(snapshot.outposts[1].deckY > completedDeckY);
});

test("world store snapshots commander loadout and default flight stats", () => {
  const store = createLunarLanderWorldStore({
    now: () => 1_000,
    createId: () => "lander-1",
    createToken: () => "token-1",
  });

  store.spawnLander("phone");
  const snapshot = store.readWorldSnapshot();
  const lander = snapshot.landers[0];

  assert.equal(snapshot.commanders.length, 1);
  assert.equal(snapshot.commanders[0].selectedBlueprintId, DEFAULT_LANDER_BLUEPRINT.id);
  assert.ok(snapshot.commanders[0].unlockedTech.includes("base-habitat"));
  assert.ok((snapshot.commanders[0].resources.research ?? 0) > 0);
  assert.equal(lander.commanderId, snapshot.commanders[0].id);
  assert.equal(lander.blueprintId, DEFAULT_LANDER_BLUEPRINT.id);
  assert.equal(lander.blueprintName, DEFAULT_LANDER_BLUEPRINT.name);
  assert.deepEqual(lander.installedComponentIds, DEFAULT_LANDER_BLUEPRINT.componentIds);
  assert.deepEqual(lander.flightStats, deriveLanderStats(DEFAULT_LANDER_BLUEPRINT));
});

test("world store clamps and persists lateral controls", () => {
  const store = createLunarLanderWorldStore({
    now: () => 1_000,
    createId: () => "lander-1",
    createToken: () => "token-1",
  });

  const spawned = store.spawnLander();
  const controlled = store.writeControl(spawned.lander.id, spawned.controlToken, {
    thrust: false,
    rotate: 0,
    lateral: 8,
  });
  const snapshot = store.readWorldSnapshot();

  assert.equal(controlled?.input.lateral, 1);
  assert.equal(snapshot.landers[0].input.lateral, 1);
});

test("world store exposes active moon body through top-level aliases", () => {
  const store = createLunarLanderWorldStore({
    now: () => 1_000,
    createId: () => "lander-1",
    createToken: () => "token-1",
  });

  const snapshot = store.readWorldSnapshot();
  const moon = snapshot.bodies.find((body) => body.id === "moon");

  assert.equal(snapshot.activeBodyId, "moon");
  assert.ok(moon);
  assert.deepEqual(snapshot.terrain, moon.terrain);
  assert.deepEqual(snapshot.crashes, moon.crashes);
  assert.deepEqual(snapshot.outposts, moon.outposts);
  assert.deepEqual(snapshot.landingPads, moon.landingPads);
  assert.equal(snapshot.bases.length, 0);
  assert.equal(snapshot.flights.length, 0);
  assert.ok(snapshot.stations.some((station) => station.id === "moon-orbit"));
});

test("world store serializes and rehydrates authoritative state", () => {
  let now = 1_000;
  const store = createLunarLanderWorldStore({
    now: () => now,
    createId: () => "lander-1",
    createToken: () => "token-1",
  });
  const spawned = store.spawnLander();
  store.writeControl(spawned.lander.id, spawned.controlToken, {
    thrust: true,
    rotate: 1,
    lateral: -4,
  });
  now += 250;
  const serialized = store.serializeWorld();
  const before = store.readWorldSnapshot();
  const rehydrated = createLunarLanderWorldStore({
    now: () => now,
    serializedState: serialized,
  });
  const after = rehydrated.readWorldSnapshot();
  const controlled = rehydrated.writeControl(spawned.lander.id, spawned.controlToken, {
    thrust: false,
    rotate: -1,
    lateral: 0,
  });

  assert.deepEqual(after.commanders, before.commanders);
  assert.deepEqual(after.terrain, before.terrain);
  assert.equal(after.landers[0].id, before.landers[0].id);
  assert.equal(after.landers[0].input.lateral, -1);
  assert.equal(controlled?.input.rotate, -1);
});

test("base-kit landing creates a base while default landing only creates an outpost", () => {
  let now = 1_000;
  const landingX = LUNAR_LANDER_PADS[0].x + LUNAR_LANDER_PADS[0].width / 2;
  const landingSurfaceY = terrainSurfaceY(landingX);
  const defaultStore = createLunarLanderWorldStore({
    now: () => now,
    createId: () => "default-lander",
    createToken: () => "default-token",
    createSpawnState: () =>
      startLander({
        ...createInitialLanderState(),
        position: { x: landingX, y: landingSurfaceY + 18 },
        velocity: { x: 0, y: -2 },
        angle: 0,
      }),
  });

  defaultStore.spawnLander();
  now += 1_000;
  let snapshot = defaultStore.readWorldSnapshot();
  assert.equal(snapshot.outposts.length, 1);
  assert.equal(snapshot.bases.length, 0);

  const nowRef = { value: 1_000 };
  const { store } = createLandingStore(nowRef);
  store.spawnLander();
  nowRef.value += 1_000;
  snapshot = store.readWorldSnapshot();

  assert.equal(snapshot.outposts.length, 1);
  assert.equal(snapshot.bases.length, 1);
  assert.equal(snapshot.bases[0].bodyId, "moon");
  assert.deepEqual(
    snapshot.bases[0].rooms.map((room) => room.roomId),
    ["command-habitat", "landing-pad"],
  );
  assert.equal(snapshot.bases[0].storage.metal, 300);
});

test("world store can spawn the starter base-kit blueprint on demand", () => {
  const store = createLunarLanderWorldStore({
    now: () => 1_000,
    createId: () => "lander-1",
    createToken: () => "token-1",
  });

  const spawned = store.spawnLander("desktop", { blueprintId: STARTER_BASE_KIT_LANDER_BLUEPRINT.id });

  assert.equal(spawned.lander.blueprintId, STARTER_BASE_KIT_LANDER_BLUEPRINT.id);
  assert.equal(spawned.lander.blueprintName, STARTER_BASE_KIT_LANDER_BLUEPRINT.name);
  assert.deepEqual(spawned.lander.installedComponentIds, STARTER_BASE_KIT_LANDER_BLUEPRINT.componentIds);
});

test("base economy ticks production from completed rooms", () => {
  const nowRef = { value: 1_000 };
  const { store } = createLandingStore(nowRef);
  store.spawnLander();
  nowRef.value += 1_000;
  let snapshot = store.readWorldSnapshot();
  const baseId = snapshot.bases[0].id;

  const queued = store.queueBaseRoom(baseId, "regolith-mine");
  assert.equal(queued.ok, true);
  nowRef.value += 5_000;
  snapshot = store.readWorldSnapshot();
  assert.equal(snapshot.bases[0].buildQueue.length, 0);
  assert.ok(snapshot.bases[0].rooms.some((room) => room.roomId === "regolith-mine"));

  nowRef.value += 1_000;
  snapshot = store.readWorldSnapshot();
  assert.equal(snapshot.bases[0].storage.regolith, 4);
  assert.equal(snapshot.bases[0].storage.ore, 1);
  assert.equal(snapshot.bases[0].economyUpdatedAt, nowRef.value);
});

test("crashes damage intersecting base and room integrity", () => {
  const nowRef = { value: 1_000 };
  const { store } = createLandingStore(nowRef);
  store.spawnLander();
  nowRef.value += 1_000;
  const before = store.readWorldSnapshot().bases[0];

  store.spawnLander();
  nowRef.value += 2_000;
  const after = store.readWorldSnapshot().bases[0];

  assert.ok(after.integrity < before.integrity);
  assert.ok(after.rooms[0].integrity < before.rooms[0].integrity);
  assert.equal(after.damageEvents.length, 1);
});

test("base build and repair actions validate and mutate base state", () => {
  const nowRef = { value: 1_000 };
  const { store } = createLandingStore(nowRef);
  store.spawnLander();
  nowRef.value += 1_000;
  let snapshot = store.readWorldSnapshot();
  const baseId = snapshot.bases[0].id;

  const invalid = store.queueBaseRoom(baseId, "not-a-room" as never);
  assert.equal(invalid.ok, false);

  const lockedRoom = store.queueBaseRoom(baseId, "ice-processor");
  assert.equal(lockedRoom.ok, false);
  assert.match(lockedRoom.ok ? "" : lockedRoom.error, /Missing required tech/);

  const queued = store.queueBaseRoom(baseId, "storage-bay");
  assert.equal(queued.ok, true);
  snapshot = store.readWorldSnapshot();
  assert.equal(snapshot.bases[0].storage.metal, 250);
  assert.equal(snapshot.bases[0].buildQueue.length, 1);

  snapshot.bases[0].storage.metal = 999;
  assert.notEqual(store.readWorldSnapshot().bases[0].storage.metal, 999);

  store.spawnLander();
  nowRef.value += 2_000;
  snapshot = store.readWorldSnapshot();
  const damagedBase = snapshot.bases[0];
  const repaired = store.repairBase(baseId, { amount: 20 });
  assert.equal(repaired.ok, true);
  const afterRepair = store.readWorldSnapshot().bases[0];
  assert.ok(afterRepair.integrity >= damagedBase.integrity);
  assert.ok((afterRepair.storage.metal ?? 0) < (damagedBase.storage.metal ?? 0));
});

test("base actions validate lander token auth and base ownership when supplied", () => {
  const nowRef = { value: 1_000 };
  const { store } = createLandingStore(nowRef);
  const spawned = store.spawnLander();
  nowRef.value += 1_000;
  const baseId = store.readWorldSnapshot().bases[0].id;

  const badToken = store.queueBaseRoom(baseId, "storage-bay", {
    auth: { landerId: spawned.lander.id, token: "wrong-token" },
  });
  const authorized = store.queueBaseRoom(baseId, "storage-bay", {
    auth: { landerId: spawned.lander.id, token: spawned.controlToken },
  });

  assert.equal(badToken.ok, false);
  assert.equal(badToken.ok ? "" : badToken.error, "Unauthorized");
  assert.equal(authorized.ok, true);

  const serialized = store.serializeWorld();
  const stolenBase = {
    ...serialized.bases[0],
    commanderId: "commander-other",
    storage: { ...serialized.bases[0].storage, metal: 300 },
    buildQueue: [],
  };
  const rehydrated = createLunarLanderWorldStore({
    now: () => nowRef.value,
    serializedState: {
      ...serialized,
      commanders: [
        ...serialized.commanders,
        {
          id: "commander-other",
          label: "Other commander",
          resources: {},
          unlockedTech: [],
          selectedBlueprintId: DEFAULT_LANDER_BLUEPRINT.id,
          createdAt: nowRef.value,
          updatedAt: nowRef.value,
        },
      ],
      bases: [stolenBase],
    },
  });

  const forbidden = rehydrated.queueBaseRoom(baseId, "storage-bay", {
    auth: { landerId: spawned.lander.id, token: spawned.controlToken },
  });

  assert.equal(forbidden.ok, false);
  assert.equal(forbidden.ok ? "" : forbidden.error, "Forbidden");
});

test("commander research validates prerequisites and resource costs", () => {
  const nowRef = { value: 1_000 };
  const store = createLunarLanderWorldStore({
    now: () => nowRef.value,
    serializedState: {
      ...serializedStateForBlueprint(DEFAULT_LANDER_BLUEPRINT.id, nowRef.value),
      commanders: [
        {
          id: "commander-default",
          label: "Commander",
          resources: { research: 300, electronics: 70 },
          unlockedTech: [],
          selectedBlueprintId: DEFAULT_LANDER_BLUEPRINT.id,
          createdAt: nowRef.value,
          updatedAt: nowRef.value,
        },
      ],
    },
  });

  const missingPrerequisite = store.researchTech("automation-control", {
    commanderId: "commander-default",
  });
  assert.equal(missingPrerequisite.ok, false);
  assert.match(missingPrerequisite.ok ? "" : missingPrerequisite.error, /Missing prerequisite tech/);

  const researched = store.researchTech("automation-control", {
    commanderId: "commander-default",
  });
  assert.equal(researched.ok, false);

  const readyStore = createLunarLanderWorldStore({
    now: () => nowRef.value,
    serializedState: {
      ...serializedStateForBlueprint(DEFAULT_LANDER_BLUEPRINT.id, nowRef.value),
      commanders: [
        {
          id: "commander-default",
          label: "Commander",
          resources: { research: 300, electronics: 70 },
          unlockedTech: ["base-habitat"],
          selectedBlueprintId: DEFAULT_LANDER_BLUEPRINT.id,
          createdAt: nowRef.value,
          updatedAt: nowRef.value,
        },
      ],
    },
  });

  const success = readyStore.researchTech("automation-control", {
    commanderId: "commander-default",
  });
  assert.equal(success.ok, true);
  assert.deepEqual(success.ok && success.value.unlockedTech, ["base-habitat", "automation-control"]);
  assert.equal(success.ok && success.value.resources.research, 80);
  assert.equal(success.ok && success.value.resources.electronics, 10);
});

test("base command habitat research can fund commander tech", () => {
  const nowRef = { value: 1_000 };
  const { store } = createLandingStore(nowRef);
  store.spawnLander();
  nowRef.value += 1_000;
  store.readWorldSnapshot();

  nowRef.value += 100_000;
  const beforeResearch = store.readWorldSnapshot();
  const baseResearch = beforeResearch.bases[0].storage.research ?? 0;
  assert.ok(baseResearch >= 50);

  const researched = store.researchTech("orbital-survey", {
    commanderId: "commander-default",
  });
  const afterResearch = store.readWorldSnapshot();

  assert.equal(researched.ok, true);
  assert.ok(researched.ok && researched.value.unlockedTech.includes("orbital-survey"));
  assert.ok((afterResearch.bases[0].storage.research ?? 0) < baseResearch);
});

test("automation toggles validate tech, rooms, auth, and ownership", () => {
  const nowRef = { value: 1_000 };
  const { store } = createLandingStore(nowRef, TRAVEL_BASE_KIT_BLUEPRINT);
  const spawned = store.spawnLander();
  nowRef.value += 1_000;
  const baseId = store.readWorldSnapshot().bases[0].id;

  const badToken = store.toggleBaseAutomation(baseId, "auto-mining", true, {
    auth: { landerId: spawned.lander.id, token: "wrong-token" },
  });
  assert.equal(badToken.ok, false);
  assert.equal(badToken.ok ? "" : badToken.error, "Unauthorized");

  const unimplemented = store.toggleBaseAutomation(baseId, "auto-refining", true);
  assert.equal(unimplemented.ok, false);
  assert.equal(unimplemented.ok ? "" : unimplemented.error, "Automation is not implemented");

  const missingTech = store.toggleBaseAutomation(baseId, "auto-mining", true, {
    auth: { landerId: spawned.lander.id, token: spawned.controlToken },
  });
  assert.equal(missingTech.ok, false);
  assert.match(missingTech.ok ? "" : missingTech.error, /Missing required tech/);

  const serialized = store.serializeWorld();
  const rehydrated = createLunarLanderWorldStore({
    now: () => nowRef.value,
    serializedState: {
      ...serialized,
      commanders: [
        {
          ...serialized.commanders[0],
          unlockedTech: ["automation-control"],
        },
      ],
    },
  });
  const missingRoom = rehydrated.toggleBaseAutomation(baseId, "auto-mining", true, {
    auth: { landerId: spawned.lander.id, token: spawned.controlToken },
  });
  assert.equal(missingRoom.ok, false);
  assert.match(missingRoom.ok ? "" : missingRoom.error, /Missing required room/);

  const roomReadyState = rehydrated.serializeWorld();
  const roomReady = createLunarLanderWorldStore({
    now: () => nowRef.value,
    serializedState: {
      ...roomReadyState,
      bases: [
        {
          ...roomReadyState.bases[0],
          rooms: [
            ...roomReadyState.bases[0].rooms,
            {
              instanceId: "mine-ready",
              roomId: "regolith-mine",
              position: { x: 0, y: 0 },
              integrity: 100,
              maxIntegrity: 100,
              assignedCrew: 0,
            },
          ],
        },
      ],
    },
  });
  const enabled = roomReady.toggleBaseAutomation(baseId, "auto-mining", true, {
    auth: { landerId: spawned.lander.id, token: spawned.controlToken },
  });
  assert.equal(enabled.ok, true);
  assert.equal(enabled.ok && enabled.value.automation["auto-mining"]?.enabled, true);

  const stolen = roomReady.serializeWorld();
  const forbiddenStore = createLunarLanderWorldStore({
    now: () => nowRef.value,
    serializedState: {
      ...stolen,
      commanders: [
        ...stolen.commanders,
        {
          id: "commander-other",
          label: "Other commander",
          resources: {},
          unlockedTech: ["automation-control"],
          selectedBlueprintId: DEFAULT_LANDER_BLUEPRINT.id,
          createdAt: nowRef.value,
          updatedAt: nowRef.value,
        },
      ],
      bases: [{ ...stolen.bases[0], commanderId: "commander-other" }],
    },
  });
  const forbidden = forbiddenStore.toggleBaseAutomation(baseId, "auto-mining", false, {
    auth: { landerId: spawned.lander.id, token: spawned.controlToken },
  });
  assert.equal(forbidden.ok, false);
  assert.equal(forbidden.ok ? "" : forbidden.error, "Forbidden");
});

test("auto-mining adds extra production each economy tick", () => {
  const nowRef = { value: 1_000 };
  const { store } = createLandingStore(nowRef, TRAVEL_BASE_KIT_BLUEPRINT);
  store.spawnLander();
  nowRef.value += 1_000;
  const baseId = store.readWorldSnapshot().bases[0].id;
  store.queueBaseRoom(baseId, "regolith-mine");
  nowRef.value += 6_000;
  const built = store.serializeWorld();
  const rehydrated = createLunarLanderWorldStore({
    now: () => nowRef.value,
    serializedState: {
      ...built,
      commanders: [{ ...built.commanders[0], unlockedTech: ["automation-control"] }],
    },
  });

  const enabled = rehydrated.toggleBaseAutomation(baseId, "auto-mining", true);
  assert.equal(enabled.ok, true);
  const before = rehydrated.readWorldSnapshot().bases[0].storage;
  nowRef.value += 1_000;
  const after = rehydrated.readWorldSnapshot().bases[0].storage;

  assert.equal((after.regolith ?? 0) - (before.regolith ?? 0), 5);
  assert.equal((after.ore ?? 0) - (before.ore ?? 0), 1.25);
  assert.ok(Math.abs((before.oxygen ?? 0) - (after.oxygen ?? 0) - 0.05) < 0.00001);
});

test("auto-repair spends stored materials to repair base and rooms over time", () => {
  const nowRef = { value: 1_000 };
  const { store } = createLandingStore(nowRef, TRAVEL_BASE_KIT_BLUEPRINT);
  store.spawnLander();
  nowRef.value += 1_000;
  const base = store.readWorldSnapshot().bases[0];
  const serialized = store.serializeWorld();
  const rehydrated = createLunarLanderWorldStore({
    now: () => nowRef.value,
    serializedState: {
      ...serialized,
      commanders: [
        {
          ...serialized.commanders[0],
          unlockedTech: ["automation-control", "safety-systems"],
        },
      ],
      bases: [
        {
          ...serialized.bases[0],
          integrity: 80,
          storage: { ...serialized.bases[0].storage, metal: 20, electronics: 1 },
          rooms: [
            {
              ...serialized.bases[0].rooms[0],
              integrity: 75,
            },
            {
              instanceId: "workshop-ready",
              roomId: "workshop",
              position: { x: base.position.x + 20, y: base.position.y },
              integrity: 100,
              maxIntegrity: 100,
              assignedCrew: 0,
            },
          ],
        },
      ],
    },
  });

  const enabled = rehydrated.toggleBaseAutomation(base.id, "auto-repair", true);
  assert.equal(enabled.ok, true);
  nowRef.value += 1_000;
  const repaired = rehydrated.readWorldSnapshot().bases[0];

  assert.equal(repaired.integrity, 85);
  assert.equal(repaired.rooms[0].integrity, 80);
  assert.equal(repaired.storage.metal, 19);
  assert.equal(repaired.storage.electronics, 0.98);
});

test("serialization preserves automation state and log entries", () => {
  const nowRef = { value: 1_000 };
  const { store } = createLandingStore(nowRef, TRAVEL_BASE_KIT_BLUEPRINT);
  store.spawnLander();
  nowRef.value += 1_000;
  const baseId = store.readWorldSnapshot().bases[0].id;
  const serialized = store.serializeWorld();
  const rehydrated = createLunarLanderWorldStore({
    now: () => nowRef.value,
    serializedState: {
      ...serialized,
      commanders: [{ ...serialized.commanders[0], unlockedTech: ["automation-control"] }],
      bases: [
        {
          ...serialized.bases[0],
          rooms: [
            ...serialized.bases[0].rooms,
            {
              instanceId: "mine-ready",
              roomId: "regolith-mine",
              position: { x: 0, y: 0 },
              integrity: 100,
              maxIntegrity: 100,
              assignedCrew: 0,
            },
          ],
        },
      ],
    },
  });
  rehydrated.toggleBaseAutomation(baseId, "auto-mining", true);

  const before = rehydrated.readWorldSnapshot().bases[0];
  const after = createLunarLanderWorldStore({
    now: () => nowRef.value,
    serializedState: rehydrated.serializeWorld(),
  }).readWorldSnapshot().bases[0];

  assert.deepEqual(after.automation, before.automation);
  assert.deepEqual(after.automationLog, before.automationLog);
});

test("serialization preserves bases and economy state", () => {
  const nowRef = { value: 1_000 };
  const { store } = createLandingStore(nowRef);
  store.spawnLander();
  nowRef.value += 1_000;
  const baseId = store.readWorldSnapshot().bases[0].id;
  store.queueBaseRoom(baseId, "regolith-mine");
  nowRef.value += 6_000;
  const before = store.readWorldSnapshot();
  const serialized = store.serializeWorld();
  const rehydrated = createLunarLanderWorldStore({
    now: () => nowRef.value,
    serializedState: serialized,
  });
  const after = rehydrated.readWorldSnapshot();

  assert.deepEqual(after.bases, before.bases);
  assert.equal(after.economyUpdatedAt, before.economyUpdatedAt);
});

test("base ascent consumes base resources and creates an active station flight", () => {
  const nowRef = { value: 1_000 };
  const { store } = createLandingStore(nowRef, TRAVEL_BASE_KIT_BLUEPRINT);
  store.spawnLander();
  nowRef.value += 1_000;
  const base = store.readWorldSnapshot().bases[0];

  const launched = store.launchBaseAscent(base.id, { cargo: { metal: 20, ice: 5 } });
  assert.equal(launched.ok, true);
  assert.equal(launched.ok && launched.value.routeKind, "surface-to-orbit");
  assert.equal(launched.ok && launched.value.originBaseId, base.id);
  assert.equal(launched.ok && launched.value.destinationStationId, "moon-orbit");
  assert.deepEqual(launched.ok && launched.value.fuelCost, { fuel: 120 });

  const snapshot = store.readWorldSnapshot();
  assert.equal(snapshot.bases[0].storage.fuel, 380);
  assert.equal(snapshot.bases[0].storage.metal, 280);
  assert.equal(snapshot.bases[0].storage.ice, 5);
  assert.equal(snapshot.flights.length, 1);
  assert.equal(snapshot.flights[0].status, "active");
});

test("base ascent fails without enough fuel or requested cargo", () => {
  const nowRef = { value: 1_000 };
  const { store } = createLandingStore(nowRef, TRAVEL_BASE_KIT_BLUEPRINT);
  store.spawnLander();
  nowRef.value += 1_000;
  const base = store.readWorldSnapshot().bases[0];

  const tooMuchFuel = store.launchBaseAscent(base.id, { cargo: { fuel: 500 } });
  const tooMuchCargo = store.launchBaseAscent(base.id, { cargo: { metal: 999 } });

  assert.equal(tooMuchFuel.ok, false);
  assert.equal(tooMuchCargo.ok, false);
  assert.equal(store.readWorldSnapshot().flights.length, 0);
});

test("station transfer consumes station resources and targets another body", () => {
  const nowRef = { value: 1_000 };
  const lockedStore = createLunarLanderWorldStore({ now: () => nowRef.value });
  assert.equal(lockedStore.readAvailableTravelRoutes("moon-orbit").length, 0);
  const lockedTransfer = lockedStore.planStationTransfer("moon-orbit", "mars", {
    cargo: { oxygen: 10 },
  });
  assert.equal(lockedTransfer.ok, false);
  assert.match(lockedTransfer.ok ? "" : lockedTransfer.error, /Missing required tech/);

  const store = createInterplanetaryStore(nowRef);

  const routes = store.readAvailableTravelRoutes("moon-orbit");
  const transfer = store.planStationTransfer("moon-orbit", "mars", { cargo: { oxygen: 10 } });

  assert.ok(routes.some((route) => route.destinationStationId === "mars-orbit"));
  assert.equal(transfer.ok, true);
  assert.equal(transfer.ok && transfer.value.routeKind, "station-to-station");
  assert.equal(transfer.ok && transfer.value.destinationBodyId, "mars");
  assert.equal(transfer.ok && transfer.value.destinationStationId, "mars-orbit");

  const snapshot = store.readWorldSnapshot();
  const moonStation = snapshot.stations.find((station) => station.id === "moon-orbit");
  assert.equal(moonStation?.storage.fuel, 240);
  assert.equal(moonStation?.storage.oxygen, 90);
  assert.equal(snapshot.flights[0].status, "active");
});

test("flight arrivals deliver cargo to destination station and remain visible", () => {
  const nowRef = { value: 1_000 };
  const { store } = createLandingStore(nowRef, TRAVEL_BASE_KIT_BLUEPRINT);
  store.spawnLander();
  nowRef.value += 1_000;
  const base = store.readWorldSnapshot().bases[0];
  store.launchBaseAscent(base.id, { cargo: { metal: 20, ice: 5 } });

  nowRef.value += 60_000;
  const arrived = store.readWorldSnapshot();
  const moonStation = arrived.stations.find((station) => station.id === "moon-orbit");

  assert.equal(arrived.flights.length, 1);
  assert.equal(arrived.flights[0].status, "arrived");
  assert.equal(moonStation?.storage.metal, 20);
  assert.equal(moonStation?.storage.ice, 5);

  const repeated = store.readWorldSnapshot();
  const repeatedMoonStation = repeated.stations.find((station) => station.id === "moon-orbit");
  assert.equal(repeatedMoonStation?.storage.metal, 20);
});

test("serialization preserves active and arrived travel state", () => {
  const nowRef = { value: 1_000 };
  const store = createInterplanetaryStore(nowRef);
  const transfer = store.planStationTransfer("moon-orbit", "mars", { cargo: { oxygen: 10 } });
  assert.equal(transfer.ok, true);

  const activeSerialized = store.serializeWorld();
  const activeRehydrated = createLunarLanderWorldStore({
    now: () => nowRef.value,
    serializedState: activeSerialized,
  });
  assert.equal(activeRehydrated.readWorldSnapshot().flights[0].status, "active");

  nowRef.value += 180_000;
  const arrived = activeRehydrated.readWorldSnapshot();
  const marsStation = arrived.stations.find((station) => station.id === "mars-orbit");
  assert.equal(arrived.flights[0].status, "arrived");
  assert.equal(marsStation?.storage.oxygen, 10);

  const arrivedRehydrated = createLunarLanderWorldStore({
    now: () => nowRef.value,
    serializedState: activeRehydrated.serializeWorld(),
  });
  const after = arrivedRehydrated.readWorldSnapshot();
  const afterMarsStation = after.stations.find((station) => station.id === "mars-orbit");
  assert.equal(after.flights[0].status, "arrived");
  assert.equal(afterMarsStation?.storage.oxygen, 10);
});
