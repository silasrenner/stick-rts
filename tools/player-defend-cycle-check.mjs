import { CONFIG } from '../src/config.js';
import { createWorld } from '../src/sim/world.js';
import { buyTurret } from '../src/sim/systems/economy.js';
import { updateProductionQueue } from '../src/sim/systems/production.js';
import { setTeamCommand } from '../src/sim/systems/commands.js';
import { updateFormationSlots } from '../src/sim/systems/formation.js';
import { createUnit } from '../src/sim/world.js';

function expect(value, message) {
  if (!value) throw new Error(message);
}

function addBuildableTurrets(world, team, count) {
  world.teams[team].gold = 10_000;
  for (let index = 0; index < count; index += 1) {
    expect(buyTurret(world, team).ok, `${team} turret ${index + 1} should queue.`);
    updateProductionQueue(world, CONFIG.TURRET_BUILD_TIME);
  }
}

function expectedAnchor(team, offset) {
  return team === 'player'
    ? CONFIG.PLAYER_HOME_X + offset
    : CONFIG.AI_HOME_X - offset;
}

{
  const team = 'player';
  const world = createWorld(117);
  world.matchState = 'playing';
  addBuildableTurrets(world, team, 3);
  const warrior = createUnit('warrior', team, CONFIG.PLAYER_HOME_X, CONFIG.GROUND_Y);
  const archer = createUnit('archer', team, warrior.x, CONFIG.GROUND_Y);
  world.units.push(warrior, archer);

  for (const [press, offset] of CONFIG.TURRET_SLOT_OFFSETS.entries()) {
    setTeamCommand(world, team, 'defend', { userInitiated: true });
    updateFormationSlots(world);
    expect(warrior.slotX === expectedAnchor(team, offset), `Player Defend press ${press + 1} should anchor warriors at turret offset ${offset}; got ${warrior.slotX}.`);
    expect(archer.slotX < warrior.slotX, `Player Defend press ${press + 1} should keep archers behind warriors.`);
  }

  setTeamCommand(world, team, 'defend', { userInitiated: true });
  updateFormationSlots(world);
  expect(warrior.slotX === expectedAnchor(team, CONFIG.TURRET_SLOT_OFFSETS[0]), 'Player Defend must wrap from the furthest completed turret back to the inner completed turret.');
}

{
  const team = 'ai';
  const world = createWorld(117);
  world.matchState = 'playing';
  addBuildableTurrets(world, team, 3);
  const warrior = createUnit('warrior', team, CONFIG.AI_HOME_X, CONFIG.GROUND_Y);
  world.units.push(warrior);
  for (let press = 0; press < 3; press += 1) {
    setTeamCommand(world, team, 'defend');
    updateFormationSlots(world);
    expect(warrior.slotX === expectedAnchor(team, CONFIG.TURRET_SLOT_OFFSETS[0]), 'AI Defend must remain at its inner turret.');
  }
}

console.log('PASS — Player Defend advances one completed turret at a time and wraps to inner; AI Defend stays at its inner turret.');
