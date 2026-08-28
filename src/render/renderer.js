import { CONFIG } from '../config.js';
import { isWatchAiMatch } from '../sim/world.js';
import { getTeamVisionSources, isPositionVisibleToTeam } from '../sim/vision.js';
import { drawStickFigure } from './stickFigure.js';
import { isEntityVisibleInSpectatorView, spectatorViewTeam } from './spectatorVision.js';
import { drawStatue, drawKnownBase, drawStructure, drawTurret, drawMine, drawHealthBar } from './structures.js';
import { drawHUD, drawBuildMenu, drawWinLoseOverlay, drawMenuScreen, getBottomBarTop, drawZoomControls, drawTouchCommandControls, drawWatchSpeedButton, drawSpectatorViewSelector, drawPauseButton, drawPauseOverlay } from './ui.js';
import { drawParallax } from './parallax.js';
import { drawMatchTelemetry, drawWatchTelemetryOverlay } from './watchTelemetryOverlay.js';



// Reads world state only; never mutates it. Spectator perspective is uiState
// only and therefore cannot affect simulation, AI knowledge, or RNG.
export function render(ctx, world, camera, uiMessage, uiState) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const spectatorView = isWatchAiMatch(world) ? uiState.spectatorView : 'full';
  const spectatorTeam = spectatorViewTeam(spectatorView);
  const visibleToSpectator = (entity) => isEntityVisibleInSpectatorView(world, spectatorView, entity);

  drawParallax(ctx, camera);
  ctx.save();
  ctx.translate(0, CONFIG.GROUND_Y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -CONFIG.GROUND_Y);

  const visible = (x) => {
    const visibleWorldWidth = CONFIG.VIEWPORT_WIDTH / camera.zoom;
    return x >= camera.x - CONFIG.CAMERA_CULL_MARGIN && x <= camera.x + visibleWorldWidth + CONFIG.CAMERA_CULL_MARGIN;
  };

  for (const mineField of Object.values(world.mines)) {
    for (const deposit of mineField.deposits) {
      if (visible(deposit.x)) drawMine(ctx, deposit);
    }
  }

  // General base locations remain known. Outside vision the neutral silhouette
  // intentionally excludes hp and destroyed/live state.
  for (const statue of Object.values(world.statues)) {
    if (!visible(statue.x)) continue;
    if (visibleToSpectator(statue)) drawStatue(ctx, statue);
    else drawKnownBase(ctx, statue);
  }
  if (spectatorTeam !== null) drawVisionFog(ctx, world, spectatorTeam);

  for (const structure of world.structures) {
    if (visible(structure.x) && visibleToSpectator(structure)) structure.isTurret ? drawTurret(ctx, structure) : drawStructure(ctx, structure);
  }
  for (const raven of world.ravens) {
    const visibleRaven = spectatorTeam === null || raven.team === spectatorTeam || isPositionVisibleToTeam(world, spectatorTeam, raven.x, raven.y);
    if (!visible(raven.x) || !visibleRaven) continue;
    drawRaven(ctx, raven);
  }
  for (const unit of world.units) {
    if (!visible(unit.x) || !visibleToSpectator(unit)) continue;
    drawStickFigure(ctx, unit);
    if (unit.state !== 'dying') drawHealthBar(ctx, unit.x, unit.y - 80, unit.hp, unit.maxHp, 24);
  }
  for (const projectile of world.projectiles) {
    const pos = projectilePosition(projectile);
    const visibleProjectile = spectatorTeam === null || projectile.team === spectatorTeam || isPositionVisibleToTeam(world, spectatorTeam, pos.x, pos.y);
    if (visible(pos.x) && visibleProjectile) drawProjectile(ctx, pos);
  }
  ctx.restore();

  if (world.matchState === 'menu') {
    drawMenuScreen(ctx, uiState);
    return;
  }
  if (!isWatchAiMatch(world)) drawHUD(ctx, world, uiMessage);
  drawWatchTelemetryOverlay(ctx, world, spectatorView);
  drawMatchTelemetry(ctx, world, { showGoldDifferential: !isWatchAiMatch(world) || spectatorView === 'full' });
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

function drawVisionFog(ctx, world, team) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, -1000, CONFIG.WORLD_WIDTH, 2500);
  for (const source of getTeamVisionSources(world, team)) {
    ctx.moveTo(source.x + source.radius, source.y);
    ctx.arc(source.x, source.y, source.radius, 0, Math.PI * 2);
  }
  ctx.clip('evenodd');
  ctx.fillStyle = `rgba(10, 12, 20, ${CONFIG.SPECTATOR_FOG_ALPHA})`;
  ctx.fillRect(0, -1000, CONFIG.WORLD_WIDTH, 2500);
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
