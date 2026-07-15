import { CONFIG } from '../config.js';
import { drawStickFigure } from './stickFigure.js';

const LEGEND_LINES = [
  'Player: 1 Miner  2 Warrior  3 Archer   |   Enemy: 7 Miner  8 Warrior  9 Archer',
  'Command: Q Attack   W Defend   E Retreat',
];

// Reads world state only; never mutates it.
export function render(ctx, world) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (const unit of world.units) {
    drawStickFigure(ctx, unit);
    if (unit.state !== 'dying') drawHealthBar(ctx, unit);
  }

  for (const projectile of world.projectiles) {
    drawProjectile(ctx, projectile);
  }

  drawLegend(ctx);
}

function drawHealthBar(ctx, unit) {
  const width = 24;
  const height = 4;
  const x = unit.x - width / 2;
  const y = unit.y - 80;
  const pct = Math.max(0, unit.hp / unit.maxHp);

  ctx.fillStyle = '#402020';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#e0a030' : '#e03030';
  ctx.fillRect(x, y, width * pct, height);
}

function drawProjectile(ctx, projectile) {
  const t = Math.min(1, projectile.elapsed / projectile.duration);
  const x = lerp(projectile.startX, projectile.targetX, t);
  const baseY = lerp(projectile.startY, projectile.targetY, t);
  const arc = Math.sin(Math.PI * t) * CONFIG.PROJECTILE_ARC_HEIGHT;

  ctx.fillStyle = '#f2d24b';
  ctx.beginPath();
  ctx.arc(x, baseY - arc, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawLegend(ctx) {
  ctx.fillStyle = '#8a8a96';
  ctx.font = '12px monospace';
  LEGEND_LINES.forEach((line, i) => ctx.fillText(line, 10, 16 + i * 14));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
