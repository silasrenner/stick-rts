import { CONFIG } from '../config.js';
import { isAliveEntity } from '../sim/world.js';

// Camera state is deliberately not part of `world` — it's a rendering/
// viewport concern, not simulation state.
export function createCamera() {
  return { x: 0 };
}

export function updateCamera(camera, world, mouseX, dt) {
  const controlledHero = world.units.find((u) => u.team === 'player' && u.isHero && u.controlled && isAliveEntity(u));

  if (controlledHero) {
    camera.x = controlledHero.x - CONFIG.VIEWPORT_WIDTH / 2;
  } else if (mouseX !== null && mouseX !== undefined) {
    if (mouseX < CONFIG.EDGE_SCROLL_MARGIN) {
      camera.x -= CONFIG.EDGE_SCROLL_SPEED * dt;
    } else if (mouseX > CONFIG.VIEWPORT_WIDTH - CONFIG.EDGE_SCROLL_MARGIN) {
      camera.x += CONFIG.EDGE_SCROLL_SPEED * dt;
    }
  }

  camera.x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH - CONFIG.VIEWPORT_WIDTH, camera.x));
}
