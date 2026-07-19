import { CONFIG } from '../config.js';
import { isAliveEntity } from '../sim/world.js';

// Camera state is deliberately not part of `world` — it's a rendering/
// viewport concern, not simulation state.
export function createCamera() {
  return { x: 0 };
}

// CAMERA_ZOOM is a render-time scale (see renderer.js); the world-space
// span actually visible through the viewport is VIEWPORT_WIDTH/ZOOM, not
// VIEWPORT_WIDTH itself — zooming out (ZOOM < 1) widens it. Everything
// below that reasons in world space (clamping, hero-follow centering)
// must use this, not the raw canvas pixel width; EDGE_SCROLL_MARGIN stays
// against the raw canvas width since mouseX is a real screen coordinate.
const VISIBLE_WORLD_WIDTH = CONFIG.VIEWPORT_WIDTH / CONFIG.CAMERA_ZOOM;

export function updateCamera(camera, world, mouseX, dt) {
  const controlledHero = world.units.find((u) => u.team === 'player' && u.isHero && u.controlled && isAliveEntity(u));

  if (controlledHero) {
    camera.x = controlledHero.x - VISIBLE_WORLD_WIDTH / 2;
  } else if (mouseX !== null && mouseX !== undefined) {
    if (mouseX < CONFIG.EDGE_SCROLL_MARGIN) {
      camera.x -= CONFIG.EDGE_SCROLL_SPEED * dt;
    } else if (mouseX > CONFIG.VIEWPORT_WIDTH - CONFIG.EDGE_SCROLL_MARGIN) {
      camera.x += CONFIG.EDGE_SCROLL_SPEED * dt;
    }
  }

  camera.x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH - VISIBLE_WORLD_WIDTH, camera.x));
}
