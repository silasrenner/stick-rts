import { CONFIG } from '../config.js';
import { isAliveEntity } from '../sim/world.js';

export function createCamera() {
  return { x: 0, targetX: 0, zoom: CONFIG.CAMERA_ZOOM, followBroken: false };
}

export function visibleWorldWidth(camera) {
  return CONFIG.VIEWPORT_WIDTH / camera.zoom;
}

function clampValue(camera, x) {
  const maxX = Math.max(0, CONFIG.WORLD_WIDTH - visibleWorldWidth(camera));
  return Math.max(0, Math.min(maxX, x));
}

function clampPan(camera) {
  camera.targetX = clampValue(camera, camera.targetX ?? camera.x);
  camera.x = clampValue(camera, camera.x);
}

export function updateCamera(camera, world, mouseX, dt, dragDeltaX = 0) {
  if (camera.targetX === undefined) camera.targetX = camera.x;
  if (dragDeltaX !== 0) {
    camera.targetX += dragDeltaX / camera.zoom;
    camera.followBroken = true;
  }

  const controlledHero = world.units.find((u) => u.team === 'player' && u.isHero && u.controlled && isAliveEntity(u));
  if (controlledHero && !camera.followBroken) {
    camera.targetX = controlledHero.x - visibleWorldWidth(camera) / 2;
  } else if (mouseX !== null && mouseX !== undefined) {
    if (mouseX < CONFIG.EDGE_SCROLL_MARGIN) {
      camera.targetX -= CONFIG.EDGE_SCROLL_SPEED * dt;
      camera.followBroken = true;
    } else if (mouseX > CONFIG.VIEWPORT_WIDTH - CONFIG.EDGE_SCROLL_MARGIN) {
      camera.targetX += CONFIG.EDGE_SCROLL_SPEED * dt;
      camera.followBroken = true;
    }
  }
  clampPan(camera);
  // Fast critically-damped-feeling settle: responsive while removing raw
  // pointer-event stepping on touch screens.
  const smoothing = 1 - Math.exp(-18 * Math.max(0, dt));
  camera.x += (camera.targetX - camera.x) * smoothing;
  clampPan(camera);
}

export function zoomAt(camera, mouseX, factor) {
  const baseX = camera.targetX ?? camera.x;
  const worldX = baseX + mouseX / camera.zoom;
  camera.zoom = Math.max(CONFIG.CAMERA_ZOOM_MIN, Math.min(CONFIG.CAMERA_ZOOM_MAX, camera.zoom * factor));
  camera.targetX = clampValue(camera, worldX - mouseX / camera.zoom);
  camera.x = clampValue(camera, camera.x);
  camera.followBroken = true;
}
