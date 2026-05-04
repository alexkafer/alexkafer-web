import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeLunarLanderPartyClientMessage,
  encodeLunarLanderPartyMessage,
} from "./lunar-lander-party-protocol";
import { LunarLanderPartyRoomState } from "./lunar-lander-party-room-state";

test("lunar lander party protocol decodes spawn and input messages", () => {
  const spawn = decodeLunarLanderPartyClientMessage(
    encodeLunarLanderPartyMessage({ type: "spawn", pilot: "phone" }),
  );
  assert.deepEqual(spawn, { ok: true, value: { type: "spawn", pilot: "phone" } });

  const input = decodeLunarLanderPartyClientMessage(
    encodeLunarLanderPartyMessage({
      type: "input",
      landerId: "lander-1",
      token: "token-1",
      thrust: true,
      rotate: -1,
      lateral: 0.5,
    }),
  );
  assert.equal(input.ok, true);
  if (input.ok) {
    assert.equal(input.value.type, "input");
    assert.equal(input.value.thrust, true);
    assert.equal(input.value.rotate, -1);
    assert.equal(input.value.lateral, 0.5);
  }
});

test("lunar lander party protocol rejects malformed messages", () => {
  assert.deepEqual(decodeLunarLanderPartyClientMessage("{"), {
    ok: false,
    error: "Malformed JSON message",
  });
  assert.deepEqual(
    decodeLunarLanderPartyClientMessage(JSON.stringify({ type: "spawn", pilot: "tablet" })),
    { ok: false, error: "Spawn message requires pilot desktop or phone" },
  );
  assert.deepEqual(
    decodeLunarLanderPartyClientMessage(
      JSON.stringify({ type: "input", landerId: "L-01", token: "t", rotate: "left" }),
    ),
    { ok: false, error: "Input message requires landerId, token, and numeric rotate" },
  );
});

test("lunar lander party room state spawns, controls, snapshots, and serializes", () => {
  let currentTime = 1_000;
  const room = new LunarLanderPartyRoomState({ now: () => currentTime });
  const spawned = room.spawn({ type: "spawn", pilot: "desktop" });
  assert.equal(spawned.type, "spawned");
  assert.equal(spawned.lander.label, "L-01");

  const controlled = room.input({
    type: "input",
    landerId: spawned.lander.id,
    token: spawned.controlToken,
    thrust: true,
    rotate: 0,
  });
  assert.equal(controlled?.type, "controlled");

  currentTime += 250;
  const firstSnapshot = room.snapshot();
  const secondSnapshot = room.snapshot();
  assert.equal(firstSnapshot.type, "snapshot");
  assert.equal(secondSnapshot.seq, firstSnapshot.seq + 1);
  assert.equal(firstSnapshot.snapshot.landers.length, 1);
  assert.equal(room.serializeWorld().landers.length, 1);
});
