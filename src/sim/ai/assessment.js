import { CONFIG } from '../../config.js';
import { isAliveEntity } from '../world.js';
import { getUnitCount } from '../systems/economy.js';
import { getCap } from '../systems/supply.js';

function countLivingKinds(world, team) {
  const counts = { miner: 0, warrior: 0, archer: 0, hero: 0 };
  for (const unit of world.units) {
    if (unit.team !== team || !isAliveEntity(unit)) continue;
    if (unit.isHero) counts.hero += 1;
    else if (unit.kind in counts) counts[unit.kind] += 1;
  }
  return counts;
}

function copyComposition(composition = {}) {
  return Object.fromEntries(Object.entries(composition));
}

function getCombatUnitCount(living) {
  return living.warrior + living.archer + living.hero;
}

function getFriendlyPower(world, team) {
  return world.units
    .filter((unit) => unit.team === team && !unit.isMiner && isAliveEntity(unit))
    .reduce((sum, unit) => sum + unit.maxHp + unit.damage * 5, 0);
}

function getEstimatedEnemyPower(composition) {
  let power = 0;
  for (const [kind, count] of Object.entries(composition)) {
    const stats = CONFIG.UNIT_STATS[kind] ?? CONFIG.HERO_STATS[kind];
    if (stats) power += (stats.hp + stats.damage * 5) * count;
  }
  return power;
}

function isEnemyNearHome(world, team, threshold) {
  if (!Number.isFinite(threshold)) return false;
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const myUnits = world.units.filter((unit) => unit.team === team && isAliveEntity(unit));
  return world.units.some(
    (enemy) =>
      enemy.team !== team
      && isAliveEntity(enemy)
      && Math.abs(enemy.x - homeX) <= threshold
      && myUnits.some((unit) => Math.abs(unit.x - enemy.x) <= CONFIG.AI_SIGHT_RANGE),
  );
}

// Read-only snapshot for the decision layer. It deliberately contains no
// world references and does not decide, mutate, or execute an action.
export function buildAiAssessment(world, team, difficulty = null) {
  const state = world.teams[team];
  const memory = world.aiMemory[team];
  const composition = copyComposition(memory?.composition);
  const living = countLivingKinds(world, team);
  const combatUnits = getCombatUnitCount(living);
  const friendlyPower = getFriendlyPower(world, team);
  const estimatedEnemyPower = getEstimatedEnemyPower(composition);
  const enemyNearHome = difficulty ? isEnemyNearHome(world, team, difficulty.defendMineThreshold) : false;
  const underpowered = difficulty?.retreatThreshold > 0
    && estimatedEnemyPower > 0
    && friendlyPower < estimatedEnemyPower * difficulty.retreatThreshold;

  return {
    time: world.matchElapsedTime,
    team,
    gold: state.gold,
    command: state.command,
    recovering: state.recovering,
    living,
    combatUnits,
    queue: {
      total: state.productionQueue.length,
      items: state.productionQueue.map((item) => ({ action: item.action, kind: item.kind })),
    },
    population: {
      units: getUnitCount(world, team),
      cap: getCap(world, team),
    },
    enemyMemory: {
      composition,
      lastScoutedAt: memory?.lastScoutedAt ?? null,
    },
    defense: {
      enemyNearHome,
      underpowered,
      friendlyPower,
      estimatedEnemyPower,
    },
  };
}
