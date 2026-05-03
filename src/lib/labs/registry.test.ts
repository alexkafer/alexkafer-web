import assert from "node:assert/strict";
import test from "node:test";
import { LABS, getLabBySlug } from "./registry";

test("LABS exposes unique ordered slugs for the laboratory index", () => {
  const slugs = LABS.map((lab) => lab.slug);

  assert.deepEqual(slugs, Array.from(new Set(slugs)));
  assert.deepEqual(
    LABS.map((lab) => lab.order),
    [...LABS].map((lab) => lab.order).sort((a, b) => a - b),
  );
});

test("registry includes the lunar lander prototype with phone pairing metadata", () => {
  const lab = getLabBySlug("lunar-lander");

  assert.equal(lab?.title, "Lunar Lander");
  assert.equal(lab?.interaction, "paired-phone");
  assert.equal(lab?.href, "/labs/lunar-lander");
});
