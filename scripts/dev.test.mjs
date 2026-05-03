import assert from "node:assert/strict";
import test from "node:test";
import { buildDevCommand } from "./dev.mjs";

test("buildDevCommand runs Next through Portless with project defaults", () => {
  assert.deepEqual(buildDevCommand([]), {
    command: "portless",
    args: ["alexkafer", "next", "dev"],
    env: {
      PORTLESS_PORT: "1355",
      PORTLESS_HTTPS: "1",
      PORTLESS_LAN: "1",
    },
  });
});

test("buildDevCommand passes extra npm args through to next dev", () => {
  assert.deepEqual(buildDevCommand(["--turbo"]), {
    command: "portless",
    args: ["alexkafer", "next", "dev", "--turbo"],
    env: {
      PORTLESS_PORT: "1355",
      PORTLESS_HTTPS: "1",
      PORTLESS_LAN: "1",
    },
  });
});

test("buildDevCommand lets explicit environment override defaults", () => {
  assert.deepEqual(
    buildDevCommand([], {
      PORTLESS_PORT: "443",
      PORTLESS_HTTPS: "0",
      PORTLESS_LAN: "0",
    }),
    {
      command: "portless",
      args: ["alexkafer", "next", "dev"],
      env: {
        PORTLESS_PORT: "443",
        PORTLESS_HTTPS: "0",
        PORTLESS_LAN: "0",
      },
    },
  );
});
