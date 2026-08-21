import { CONFIG } from '../src/config.js';
import { updateAiDecisions } from '../src/sim/ai/behavior.js';
import { createUnit, createWorld } from '../src/sim/world.js';

const team = 'ai';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function createHardWorld() {
  const world = createWorld(611);
  world.matchState = 'playing';
  world.teams[team].difficulty = 'hard';
  world.teams[team].command = 'attack';
  world.teams[team].decisionTimer = 0;
  world.teams[team].gold = 10_000;
  world.units.push(createUnit('miner', team, CONFIG.AI_HOME_X, CONFIG.GROUND_Y));
  return world;
}

function addCombat(world, owner, kind, x) {
  world.units.push(createUnit(kind, owner, x, CONFIG.GROUND_Y));
}

function decide(world) {
  world.teams[team].decisionTimer = 0;
  updateAiDecisions(world, 1 / CONFIG.TICK_HZ);
  return world.teams[team].lastAiDecision;
}

// A single forward scout/survivor is not enough pressure to hold the team in
// Attack below the global sustain boundary.
{
  const world = createHardWorld();
  addCombat(world, team, 'warrior', 1300);
  addCombat(world, team, 'warrior', 2500);
  addCombat(world, team, 'warrior', 3000);
  addCombat(world, team, 'warrior', 3500);
  const record = decide(world);
  expect(record.observed.frontline.friendlyCombatCount === 1, `Fixture must represent a lone forward survivor; got ${JSON.stringify(record.observed.frontline)}.`);
  expect(record.goal === 'buildArmy' && record.command === 'defend', `A lone advanced fighter must not sustain Attack; got ${JSON.stringify({ goal: record.goal, command: record.command })}.`);
}

// Two local fighters are the minimum meaningful forward mass for the exception.
{
  const world = createHardWorld();
  addCombat(world, team, 'warrior', 1300);
  addCombat(world, team, 'warrior', 1400);
  addCombat(world, team, 'warrior', 2500);
  addCombat(world, team, 'warrior', 3000);
  const record = decide(world);
  expect(record.observed.frontline.friendlyCombatCount === 2, `Fixture must represent a minimal forward pressure band; got ${JSON.stringify(record.observed.frontline)}.`);
  expect(record.observed.objective.progress >= 0.7, `Fixture must be materially advanced; got ${record.observed.objective.progress}.`);
  expect(record.goal === 'attack' && record.command === 'attack', `Advanced two-unit local pressure must sustain Attack below global sustain; got ${JSON.stringify({ goal: record.goal, command: record.command, frontline: record.observed.frontline, objective: record.observed.objective })}.`);
  expect(record.attackCommitment.sustainReason === 'forward-frontline-pressure', `Forward sustain reason must be inspectable; got ${JSON.stringify(record.attackCommitment)}.`);
}

// A low-progress four-unit attack remains the existing rebuild/defend case.
{
  const world = createHardWorld();
  addCombat(world, team, 'warrior', 4300);
  addCombat(world, team, 'warrior', 4400);
  addCombat(world, team, 'warrior', 4500);
  addCombat(world, team, 'warrior', 4600);
  const record = decide(world);
  expect(record.goal === 'buildArmy' && record.command === 'defend', `Low-progress global under-strength must not sustain Attack; got ${JSON.stringify({ goal: record.goal, command: record.command })}.`);
}

// Current visible local superiority is required. Hidden/remembered information
// cannot permit a forward sustain decision.
{
  const world = createHardWorld();
  addCombat(world, team, 'warrior', 1300);
  addCombat(world, team, 'warrior', 2500);
  addCombat(world, team, 'warrior', 3000);
  addCombat(world, team, 'warrior', 3500);
  addCombat(world, 'player', 'archer', 1280);
  addCombat(world, 'player', 'archer', 1260);
  const record = decide(world);
  expect(record.observed.frontline.visibleEnemyPower > record.observed.frontline.friendlyPower, `Fixture must have current visible local enemy superiority; got ${JSON.stringify(record.observed.frontline)}.`);
  expect(record.goal === 'buildArmy' && record.command === 'defend', `Visible local enemy superiority must prevent forward sustain; got ${JSON.stringify({ goal: record.goal, command: record.command })}.`);
}

console.log('PASS — forward Attack sustain requires high objective progress and current local frontline advantage.');
