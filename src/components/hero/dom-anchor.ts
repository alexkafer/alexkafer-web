// Reads a DOM marker (id="${slug}-marker") and unprojects its on-screen
// position into 3-D world space at z=0 for the active perspective camera.
// Returns null when the element is missing OR the section is fully off-screen
// (so the caller falls back to the parked target without snapping).

import * as THREE from "three";

const ANCHOR_OFFSET_PX = 28; // gap to the LEFT of the marker text

const tmp = new THREE.Vector3();

export function getAnchorWorldPos(
  slug: string,
  camera: THREE.Camera,
  glDom: HTMLCanvasElement,
): THREE.Vector3 | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById(`${slug}-marker`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const canvasRect = glDom.getBoundingClientRect();
  if (rect.bottom < canvasRect.top || rect.top > canvasRect.bottom) {
    return null; // fully out of view
  }
  // Star sits to the LEFT of the marker, vertically centred on it.
  const screenX = rect.left - ANCHOR_OFFSET_PX;
  const screenY = rect.top + rect.height / 2;
  // Convert to NDC (-1..1) relative to the canvas.
  const ndcX = ((screenX - canvasRect.left) / canvasRect.width) * 2 - 1;
  const ndcY = -(((screenY - canvasRect.top) / canvasRect.height) * 2 - 1);
  // Unproject NDC point at z=0.5 (mid clip), then project to z=0 plane.
  tmp.set(ndcX, ndcY, 0.5);
  tmp.unproject(camera);
  const dir = tmp.sub(camera.position).normalize();
  if (Math.abs(dir.z) < 1e-6) return null;
  const distance = -camera.position.z / dir.z;
  return camera.position.clone().add(dir.multiplyScalar(distance));
}
