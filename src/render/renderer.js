import { CONFIG } from '../config.js';
import { isWatchAiMatch } from '../sim/world.js';
import { drawStickFigure } from './stickFigure.js';
import { drawStatue, drawStructure, drawTurret, drawMine, drawHealthBar } from './structures.js';
import { drawHUD, drawBuildMenu, drawWinLoseOverlay, drawMenuScreen, getBottomBarTop, drawZoomControls, drawTouchCommandControls, drawWatchSpeedButton, drawPauseButton, drawPauseOverlay } from './ui.js';
import { drawParallax } from './parallax.js';
import { drawWatchTelemetryOverlay } from './watchTelemetryOverlay.js';

const LEGEND_LINE =
  'Your command: Q Attack  W Defend  E Retreat   |   Hero: H Toggle control  ←/→ Move  J Attack  K Special   |   Debug: F FPS  S Stress-spawn';

// Reads world state only; never mutates it. World-space entities are
// culled to the camera's visible window (+ margin) — this is the whole
// of the "no off-screen enemy info" rule: if it isn't drawn, it isn't
// known. HUD/build menu/legend/overlay are screen-space and unaffected
// by camera position.
export function render(ctx, world, camera, uiMessage, uiState) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  drawParallax(ctx, camera);

  ctx.save();
  // S10: scale before translate — canvas composes transforms so the
  // *last*-called op acts on points first, so scale-then-translate is what
  // makes camera.x a world-space left-edge coordinate (screenX =
  // zoom*(worldX - camera.x)), matching every consumer in camera.js
  // (edge-scroll, hero-follow, pan clamps, cursor-anchored zoom). The old
  // translate-then-scale order silently computed zoom*worldX - camera.x
  // instead — invisible while zoom was a fixed constant, but it would
  // break cursor-anchored zoom now that zoom is dynamic.
  // Preserve the ground-plane composition through zoom. Scaling from the
  // canvas origin made GROUND_Y jump from 147px at min zoom to 616px at max:
  // zoom-out left a void beneath the battle and zoom-in pushed it into the
  // footer. This keeps screenX = zoom*(worldX-cameraX) and makes
  // screenY = GROUND_Y + zoom*(worldY-GROUND_Y).
  ctx.translate(0, CONFIG.GROUND_Y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -CONFIG.GROUND_Y);

  // Visible world span widens under zoom-out (zoom < 1) — cull against
  // that, not the raw viewport width, or entities the zoom reveals get
  // wrongly culled. CAMERA_CULL_MARGIN is expressed in world px here too.
  const visibleWorldWidth = CONFIG.VIEWPORT_WIDTH / camera.zoom;
  const visible = (x) =>
    x >= camera.x - CONFIG.CAMERA_CULL_MARGIN && x <= camera.x + visibleWorldWidth + CONFIG.CAMERA_CULL_MARGIN;

  if (visible(world.mines.player.x)) drawMine(ctx, world.mines.player);
  if (visible(world.mines.ai.x)) drawMine(ctx, world.mines.ai);

  if (visible(world.statues.player.x)) drawStatue(ctx, world.statues.player);
  if (visible(world.statues.ai.x)) drawStatue(ctx, world.statues.ai);

  for (const structure of world.structures) {
    if (visible(structure.x)) structure.isTurret ? drawTurret(ctx, structure) : drawStructure(ctx, structure);
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

  // The landing menu replaces the HUD/build-menu/win-lose stack entirely —
  // drawHUD has no matchState guard of its own (it reads world.teams.player.*
  // unconditionally), so this early return is required, not optional, to
  // avoid "Gold: 0 / Units: 0" bleeding onto the menu.
  if (world.matchState === 'menu') {
    drawMenuScreen(ctx, uiState);
    return;
  }

  drawLegend(ctx, world);
  drawHUD(ctx, world, uiMessage);
  drawWatchTelemetryOverlay(ctx, world);
  drawZoomControls(ctx, isWatchAiMatch(world));
  if (isWatchAiMatch(world) && world.matchState === 'playing') drawWatchSpeedButton(ctx, uiState.watchSpeed);
  if (uiState.touchControlsEnabled && !isWatchAiMatch(world) && world.matchState === 'playing') drawTouchCommandControls(ctx, world);
  drawBuildMenu(ctx, world);
  drawWinLoseOverlay(ctx, world);
  if (world.matchState === 'playing') drawPauseButton(ctx, uiState.paused, isWatchAiMatch(world));
  if (uiState.paused) drawPauseOverlay(ctx);
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

const LEGEND_LINE_GAP = 6; // px above the bottom bar (build+queue) before the legend's lower line
const LEGEND_LINE_HEIGHT = 14;

// S11: anchored off getBottomBarTop() instead of fixed canvas.height offsets
// — the redesigned bottom bar (build buttons + queue chips) claims more of
// the footer than the old single build-menu row, so the legend must track
// its actual height rather than assume a fixed one.
function drawLegend(ctx, world) {
  ctx.fillStyle = '#8a8a96';
  ctx.font = '11px monospace';
  const bottomLineY = getBottomBarTop(ctx.canvas) - LEGEND_LINE_GAP;

  if (isWatchAiMatch(world)) return;

  const difficulty = world.teams.ai.difficulty;
  const label = difficulty ? difficulty[0].toUpperCase() + difficulty.slice(1) : 'none';
  ctx.fillText(`AI difficulty: ${label}`, 10, bottomLineY - LEGEND_LINE_HEIGHT);
  ctx.fillText(LEGEND_LINE, 10, bottomLineY);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
