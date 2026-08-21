import { CONFIG } from '../src/config.js';
import { buildAiAssessment } from '../src/sim/ai/assessment.js';
import { DIFFICULTIES } from '../src/sim/ai/difficulties.js';
import { updateAiMemory } from '../src/sim/ai/vision.js';
import { createStructure, createUnit, createWorld } from '../src/sim/world.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

// First vertical contract: live enemy knowledge must be exactly the shared
// team-vision result, rather than Hard's former global or AI-local approximation.
{
  const world = createWorld(201);
  const hiddenEnemy = createUnit('warrior', 'player', CONFIG.PLAYER_HOME_X, CONFIG.GROUND_Y);
  const aiUnit = createUnit('miner', 'ai', CONFIG.AI_HOME_X, CONFIG.GROUND_Y);
  world.units.push(hiddenEnemy, aiUnit);

  updateAiMemory(world, 'ai');

  expect(Array.isArray(world.aiMemory.ai?.currentlyVisibleEnemies), 'AI memory must record an explicit current visible-enemy list.');
  expect(world.aiMemory.ai.currentlyVisibleEnemies.length === 0, 'An enemy outside the shared AI team vision must not be live knowledge.');
  expect(world.aiMemory.ai.composition?.warrior !== 1, 'A hidden enemy must not contribute through the former global live composition.');
}

console.log('PASS — AI live perception begins from explicit shared team visibility, not global enemy state.');

// Second vertical contract: a mobile unit is remembered as a frozen snapshot
// after it leaves vision, then stops contributing exactly when the configured
// per-difficulty memory duration has elapsed.
{
  const world = createWorld(202);
  const scout = createUnit('miner', 'ai', 1000, CONFIG.GROUND_Y);
  const enemy = createUnit('warrior', 'player', 1100, CONFIG.GROUND_Y);
  world.units.push(scout, enemy);

  updateAiMemory(world, 'ai', 6);
  expect(world.aiMemory.ai.currentlyVisibleEnemies.some((entry) => entry.id === enemy.id), 'A visible enemy must expose its current snapshot.');

  world.matchElapsedTime = 1;
  enemy.x = 3000;
  enemy.hp = 1;
  enemy.state = 'attacking';
  updateAiMemory(world, 'ai', 6);

  const remembered = world.aiMemory.ai.rememberedEnemyUnits?.find((entry) => entry.id === enemy.id);
  expect(remembered?.x === 1100 && remembered.hp === CONFIG.UNIT_STATS.warrior.hp && remembered.state === 'idle', 'A hidden unit must retain its last-seen snapshot, not hidden live movement, HP, or state.');
  expect(world.aiMemory.ai.composition?.warrior === 1, 'A valid remembered mobile unit must contribute to composition.');

  world.matchElapsedTime = 7.01;
  updateAiMemory(world, 'ai', 6);
  expect(!world.aiMemory.ai.rememberedEnemyUnits?.some((entry) => entry.id === enemy.id), 'A mobile memory must expire after the configured duration.');
  expect(world.aiMemory.ai.composition?.warrior !== 1, 'An expired mobile memory must stop contributing to composition.');
}

console.log('PASS — mobile AI memory freezes hidden observations and expires them deterministically.');

// Structures are persistent strategic observations, but their changing fields
// stay frozen when hidden. The base coordinate is known from match start.
{
  const world = createWorld(203);
  const scout = createUnit('miner', 'ai', 1000, CONFIG.GROUND_Y);
  const structure = createStructure('player', 1100, CONFIG.GROUND_Y);
  world.units.push(scout);
  world.structures.push(structure);

  updateAiMemory(world, 'ai', 6);
  expect(world.aiMemory.ai.rememberedEnemyStructures.some((entry) => entry.id === structure.id), 'A genuinely visible structure must become persistent memory.');
  expect(world.aiMemory.ai.knownEnemyBase.x === CONFIG.PLAYER_HOME_X, 'The enemy base location must be known from match start.');

  world.matchElapsedTime = 100;
  structure.x = 3000;
  structure.hp = 1;
  structure.state = 'destroyed';
  updateAiMemory(world, 'ai', 6);

  const rememberedStructure = world.aiMemory.ai.rememberedEnemyStructures.find((entry) => entry.id === structure.id);
  expect(rememberedStructure?.x === 1100 && rememberedStructure.hp === CONFIG.STRUCTURE_HP && rememberedStructure.state === 'standing', 'A hidden structure must retain its observed location/status rather than hidden authoritative changes.');
}

