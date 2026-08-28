import { CONFIG } from '../src/config.js';
import { getFogLayerDimensions, projectFogSourceToViewport } from '../src/render/renderer.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const canvas = { width: CONFIG.VIEWPORT_WIDTH, height: CONFIG.CANVAS_HEIGHT };
const camera = { x: 400, zoom: 0.7 };

const dimensions = getFogLayerDimensions(canvas);
expect(dimensions.width === canvas.width && dimensions.height === canvas.height,
  `Fog must rasterize only the viewport (${canvas.width}x${canvas.height}), got ${dimensions.width}x${dimensions.height}.`);

const projected = projectFogSourceToViewport({ x: 1400, y: CONFIG.GROUND_Y, radius: 425 }, camera);
expect(projected.x === 700 && projected.y === CONFIG.GROUND_Y && projected.radius === 297.5,
  `Fog source must project through camera position/zoom, got ${JSON.stringify(projected)}.`);

console.log('PASS — fog buffer is viewport-sized and projects world vision through the camera.');
