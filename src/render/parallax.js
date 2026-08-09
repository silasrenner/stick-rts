import { CONFIG } from '../config.js';
import { drawOpenFrontierBackground } from './openFrontierBackground.js';

// Render-only background — reads camera.x and canvas size, never world
// state, so it's structurally incapable of coupling to sim logic.

const MOUNTAIN_COLOR = '#2a2f3d';
const TREE_TRUNK_COLOR = '#33291f';
const TREE_CANOPY_COLOR = '#1f3324';
const BUSH_COLOR = '#24391f';

function forEachTile(camera, speed, tileWidth, canvasWidth, drawTile) {
  const offset = -(camera.x * speed) % tileWidth;
  const tileCount = Math.ceil(canvasWidth / tileWidth) + 2;
  for (let i = -1; i < tileCount; i++) {
    drawTile(offset + i * tileWidth);
  }
}

function drawMountains(ctx, camera, canvasWidth) {
  const { PARALLAX_MOUNTAIN_TILE_WIDTH: tileWidth, PARALLAX_MOUNTAIN_HEIGHT: height, PARALLAX_MOUNTAIN_BASE_Y: baseY } =
    CONFIG;
  ctx.fillStyle = MOUNTAIN_COLOR;
  forEachTile(camera, CONFIG.PARALLAX_LAYER_SPEEDS[0], tileWidth, canvasWidth, (x) => {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + tileWidth * 0.25, baseY - height);
    ctx.lineTo(x + tileWidth * 0.5, baseY - height * 0.4);
    ctx.lineTo(x + tileWidth * 0.75, baseY - height * 0.85);
    ctx.lineTo(x + tileWidth, baseY);
    ctx.closePath();
    ctx.fill();
  });
}

function drawTrees(ctx, camera, canvasWidth) {
  const { PARALLAX_TREE_TILE_WIDTH: tileWidth, PARALLAX_TREE_HEIGHT: height, PARALLAX_TREE_BASE_Y: baseY } = CONFIG;
  const trunkWidth = 4;
  const trunkHeight = height * 0.3;
  forEachTile(camera, CONFIG.PARALLAX_LAYER_SPEEDS[1], tileWidth, canvasWidth, (x) => {
    const cx = x + tileWidth / 2;
    ctx.fillStyle = TREE_TRUNK_COLOR;
    ctx.fillRect(cx - trunkWidth / 2, baseY - trunkHeight, trunkWidth, trunkHeight);

    ctx.fillStyle = TREE_CANOPY_COLOR;
    ctx.beginPath();
    ctx.moveTo(cx, baseY - height);
    ctx.lineTo(cx - height * 0.35, baseY - trunkHeight);
    ctx.lineTo(cx + height * 0.35, baseY - trunkHeight);
    ctx.closePath();
    ctx.fill();
  });
}

function drawBushes(ctx, camera, canvasWidth) {
  const { PARALLAX_BUSH_TILE_WIDTH: tileWidth, PARALLAX_BUSH_HEIGHT: height, PARALLAX_BUSH_BASE_Y: baseY } = CONFIG;
  ctx.fillStyle = BUSH_COLOR;
  forEachTile(camera, CONFIG.PARALLAX_LAYER_SPEEDS[2], tileWidth, canvasWidth, (x) => {
    const cx = x + tileWidth / 2;
    ctx.beginPath();
    ctx.arc(cx, baseY, height / 2, Math.PI, 0);
    ctx.fill();
  });
}

export function drawParallax(ctx, camera, drawBackground = drawOpenFrontierBackground) {
  // The owner-approved original artwork is the primary production background.
  // Retain the old procedural layer only as a loading fallback, never as a
  // generated substitute for the supplied source art.
  if (drawBackground(ctx)) return;

  // S11 audit: drawParallax runs before renderer.js's world ctx.scale(camera.zoom, ...)

  // ctx.canvas.width — coverage was never actually broken by zoom. What was
  // broken: tile size/scroll rate stayed pixel-fixed regardless of zoom, so
  // a zoomed-out foreground (which shrinks) no longer matched a
  // pixel-static background, a visible scale mismatch. Fixed the same way
  // the world transform is: scale this layer's own draw by camera.zoom too,
  // using the effective (pre-scale) width for tile-count math so tiles
  // still cover the full canvas after the scale is applied.
  ctx.save();
  // Use the same ground-plane pivot as renderer.js so backdrop layers and
  // battlefield share a stable visual horizon at every zoom level.
  ctx.translate(0, CONFIG.GROUND_Y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(0, -CONFIG.GROUND_Y);
  const effectiveWidth = ctx.canvas.width / camera.zoom;
  drawMountains(ctx, camera, effectiveWidth);
  drawTrees(ctx, camera, effectiveWidth);
  drawBushes(ctx, camera, effectiveWidth);
  ctx.restore();
}
