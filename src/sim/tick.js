import { updateMining } from './systems/mining.js';
import { updateMovement } from './systems/movement.js';
import { updateCombat, updateDeaths } from './systems/combat.js';
import { updateProjectiles } from './systems/projectiles.js';
import { updateStructureDeaths } from './systems/supply.js';

// Single source of truth for tick order, shared by the browser (main.js)
// and the headless runner (tools/headless.js) so they can never drift.
export function runTick(world, dt) {
  if (world.matchState !== 'playing') return;

  updateMining(world, dt);
  updateMovement(world, dt);
  updateCombat(world, dt);
  updateProjectiles(world, dt);
  updateDeaths(world, dt);
  updateStructureDeaths(world, dt);
}
