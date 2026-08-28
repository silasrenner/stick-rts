import { CONFIG } from '../config.js';
import { isWatchAiMatch } from '../sim/world.js';
import { getTeamVisionSources, isPositionVisibleToTeam } from '../sim/vision.js';
import { drawStickFigure } from './stickFigure.js';
import { isEntityVisibleInPlayerView, isEntityVisibleInSpectatorView, spectatorViewTeam } from './spectatorVision.js';
import { drawStatue, drawKnownBase, drawStructure, drawTurret, drawMine, drawHealthBar } from './structures.js';
import { drawHUD, drawBuildMenu, drawWinLoseOverlay, drawMenuScreen, getBottomBarTop, drawZoomControls, drawTouchCommandControls, drawWatchSpeedButton, drawSpectatorViewSelector, drawPauseButton, drawPauseOverlay } from './ui.js';
import { drawParallax } from './parallax.js';
import { drawMatchTelemetry, drawWatchTelemetryOverlay } from './watchTelemetryOverlay.js';
import { createVisionMemory, getSustainedVisionSamples, updateVisionMemory } from './visionMemory.js';



// Reads world state only; never mutates it. Watch perspectives and the Player
// fog view are presentation-only and cannot affect simulation, AI knowledge, or RNG.
export function render(ctx, world, camera, uiMessage, uiState) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const watchAiMatch = isWatchAiMatch(world);
  const spectatorView = watchAiMatch ? uiState.spectatorView : 'left';
  const spectatorTeam = spectatorViewTeam(spectatorView);
  const visibleToViewer = watchAiMatch
    ? (entity) => isEntityVisibleInSpectatorView(world, spectatorView, entity)
    : (entity) => isEntityVisibleInPlayerView(world, entity);

  drawParallax(ctx, camera);
  ctx.save();
  ctx.translate(0, CONFIG.GROUND_Y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -CONFIG.GROUND_Y);

  const visible = (x) => {
    const visibleWorldWidth = CONFIG.VIEWPORT_WIDTH / camera.zoom;
    return x >= camera.x - CONFIG.CAMERA_CULL_MARGIN && x <= camera.x + visibleWorldWidth + CONFIG.CAMERA_CULL_MARGIN;
  };

  for (const statue of Object.values(world.statues)) {
    if (!visible(statue.x)) continue;
    if (visibleToViewer(statue)) drawStatue(ctx, statue);
    else drawKnownBase(ctx, statue);
  }
  if (spectatorTeam !== null) {
    const visionMemory = uiState.visionMemory ??= createVisionMemory();
    updateVisionMemory(visionMemory, getTeamVisionSources(world, spectatorTeam), world.matchElapsedTime);
    drawVisionFog(ctx, world, spectatorTeam, getSustainedVisionSamples(visionMemory, world.matchElapsedTime));
  }

  for (const structure of world.structures) {
    if (visible(structure.x) && visibleToViewer(structure)) structure.isTurret ? drawTurret(ctx, structure) : drawStructure(ctx, structure);
  }
  for (const raven of world.ravens) {
    const visibleRaven = spectatorTeam === null || raven.team === spectatorTeam || isPositionVisibleToTeam(world, spectatorTeam, raven.x, raven.y);
    if (!visible(raven.x) || !visibleRaven) continue;
    drawRaven(ctx, raven);
  }
  for (const unit of world.units) {
    if (!visible(unit.x) || !visibleToViewer(unit)) continue;
    drawStickFigure(ctx, unit);
    if (unit.state !== 'dying') drawHealthBar(ctx, unit.x, unit.y - 80, unit.hp, unit.maxHp, 24);
  }
  for (const projectile of world.projectiles) {
    const pos = projectilePosition(projectile);
    const visibleProjectile = spectatorTeam === null || projectile.team === spectatorTeam || isPositionVisibleToTeam(world, spectatorTeam, pos.x, pos.y);
    if (visible(pos.x) && visibleProjectile) drawProjectile(ctx, pos);
  }
  // Draw mine markers above workers, otherwise a miner standing directly on a
  // deposit hides the gold diamond. Enemy deposits still obey current vision.
  for (const [mineTeam, mineField] of Object.entries(world.mines)) {
    for (const deposit of mineField.deposits) {
      if (visible(deposit.x) && isMineVisibleToViewer(world, spectatorTeam, mineTeam, deposit)) drawMine(ctx, deposit);
    }
  }
  ctx.restore();

  if (world.matchState === 'menu') {
    drawMenuScreen(ctx, uiState);
    return;
  }
  if (!isWatchAiMatch(world)) drawHUD(ctx, world, uiMessage);
  drawWatchTelemetryOverlay(ctx, world, spectatorView);
  drawMatchTelemetry(ctx, world, { showGoldDifferential: watchAiMatch && spectatorView === 'full' });
  drawZoomControls(ctx, isWatchAiMatch(world));
  if (isWatchAiMatch(world) && world.matchState === 'playing') drawWatchSpeedButton(ctx, uiState.speed);
  if (isWatchAiMatch(world) && world.matchState === 'playing') drawSpectatorViewSelector(ctx, spectatorView);
  if (uiState.touchControlsEnabled && !isWatchAiMatch(world) && world.matchState === 'playing') drawTouchCommandControls(ctx, world);
  drawBuildMenu(ctx, world);
  drawWinLoseOverlay(ctx, world);
  if (world.matchState === 'playing') drawPauseButton(ctx, uiState.paused, isWatchAiMatch(world), uiState.touchControlsEnabled);
  if (uiState.paused) {
    if (uiState.guideOpen) drawMenuScreen(ctx, { ...uiState, menuScreen: 'guide' });
    else drawPauseOverlay(ctx, uiState.speed);
  }
}

