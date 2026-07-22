import { CONFIG } from '../config.js';
import { isAliveEntity } from '../sim/world.js';

// Camera state is deliberately not part of `world` — it's a rendering/
// viewport concern, not simulation state. S10: zoom is now runtime state
// (scroll-wheel adjustable), not a fixed CONFIG constant — CONFIG.CAMERA_ZOOM
// is only the starting value used to seed it. `followBroken` tracks whether
// manual pan/zoom input has overridden hero-follow since the last time
// direct control was (re-)toggled on.
export function createCamera() {
  return { x: 0, zoom: CONFIG.CAMERA_ZOOM, followBroken: false };
}

// CAMERA_ZOOM is a render-time scale (see renderer.js); the world-space
// span actually visible through the viewport is VIEWPORT_WIDTH/zoom, not
// VIEWPORT_WIDTH itself — zooming out (zoom < 1) widens it. Everything
// below that reasons in world space (clamping, hero-follow centering,
// cursor-anchored zoom) must use this, not the raw canvas pixel width;
// EDGE_SCROLL_MARGIN stays against the raw canvas width since mouseX is a
// real screen coordinate.
export function visibleWorldWidth(camera) {
  return CONFIG.VIEWPORT_WIDTH / camera.zoom;
}

function clampPan(camera) {
  const maxX = Math.max(0, CONFIG.WORLD_WIDTH - visibleWorldWidth(camera));
  camera.x = Math.max(0, Math.min(maxX, camera.x));
}

export function updateCamera(camera, world, mouseX, dt, dragDeltaX = 0) {
  // Free click-drag pan applies in every match mode (Watch AI and normal
  // play alike) — 1:1 with mouse movement, corrected for render-time zoom.
  if (dragDeltaX !== 0) {
    camera.x += dragDeltaX / camera.zoom;
    camera.followBroken = true;
  }

  const controlledHero = world.units.find((u) => u.team === 'player' && u.isHero && u.controlled && isAliveEntity(u));

  if (controlledHero && !camera.followBroken) {
    camera.x = controlledHero.x - visibleWorldWidth(camera) / 2;
  } else if (mouseX !== null && mouseX !== undefined) {
    if (mouseX < CONFIG.EDGE_SCROLL_MARGIN) {
      camera.x -= CONFIG.EDGE_SCROLL_SPEED * dt;
      camera.followBroken = true;
    } else if (mouseX > CONFIG.VIEWPORT_WIDTH - CONFIG.EDGE_SCROLL_MARGIN) {
      camera.x += CONFIG.EDGE_SCROLL_SPEED * dt;
      camera.followBroken = true;
    }
  }

  clampPan(camera);
}

// Scroll-wheel zoom, anchored at the cursor's world position: the world
// point under the cursor before the zoom step is re-solved for after, so it
// stays under the cursor (zoom toward/away from the pointer). `factor` > 1
// zooms in, < 1 zooms out.
export function zoomAt(camera, mouseX, factor) {
  const worldX = camera.x + mouseX / camera.zoom;
  camera.zoom = Math.max(CONFIG.CAMERA_ZOOM_MIN, Math.min(CONFIG.CAMERA_ZOOM_MAX, camera.zoom * factor));
  camera.x = worldX - mouseX / camera.zoom;
  camera.followBroken = true;
  clampPan(camera);
}
