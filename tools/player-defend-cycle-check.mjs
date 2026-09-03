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

function expectedAnchor(team, turretIndex) {
  const sign = team === 'player' ? 1 : -1;
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const formationColumns = turretIndex === 0
    ? CONFIG.DEFEND_FIRST_BUILD_TURRET_FRONT_COLUMNS
    : -CONFIG.DEFEND_LATER_BUILD_TURRET_BACK_COLUMNS;
  return homeX + sign * (CONFIG.TURRET_SLOT_OFFSETS[turretIndex] + formationColumns * CONFIG.FORMATION_SLOT_SPACING_X);
}

{
  const team = 'player';
  const world = createWorld(117);
  world.matchState = 'playing';
  addBuildableTurrets(world, team, 4);
  const warrior = createUnit('warrior', team, CONFIG.PLAYER_HOME_X, CONFIG.GROUND_Y);
  const archer = createUnit('archer', team, warrior.x, CONFIG.GROUND_Y);
  world.units.push(warrior, archer);

  for (const [press] of CONFIG.TURRET_SLOT_OFFSETS.entries()) {
    setTeamCommand(world, team, 'defend', { userInitiated: true });
    updateFormationSlots(world);
    expect(warrior.slotX === expectedAnchor(team, press), `Player Defend press ${press + 1} should place warriors on the approved side of buildable turret ${press + 1}; got ${warrior.slotX}.`);
    expect(archer.slotX < warrior.slotX, `Player Defend press ${press + 1} should keep archers behind warriors.`);
  }

  setTeamCommand(world, team, 'defend', { userInitiated: true });
  updateFormationSlots(world);
  expect(warrior.slotX === expectedAnchor(team, 0), 'Player Defend must wrap from the furthest completed turret back to the inner completed turret placement.');
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
    expect(warrior.slotX === expectedAnchor(team, 0), 'AI Defend must remain at the first built turret placement.');
  }
}

console.log('PASS — first-turret defense screens ahead, later Player selections hold behind, and AI stays at its first buildable-turret placement.');
