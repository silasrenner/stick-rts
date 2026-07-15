import { CONFIG } from '../config.js';
import { drawStickFigure } from './stickFigure.js';
import { drawStatue, drawStructure, drawMine, drawHealthBar } from './structures.js';
import { drawHUD, drawBuildMenu, drawWinLoseOverlay } from './ui.js';

const LEGEND_LINES = [
  'Enemy (debug): 4 Forgemaster 5 Hawkeye 6 Vanguard  7 Miner  8 Warrior  9 Archer  0 Structure   |   Enemy command: I Attack  O Defend  P Retreat',
  'Your command: Q Attack  W Defend  E Retreat   |   Hero: H Toggle control  ←/→ Move  J Attack  K Special',
];

// Reads world state only; never mutates it. World-space entities are
// culled to the camera's visible window (+ margin) — this is the whole
// of the "no off-screen enemy info" rule: if it isn't drawn, it isn't
// known. HUD/build menu/legend/overlay are screen-space and unaffected
// by camera position.
export function render(ctx, world, camera, uiMessage) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  ctx.translate(-camera.x, 0);

  const visible = (x) =>
    x >= camera.x - CONFIG.CAMERA_CULL_MARGIN && x <= camera.x + CONFIG.VIEWPORT_WIDTH + CONFIG.CAMERA_CULL_MARGIN;

  if (visible(world.mines.player.x)) drawMine(ctx, world.mines.player);
  if (visible(world.mines.ai.x)) drawMine(ctx, world.mines.ai);

  if (visible(world.statues.player.x)) drawStatue(ctx, world.statues.player);
  if (visible(world.statues.ai.x)) drawStatue(ctx, world.statues.ai);

  for (const structure of world.structures) {
    if (visible(structure.x)) drawStructure(ctx, structure);
  }

  for (const unit of world.units) {
    if (!visible(unit.x)) continue;
    drawStickFigure(ctx, unit);
    if (unit.state !== 'dying') drawHealthBar(ctx, unit.x, unit.y - 80, unit.hp, unit.maxHp, 24);
  }

  for (const projectile of world.projectiles) {
    const pos = projectilePosition(projectile);
    if (visible(pos.x)) drawProjectile(ctx, pos);
  }

  ctx.restore();

  drawLegend(ctx);
  drawHUD(ctx, world, uiMessage);
  drawBuildMenu(ctx, world);
  drawWinLoseOverlay(ctx, world);
}

function projectilePosition(projectile) {
  const t = Math.min(1, projectile.elapsed / projectile.duration);
  const x = lerp(projectile.startX, projectile.targetX, t);
  const baseY = lerp(projectile.startY, projectile.targetY, t);
  const arc = Math.sin(Math.PI * t) * CONFIG.PROJECTILE_ARC_HEIGHT;
  return { x, y: baseY - arc };
}

function drawProjectile(ctx, pos) {
  ctx.fillStyle = '#f2d24b';
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
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
