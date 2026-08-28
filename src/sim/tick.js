import { updateMining } from './systems/mining.js';
import { updateFormationSlots } from './systems/formation.js';
import { updateMovement } from './systems/movement.js';
import { updateCombat, updateDeaths } from './systems/combat.js';
import { updateProjectiles } from './systems/projectiles.js';
import { updateStructureDeaths } from './systems/supply.js';
import { updateRegeneration } from './systems/regeneration.js';
import { updateHeroCooldowns, updateHeroControl } from './systems/heroes.js';
import { updateProductionQueue } from './systems/production.js';
import { updateAiDecisions } from './ai/behavior.js';
import { updateRavens } from './systems/raven.js';
import { recordGoldHistory } from './goldHistory.js';

const NO_INPUT = { player: { moveLeft: false, moveRight: false } };

// Single source of truth for tick order, shared by the browser (main.js)
// and the headless runner (tools/headless.js) so they can never drift.
// `input` defaults to all-false so headless scripted matches (which never
// direct-control a hero) don't need to pass anything.
export function runTick(world, dt, input = NO_INPUT) {
  if (world.matchState !== 'playing') return;

  world.matchElapsedTime += dt;
  recordGoldHistory(world);

  // Update temporary vision before AI decisions so Raven visibility naturally
  // reaches the existing current-observation/memory path on this tick.
  updateRavens(world, dt);
  updateAiDecisions(world, dt); // no-ops for any team with no difficulty set
  updateHeroCooldowns(world, dt);
  updateHeroControl(world, input, dt);
  updateProductionQueue(world, dt); // materializes anything whose build timer elapsed this tick
  updateMining(world, dt);
  updateFormationSlots(world); // must run before movement — assigns this tick's slotX/slotY
  updateMovement(world, dt);
  updateCombat(world, dt);
  updateProjectiles(world, dt);
  updateRegeneration(world, dt);
  updateDeaths(world, dt);
  updateStructureDeaths(world, dt);
}
