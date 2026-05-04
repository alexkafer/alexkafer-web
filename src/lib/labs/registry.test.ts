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

test("registry includes the story relay concept placeholder", () => {
  const lab = getLabBySlug("story-relay");

  assert.equal(lab?.title, "Story Relay");
  assert.equal(lab?.interaction, "single-screen");
  assert.equal(lab?.href, "/labs#story-relay");
});
