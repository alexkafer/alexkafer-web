import assert from "node:assert/strict";
import test from "node:test";
import {
  createControllerUrl,
  createNetworkControllerUrl,
  createPairCode,
  normalizePairCode,
} from "./pairing";

test("createPairCode maps bytes into a six character readable code", () => {
  const code = createPairCode(new Uint8Array([0, 1, 30, 31, 32, 63]));

  assert.equal(code, "23YZ2Z");
});

test("normalizePairCode accepts lowercase codes with spaces and separators", () => {
  assert.equal(normalizePairCode(" 2h-yz q9 "), "2HYZQ9");
});

test("normalizePairCode rejects malformed codes", () => {
  assert.equal(normalizePairCode("ABC"), null);
  assert.equal(normalizePairCode("ABCDEF!"), null);
});

test("createControllerUrl points phones at the controller route for the pair code", () => {
  const url = createControllerUrl("https://alexkafer.localhost:1355", "2HYZQ9");

  assert.equal(
    url,
    "https://alexkafer.localhost:1355/labs/lunar-lander/controller?pair=2HYZQ9",
  );
});

test("createNetworkControllerUrl prefers a configured LAN origin", () => {
  const url = createNetworkControllerUrl(
    {
      currentOrigin: "https://alexkafer.localhost:1355",
      networkOrigin: "http://192.168.4.22:4320",
    },
    "2HYZQ9",
  );

  assert.equal(
    url,
    "http://192.168.4.22:4320/labs/lunar-lander/controller?pair=2HYZQ9",
  );
});

test("createNetworkControllerUrl derives a portless LAN origin from a localhost route", () => {
  const url = createNetworkControllerUrl(
    {
      currentOrigin: "https://alexkafer.localhost:1355",
      preferPortlessLan: true,
    },
    "2HYZQ9",
  );

  assert.equal(
    url,
    "https://alexkafer.local:1355/labs/lunar-lander/controller?pair=2HYZQ9",
  );
});

test("createNetworkControllerUrl uses the current origin when it is already LAN reachable", () => {
  const url = createNetworkControllerUrl(
    {
      currentOrigin: "http://192.168.4.22:4320",
    },
    "2HYZQ9",
  );

  assert.equal(
    url,
    "http://192.168.4.22:4320/labs/lunar-lander/controller?pair=2HYZQ9",
  );
});
