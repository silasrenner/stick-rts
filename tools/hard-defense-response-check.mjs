import { CONFIG } from '../src/config.js';
import { updateAiDecisions } from '../src/sim/ai/behavior.js';
import { createUnit, createWorld } from '../src/sim/world.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function createDefendedWorld(team) {
  const enemy = team === 'ai' ? 'player' : 'ai';
  const sign = team === 'player' ? 1 : -1;
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const turretX = homeX + sign * CONFIG.TURRET_SLOT_OFFSETS[0];
  const defendX = turretX + sign * CONFIG.DEFEND_FIRST_BUILD_TURRET_FRONT_COLUMNS * CONFIG.FORMATION_SLOT_SPACING_X;
  const world = createWorld(913);
  world.matchState = 'playing';
  world.teams[team].difficulty = 'hard';
  world.teams[team].decisionTimer = 0;
  world.teams[team].gold = 0;
  world.units.push(createUnit('miner', team, homeX, CONFIG.GROUND_Y));
  const warrior = createUnit('warrior', team, defendX, CONFIG.GROUND_Y);
  world.units.push(warrior);
  // The Archer is currently visible and firing, but remains just beyond the
  // Warrior's ordinary acquisition range. It sits just inside the second-turret
  // defensive coverage so a bounded response can reach basic-attack range.
  const archer = createUnit('archer', enemy, defendX + sign * (CONFIG.UNIT_STATS.warrior.acquireRange + 10), CONFIG.GROUND_Y);
  world.units.push(archer);
  return { world, warrior, archer, sign, defendX };
}

for (const team of ['player', 'ai']) {
  const { world, warrior, archer, sign, defendX } = createDefendedWorld(team);
  updateAiDecisions(world, 1 / CONFIG.TICK_HZ);

  const assessment = world.teams[team].lastAiDecision?.observed;
  expect(assessment?.defense?.rangedPressure?.requiresDefensiveResponse === true,
    `${team}: visible Archer pressure beyond Warrior acquisition must be recorded as a defensive response.`);
  expect(warrior.defensiveEngagement?.targetId === archer.id,
    `${team}: defending Warrior must receive the current visible Archer as its bounded engagement target.`);
  expect(Number.isFinite(warrior.defensiveEngagement?.x), `${team}: bounded engagement point must be finite.`);
  expect(Math.abs(warrior.defensiveEngagement.x - defendX) <= CONFIG.TURRET_SLOT_OFFSETS[1] - CONFIG.TURRET_SLOT_OFFSETS[0],
    `${team}: engagement point must remain inside first-to-second-turret defensive coverage.`);

  // The point must carry the Warrior toward the Archer, rather than leaving it
  // parked at the formation slot while it is being ranged down.
  expect((warrior.defensiveEngagement.x - warrior.x) * sign > 0,
    `${team}: response must move outward toward the ranged attacker.`);
}

console.log('PASS — Hard Defend assigns a visible ranged attacker a bounded first-to-second-turret Warrior response on both sides.');
