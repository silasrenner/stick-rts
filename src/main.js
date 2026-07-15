import { CONFIG } from './config.js';
import { createWorld, createUnit } from './sim/world.js';
import { createAccumulator } from './sim/loop.js';
import { updateMovement } from './sim/systems/movement.js';
import { render } from './render/renderer.js';

const canvas = document.getElementById('game');
canvas.width = CONFIG.CANVAS_WIDTH;
canvas.height = CONFIG.CANVAS_HEIGHT;
const ctx = canvas.getContext('2d');

const world = createWorld();
const demoUnit = createUnit('demo', 'player', 50, CONFIG.CANVAS_HEIGHT - 60);
demoUnit.vx = CONFIG.WALK_SPEED;
world.units.push(demoUnit);

const accumulator = createAccumulator(1000 / CONFIG.TICK_HZ);

let lastTime = performance.now();
let tickCount = 0;

function frame(time) {
  const deltaMs = time - lastTime;
  lastTime = time;

  accumulator.advance(deltaMs, (dt) => {
    updateMovement(world, dt);
    tickCount++;
  });

  render(ctx, world);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Manual verification hook: sample twice ~1000ms apart in devtools console
// and confirm the delta is ~60, proving sim rate is steady 60Hz regardless
// of display refresh rate.
window.__tickCount = () => tickCount;
