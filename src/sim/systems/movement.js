import { CONFIG } from '../../config.js';

export function updateMovement(world, dt) {
  for (const unit of world.units) {
    if (unit.pauseTimer > 0) {
      unit.pauseTimer -= dt;
      unit.state = 'idle';
    } else {
      unit.state = 'walking';
      unit.x += unit.vx * dt;

      const atRightEdge = unit.x > CONFIG.CANVAS_WIDTH - CONFIG.EDGE_MARGIN;
      const atLeftEdge = unit.x < CONFIG.EDGE_MARGIN;
      if (atRightEdge || atLeftEdge) {
        unit.vx *= -1;
        unit.facing *= -1;
        unit.pauseTimer = CONFIG.EDGE_PAUSE_S;
      }
    }

    const animHz = unit.state === 'walking' ? CONFIG.WALK_ANIM_HZ : CONFIG.IDLE_ANIM_HZ;
    unit.animPhase += dt * animHz * Math.PI * 2;
  }
}
