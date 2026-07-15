const HEAD_RADIUS = 8;
const TORSO_LENGTH = 26;
const LEG_LENGTH = 24;
const ARM_LENGTH = 20;

const WALK_LIMB_AMPLITUDE = 0.6; // rad
const IDLE_SWAY_AMPLITUDE = 0.08; // rad

const TEAM_COLORS = {
  player: '#4da6ff',
  ai: '#ff5c5c',
};

// unit.x/unit.y is the ground point between the figure's feet.
export function drawStickFigure(ctx, unit) {
  const isWalking = unit.state === 'walking';
  const teamColor = TEAM_COLORS[unit.team] ?? '#cccccc';

  const hipY = -LEG_LENGTH;
  const shoulderY = hipY - TORSO_LENGTH;
  const headCenterY = shoulderY - HEAD_RADIUS - 2;

  const legSwing = isWalking ? Math.sin(unit.animPhase) * WALK_LIMB_AMPLITUDE : 0;
  const armSwing = isWalking
    ? Math.sin(unit.animPhase + Math.PI) * WALK_LIMB_AMPLITUDE
    : Math.sin(unit.animPhase) * IDLE_SWAY_AMPLITUDE;

  ctx.save();
  ctx.translate(unit.x, unit.y);
  ctx.scale(unit.facing, 1);
  ctx.strokeStyle = '#e8e8ee';
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

  // arms, opposite phase to legs on the same side (natural gait)
  drawLimb(ctx, 0, shoulderY, ARM_LENGTH, armSwing);
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