console.log('PASS — AI structure/base memory is persistent without hidden live-status leaks.');

// Re-entering shared vision replaces a stale unit snapshot with its new live
// observation, while a hidden near-home unit cannot create confirmed threat or
// power through an authoritative world scan.
{
  const world = createWorld(204);
  const scout = createUnit('warrior', 'ai', 4200, CONFIG.GROUND_Y);
  const enemy = createUnit('warrior', 'player', 4300, CONFIG.GROUND_Y);
  world.units.push(scout, enemy);
  updateAiMemory(world, 'ai', DIFFICULTIES.hard.memoryStaleness);

  world.matchElapsedTime = 1;
  enemy.x = 3000;
  updateAiMemory(world, 'ai', DIFFICULTIES.hard.memoryStaleness);
  world.matchElapsedTime = 2;
  enemy.x = 4300;
  enemy.hp = 1;
  updateAiMemory(world, 'ai', DIFFICULTIES.hard.memoryStaleness);
  const refreshed = world.aiMemory.ai.currentlyVisibleEnemies.find((entry) => entry.id === enemy.id);
  expect(refreshed?.x === 4300 && refreshed.hp === 1 && refreshed.lastSeenAt === 2, 'Re-entering vision must refresh the current live snapshot.');

  world.matchElapsedTime = 10;
  enemy.x = CONFIG.AI_HOME_X;
  world.statues.ai.state = 'destroyed';
  for (const structure of world.structures) if (structure.team === 'ai') structure.state = 'destroyed';
  updateAiMemory(world, 'ai', DIFFICULTIES.hard.memoryStaleness);
  const assessment = buildAiAssessment(world, 'ai', DIFFICULTIES.hard);
  expect(assessment.defense.enemyNearHome === false, 'A hidden enemy near home must not become a confirmed live threat.');
  expect(assessment.defense.estimatedEnemyPower === 0, 'Expired hidden enemy knowledge must not contribute authoritative enemy power.');
  expect(assessment.enemyMemory.currentlyVisibleEnemies.length === 0 && assessment.enemyMemory.rememberedEnemies.length === 0, 'Decision records must distinguish empty live knowledge from expired memory.');
}

// Each team receives only its own team-vision result; no spectator state is
// stored in world or read by AI perception.
{
  const world = createWorld(205);
  const playerScout = createUnit('warrior', 'player', 1000, CONFIG.GROUND_Y);
  const aiScout = createUnit('warrior', 'ai', 4000, CONFIG.GROUND_Y);
  const playerEnemy = createUnit('archer', 'player', 4100, CONFIG.GROUND_Y);
  const aiEnemy = createUnit('archer', 'ai', 1100, CONFIG.GROUND_Y);
  world.units.push(playerScout, aiScout, playerEnemy, aiEnemy);
  updateAiMemory(world, 'player', 6);
  updateAiMemory(world, 'ai', 6);
  expect(world.aiMemory.player.currentlyVisibleEnemies.map((entry) => entry.id).includes(aiEnemy.id), 'Left/player AI knowledge must include only its independently visible enemy.');
  expect(!world.aiMemory.player.currentlyVisibleEnemies.map((entry) => entry.id).includes(playerEnemy.id), 'Left/player AI knowledge must not contain friendly-side observations.');
  expect(world.aiMemory.ai.currentlyVisibleEnemies.map((entry) => entry.id).includes(playerEnemy.id), 'Right/AI knowledge must include only its independently visible enemy.');
  expect(!world.aiMemory.ai.currentlyVisibleEnemies.map((entry) => entry.id).includes(aiEnemy.id), 'Right/AI knowledge must not contain friendly-side observations.');
}

console.log('PASS — refresh, threat/power, and independent-team perception contracts hold.');
