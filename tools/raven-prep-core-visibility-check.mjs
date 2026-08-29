import { CONFIG } from '../src/config.js';
import { getRavenPreparationProgress } from '../src/render/ui.js';
import { getPlayerAttackTargetRevealSources, isEntityVisibleInPlayerView } from '../src/render/spectatorVision.js';
import { buyRaven } from '../src/sim/systems/economy.js';
import { createUnit, createWorld } from '../src/sim/world.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

// Raven remains outside the queue, but its existing preparation lifecycle needs
// a renderer-owned build-button progress signal.
{
  const world = createWorld(829);
  world.matchState = 'playing';
  world.teams.player.gold = CONFIG.RAVEN.cost;
  expect(getRavenPreparationProgress(world, 'player') === null, 'Available Raven must not show a preparation bar.');
  expect(buyRaven(world, 'player').ok, 'Raven preparation fixture must purchase successfully.');
  const raven = world.ravens[0];
  expect(getRavenPreparationProgress(world, 'player') === 0, 'Freshly preparing Raven must start its bar at zero.');
  raven.preparationRemaining = CONFIG.RAVEN.preparationTime / 2;
  expect(getRavenPreparationProgress(world, 'player') === 0.5, 'Raven preparation bar must be half complete at half remaining preparation time.');
  raven.state = 'flying';
  expect(getRavenPreparationProgress(world, 'player') === null, 'Flying Raven must not retain a build-preparation bar.');
}

// Archer range (520) exceeds ordinary team vision (475). The known enemy core
// must fully render while a living Player archer is actively targeting it, but
// must return to ordinary known-location presentation when no Player action is
// directed at the core.
{
  const world = createWorld(830);
  world.units = [];
  const enemyCore = world.statues.ai;
  const archer = createUnit('archer', 'player', enemyCore.x - CONFIG.UNIT_STATS.archer.range, CONFIG.GROUND_Y);
  world.units.push(archer);
  expect(!isEntityVisibleInPlayerView(world, enemyCore), 'Core must begin outside ordinary Player vision at maximum archer range.');
  archer.targetId = enemyCore.id;
  expect(!isEntityVisibleInPlayerView(world, enemyCore), 'Targeting must not mutate ordinary simulation visibility.');
  const revealSources = getPlayerAttackTargetRevealSources(world);
  expect(revealSources.length === 1 && revealSources[0].entityId === enemyCore.id, 'Player-targeted enemy core must add its vision bubble to Player presentation.');
  archer.targetId = null;
  expect(getPlayerAttackTargetRevealSources(world).length === 0, 'Untargeted enemy core must remove the temporary attack reveal source.');
}

console.log('PASS — Raven preparation progress and Player-targeted core disclosure contracts hold.');
