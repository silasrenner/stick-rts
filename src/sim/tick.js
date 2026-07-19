import { updateMining } from './systems/mining.js';
import { updateFormationSlots } from './systems/formation.js';
import { updateMovement } from './systems/movement.js';
import { updateCombat, updateDeaths } from './systems/combat.js';
import { updateProjectiles } from './systems/projectiles.js';
import { updateStructureDeaths } from './systems/supply.js';
import { updateHeroCooldowns, updateHeroControl } from './systems/heroes.js';
import { updateProductionQueue } from './systems/production.js';
import { updateAiDecisions } from './ai/behavior.js';

const NO_INPUT = { player: { moveLeft: false, moveRight: false } };

// Single source of truth for tick order, shared by the browser (main.js)
// and the headless runner (tools/headless.js) so they can never drift.
// `input` defaults to all-false so headless scripted matches (which never
// direct-control a hero) don't need to pass anything.
export function runTick(world, dt, input = NO_INPUT) {
  if (world.matchState !== 'playing') return;

  world.matchElapsedTime += dt;

  updateAiDecisions(world, dt); // no-ops for any team with no difficulty set
  updateHeroCooldowns(world, dt);
  updateHeroControl(world, input, dt);
  updateProductionQueue(world, dt); // materializes anything whose build timer elapsed this tick
  updateMining(world, dt);
  updateFormationSlots(world); // must run before movement — assigns this tick's slotX/slotY
  updateMovement(world, dt);
  updateCombat(world, dt);
  updateProjectiles(world, dt);
  updateDeaths(world, dt);
  updateStructureDeaths(world, dt);
}
