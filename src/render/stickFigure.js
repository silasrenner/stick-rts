import { CONFIG } from '../config.js';

const HEAD_RADIUS = 8;
const TORSO_LENGTH = 26;
const LEG_LENGTH = 24;
const ARM_LENGTH = 20;

const WALK_LIMB_AMPLITUDE = 0.6; // rad
const IDLE_SWAY_AMPLITUDE = 0.08; // rad
const ATTACK_LUNGE_ANGLE = 1.4; // rad, front arm at moment of attack

const HERO_SCALE = 1.3;
const STAR_RADIUS = 6;

export const TEAM_COLORS = {
  player: '#4da6ff',
  ai: '#ff5c5c',
};

const KIND_COLORS = {
  miner: '#c9b37e',
  warrior: '#d8dae2',
  archer: '#7fd18f',
  forgemaster: '#e0c34c',
  hawkeye: '#c48fe0',
  vanguard: '#e08f4c',
};

// unit.x/unit.y is the ground point between the figure's feet.
export function drawStickFigure(ctx, unit) {
  const isWalking = unit.state === 'walking';
  const isAttacking = unit.attackAnimTimer > 0;
  const isDying = unit.state === 'dying';
  const scale = unit.isHero ? HERO_SCALE : 1;

  const bodyColor = KIND_COLORS[unit.kind] ?? '#e8e8ee';
  const teamColor = TEAM_COLORS[unit.team] ?? '#cccccc';

  const hipY = -LEG_LENGTH;
  const shoulderY = hipY - TORSO_LENGTH;
  const headCenterY = shoulderY - HEAD_RADIUS - 2;

  const legSwing = isWalking ? Math.sin(unit.animPhase) * WALK_LIMB_AMPLITUDE : 0;
  const armSwing = isWalking
    ? Math.sin(unit.animPhase + Math.PI) * WALK_LIMB_AMPLITUDE
    : Math.sin(unit.animPhase) * IDLE_SWAY_AMPLITUDE;

  const frontArmAngle = isAttacking
    ? lerp(ATTACK_LUNGE_ANGLE, armSwing, 1 - unit.attackAnimTimer / CONFIG.ATTACK_ANIM_DURATION)
    : armSwing;

  ctx.save();
  ctx.translate(unit.x, unit.y);
  ctx.scale(unit.facing * scale, scale);

  if (isDying) {
    const progress = 1 - unit.deathTimer / CONFIG.DEATH_DURATION;
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.rotate((Math.PI / 2) * progress);
  }

  if (unit.controlled) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 2, 16, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  // torso
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(0, shoulderY);
  ctx.stroke();

  // legs, opposite phase
  drawLimb(ctx, 0, hipY, LEG_LENGTH, legSwing);
  drawLimb(ctx, 0, hipY, LEG_LENGTH, -legSwing);

  // arms — front arm lunges forward on attack, opposite phase to legs otherwise
  drawLimb(ctx, 0, shoulderY, ARM_LENGTH, frontArmAngle);
  drawLimb(ctx, 0, shoulderY, ARM_LENGTH, -armSwing);

  // head
  ctx.beginPath();
  ctx.arc(0, headCenterY, HEAD_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  // team accent: headband
  ctx.strokeStyle = teamColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-HEAD_RADIUS, headCenterY - HEAD_RADIUS * 0.6);
  ctx.lineTo(HEAD_RADIUS, headCenterY - HEAD_RADIUS * 0.6);
  ctx.stroke();

  if (unit.isHero) {
    ctx.fillStyle = '#ffe066';
    drawStar(ctx, 0, headCenterY - HEAD_RADIUS - STAR_RADIUS - 4, STAR_RADIUS);
  }

  ctx.restore();
}

function drawLimb(ctx, originX, originY, length, angle) {
  const endX = originX + Math.sin(angle) * length;
  const endY = originY + Math.cos(angle) * length;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
}

function drawStar(ctx, cx, cy, outerRadius) {
  const innerRadius = outerRadius * 0.45;
  const points = 5;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
