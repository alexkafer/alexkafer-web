import * as THREE from "three";

// Five matte planet hues. Picked to read against a warm off-white sky and
// to look like a small solar system rather than a sample chart.
const PLANET_HEX = [
  "#5b6b8a", // slate blue
  "#a3623a", // rust
  "#c9b079", // sand
  "#7d8b6a", // sage
  "#8a4a3b", // ochre
];

const PLANET_COLORS = PLANET_HEX.map((h) => new THREE.Color(h));

// Stable per-node planet color. `seed` is the node index; using the
// existing index keeps each node's planet identity stable across renders
// and matches the existing `parkedColors` indexing convention.
export function planetColor(seed: number): THREE.Color {
  const i = ((seed % PLANET_COLORS.length) + PLANET_COLORS.length) %
    PLANET_COLORS.length;
  return PLANET_COLORS[i].clone();
}
