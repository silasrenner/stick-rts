import { CONFIG } from '../config.js';
import { drawStickFigure } from './stickFigure.js';
import { drawStatue, drawStructure, drawMine, drawHealthBar } from './structures.js';
import { drawHUD, drawBuildMenu, drawWinLoseOverlay } from './ui.js';

const LEGEND_LINES = [
  'Enemy (debug): 7 Miner  8 Warrior  9 Archer  0 Structure   |   Enemy command: I Attack  O Defend  P Retreat',
  'Your command: Q Attack   W Defend   E Retreat',
];

// Reads world state only; never mutates it.
export function render(ctx, world, uiMessage) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  drawMine(ctx, world.mines.player);
  drawMine(ctx, world.mines.ai);

  drawStatue(ctx, world.statues.player);
  drawStatue(ctx, world.statues.ai);

  for (const structure of world.structures) {
    drawStructure(ctx, structure);
  }

  for (const unit of world.units) {
    drawStickFigure(ctx, unit);
    if (unit.state !== 'dying') drawHealthBar(ctx, unit.x, unit.y - 80, unit.hp, unit.maxHp, 24);
  }

  for (const projectile of world.projectiles) {
    drawProjectile(ctx, projectile);
  }

  drawLegend(ctx);
  drawHUD(ctx, world, uiMessage);
  drawBuildMenu(ctx, world);
  drawWinLoseOverlay(ctx, world);
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
  ctx.font = '11px monospace';
  LEGEND_LINES.forEach((line, i) => ctx.fillText(line, 10, ctx.canvas.height - 58 + i * 14));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
