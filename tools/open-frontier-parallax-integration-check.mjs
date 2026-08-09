import assert from 'node:assert/strict';
import { drawParallax } from '../src/render/parallax.js';

let backgroundCalls = 0;
const ctx = {
  canvas: { width: 1400, height: 540 },
  save() {}, restore() {}, translate() {}, scale() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, fillRect() {}, arc() {},
};

drawParallax(ctx, { x: 0, zoom: 0.7 }, () => {
  backgroundCalls += 1;
  return true;
});

assert.equal(backgroundCalls, 1, 'parallax should ask the approved master background to draw first');
console.log('open-frontier parallax integration contract passed');
