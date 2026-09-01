import { CONFIG } from '../config.js';
import { TEAM_COLORS } from './stickFigure.js';

const STATUE_WIDTH = 34;
const STATUE_HEIGHT = 80;
const STRUCTURE_WIDTH = 22;
const STRUCTURE_HEIGHT = 34;
const MINE_RADIUS = 10;

export function drawStatue(ctx, statue, { showHealth = true } = {}) {
  const isDestroyed = statue.state === 'destroyed';
  ctx.save();
  ctx.globalAlpha = isDestroyed ? 0.3 : 1;

  ctx.fillStyle = '#33333c';
  ctx.fillRect(statue.x - STATUE_WIDTH / 2, statue.y - STATUE_HEIGHT, STATUE_WIDTH, STATUE_HEIGHT);
  ctx.strokeStyle = TEAM_COLORS[statue.team] ?? '#cccccc';
  ctx.lineWidth = 3;
  ctx.strokeRect(statue.x - STATUE_WIDTH / 2, statue.y - STATUE_HEIGHT, STATUE_WIDTH, STATUE_HEIGHT);

  ctx.restore();

  if (showHealth && !isDestroyed) drawHealthBar(ctx, statue.x, statue.y - STATUE_HEIGHT - 12, statue.hp, statue.maxHp, 40);
}

// Enemy base locations remain known outside vision, but this intentionally
// ignores hp/state so it cannot reveal live core information.
export function drawKnownBase(ctx, statue) {
  ctx.save();
  ctx.fillStyle = '#25252c';
  ctx.fillRect(statue.x - STATUE_WIDTH / 2, statue.y - STATUE_HEIGHT, STATUE_WIDTH, STATUE_HEIGHT);
  ctx.strokeStyle = '#60606c';
  ctx.lineWidth = 2;
  ctx.strokeRect(statue.x - STATUE_WIDTH / 2, statue.y - STATUE_HEIGHT, STATUE_WIDTH, STATUE_HEIGHT);
  ctx.restore();
}

export function drawStructure(ctx, structure, { showHealth = true } = {}) {
  const isDestroyed = structure.state === 'destroyed';
  const alpha = isDestroyed ? Math.max(0, structure.destroyTimer / CONFIG.STRUCTURE_DESTROY_DURATION) : 1;

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = '#2c2c33';
  ctx.fillRect(structure.x - STRUCTURE_WIDTH / 2, structure.y - STRUCTURE_HEIGHT, STRUCTURE_WIDTH, STRUCTURE_HEIGHT);
  ctx.strokeStyle = TEAM_COLORS[structure.team] ?? '#cccccc';
  ctx.lineWidth = 2;
  ctx.strokeRect(structure.x - STRUCTURE_WIDTH / 2, structure.y - STRUCTURE_HEIGHT, STRUCTURE_WIDTH, STRUCTURE_HEIGHT);

  ctx.restore();

  if (showHealth && !isDestroyed) drawHealthBar(ctx, structure.x, structure.y - STRUCTURE_HEIGHT - 10, structure.hp, structure.maxHp, 24);
}

export function drawTurret(ctx, turret, { showHealth = true } = {}) {
  const destroyed = turret.state === 'destroyed';
  const scale = CONFIG.TURRET_RENDER_SCALE;
  const width = 32 * scale; const height = 52 * scale; const barrelLength = 28 * scale;
  ctx.save(); ctx.globalAlpha = destroyed ? Math.max(0, turret.destroyTimer / CONFIG.STRUCTURE_DESTROY_DURATION) : 1;
  ctx.fillStyle = '#303744'; ctx.fillRect(turret.x - width / 2, turret.y - height, width, height);
  ctx.strokeStyle = TEAM_COLORS[turret.team] ?? '#cccccc'; ctx.lineWidth = 3; ctx.strokeRect(turret.x - width / 2, turret.y - height, width, height);
  const direction = turret.team === 'player' ? 1 : -1;
  ctx.fillStyle = '#9aa0aa'; ctx.fillRect(turret.x, turret.y - height + 9 * scale, direction * barrelLength, 8 * scale);
  ctx.restore();
  if (showHealth && !destroyed) drawHealthBar(ctx, turret.x, turret.y - height - 12, turret.hp, turret.maxHp, 34 * scale);
}

export function drawMine(ctx, mine) {
  ctx.fillStyle = '#c9a227';
  ctx.beginPath();
  ctx.moveTo(mine.x, mine.y - MINE_RADIUS * 2);
  ctx.lineTo(mine.x + MINE_RADIUS, mine.y);
  ctx.lineTo(mine.x - MINE_RADIUS, mine.y);
  ctx.closePath();
  ctx.fill();
}

export function drawHealthBar(ctx, centerX, y, hp, maxHp, width) {
  const height = 4;
  const x = centerX - width / 2;
  const pct = Math.max(0, hp / maxHp);

  ctx.fillStyle = '#402020';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#e0a030' : '#e03030';
  ctx.fillRect(x, y, width * pct, height);
}
