import assert from "node:assert/strict";
import test from "node:test";
import { createNetworkControllerLaunchUrl } from "./lunar-lander-controller-url";

test("createNetworkControllerLaunchUrl points phones at the no-code controller route", () => {
  const url = createNetworkControllerLaunchUrl({
    currentOrigin: "https://alexkafer.localhost:1355",
    preferPortlessLan: true,
  });

  assert.equal(url, "https://alexkafer.local:1355/labs/lunar-lander/controller");
});

test("createNetworkControllerLaunchUrl prefers a configured LAN origin", () => {
  const url = createNetworkControllerLaunchUrl({
    currentOrigin: "https://alexkafer.localhost:1355",
    networkOrigin: "http://192.168.4.22:4320",
  });

  assert.equal(url, "http://192.168.4.22:4320/labs/lunar-lander/controller");
});