export function isMineVisibleToViewer(world, viewerTeam, mineTeam, deposit) {
  return viewerTeam === null || mineTeam === viewerTeam || isPositionVisibleToTeam(world, viewerTeam, deposit.x, deposit.y);
}

export function drawVisionFog(ctx, world, team, sustainedSources = []) {
  // Subtract each source from one fog layer. destination-out preserves the
  // union of overlapping circles; the old even-odd clip inverted their overlap
  // and made shared vision appear dark. Recent presentation-only samples stay
  // fully clear for 10s, then their subtraction fades across the next 2s.
  ctx.save();
  ctx.fillStyle = `rgba(10, 12, 20, ${CONFIG.SPECTATOR_FOG_ALPHA})`;
  ctx.fillRect(0, -1000, CONFIG.WORLD_WIDTH, 2500);
  ctx.globalCompositeOperation = 'destination-out';
  for (const source of [...getTeamVisionSources(world, team), ...sustainedSources]) {
    ctx.globalAlpha = source.alpha ?? 1;
    ctx.beginPath();
    ctx.arc(source.x, source.y, source.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRaven(ctx, raven) {
  const color = raven.team === 'player' ? '#e0605c' : '#5c9be0';
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = '#17171d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(raven.x - 20, raven.y + 3);
  ctx.quadraticCurveTo(raven.x - 5, raven.y - 18, raven.x, raven.y - 3);
  ctx.quadraticCurveTo(raven.x + 5, raven.y - 18, raven.x + 20, raven.y + 3);
  ctx.quadraticCurveTo(raven.x, raven.y + 10, raven.x - 20, raven.y + 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8e8ee';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(raven.state === 'revealing' ? 'REVEAL' : 'RAVEN', raven.x, raven.y - 24);
  ctx.restore();
}

function projectilePosition(projectile) {
  const t = Math.min(1, projectile.elapsed / projectile.duration);
  const x = lerp(projectile.startX, projectile.targetX, t);
  const baseY = lerp(projectile.startY, projectile.targetY, t);
  return { x, y: baseY - Math.sin(Math.PI * t) * CONFIG.PROJECTILE_ARC_HEIGHT };
}
function drawProjectile(ctx, pos) {
  ctx.fillStyle = '#f2d24b'; ctx.beginPath(); ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2); ctx.fill();
}
function lerp(a, b, t) { return a + (b - a) * t; }
