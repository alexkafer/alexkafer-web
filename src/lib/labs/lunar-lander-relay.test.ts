import assert from "node:assert/strict";
import test from "node:test";
import { createLunarLanderSessionStore } from "./lunar-lander-relay";

test("session store creates host-readable sessions and clamps controller input", () => {
  const store = createLunarLanderSessionStore({
    now: () => 1_000,
    createPairCode: () => "2HYZQ9",
    createId: () => "host-1",
  });

  const session = store.createSession();
  store.writeControl("2hy-zq9", { thrust: true, rotate: 3 });

  const snapshot = store.readHostSnapshot(session.pairCode, session.hostId);

  assert.equal(session.pairCode, "2HYZQ9");
  assert.equal(snapshot?.control?.thrust, true);
  assert.equal(snapshot?.control?.rotate, 1);
  assert.equal(snapshot?.control?.sequence, 1);
});

test("session store relays reset commands from the controller", () => {
  const store = createLunarLanderSessionStore({
    now: () => 1_000,
    createPairCode: () => "2HYZQ9",
    createId: () => "host-1",
  });

  const session = store.createSession();
  store.writeControl("2HYZQ9", { thrust: false, rotate: 0, reset: true });

  const snapshot = store.readHostSnapshot(session.pairCode, session.hostId);

  assert.equal(snapshot?.control?.reset, true);
  assert.equal(snapshot?.control?.sequence, 1);
});

test("session store preserves reset commands across controller heartbeats", () => {
  const store = createLunarLanderSessionStore({
    now: () => 1_000,
    createPairCode: () => "2HYZQ9",
    createId: () => "host-1",
  });

  const session = store.createSession();
  store.writeControl("2HYZQ9", { thrust: false, rotate: 0, reset: true });
  store.writeControl("2HYZQ9", { thrust: false, rotate: 0 });

  const snapshot = store.readHostSnapshot(session.pairCode, session.hostId);

  assert.equal(snapshot?.control?.resetSequence, 1);
  assert.equal(snapshot?.control?.reset, false);
});

test("session store does not reveal host snapshots for the wrong host id", () => {
  const store = createLunarLanderSessionStore({
    now: () => 1_000,
    createPairCode: () => "2HYZQ9",
    createId: () => "host-1",
  });

  const session = store.createSession();

  assert.equal(store.readHostSnapshot(session.pairCode, "host-2"), null);
});

test("session store evicts oldest sessions when full", () => {
  let now = 1_000;
  let index = 0;
  const codes = ["2HYZQ9", "3HYZQ9", "4HYZQ9"];
  const store = createLunarLanderSessionStore({
    now: () => now,
    createPairCode: () => codes[index++],
    createId: () => `host-${index}`,
    maxSessions: 2,
  });

  const first = store.createSession();
  now += 1;
  store.createSession();
  now += 1;
  store.createSession();

  assert.equal(store.readHostSnapshot(first.pairCode, first.hostId), null);
});
