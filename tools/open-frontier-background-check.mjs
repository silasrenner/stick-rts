import assert from 'node:assert/strict';
import { OPEN_FRONTIER_MASTER, getOpenFrontierSourceCrop } from '../src/render/openFrontierBackground.js';

const crop = getOpenFrontierSourceCrop(1400, 540);

assert.deepEqual(OPEN_FRONTIER_MASTER, {
  src: 'assets/art/source/open-frontier/open-frontier-master.jpg',
  width: 1280,
  height: 720,
});
assert.equal(crop.sx, 0);
assert.equal(crop.sw, 1280);
assert.ok(Math.abs(crop.sy - (720 - (1280 * 540 / 1400)) / 2) < 0.0001);
assert.ok(Math.abs(crop.sh - (1280 * 540 / 1400)) < 0.0001);

console.log('open-frontier background contract passed');
