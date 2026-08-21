import { CONFIG } from '../../config.js';
import { isAliveEntity } from '../world.js';
import { getUnitCount } from '../systems/economy.js';
import { getCap } from '../systems/supply.js';
import { buildInformationState } from './scouting.js';

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
    .reduce((sum, unit) => sum + getCombatPower(unit), 0);
}

function getCombatPower(unit) {
  const stats = CONFIG.UNIT_STATS[unit.kind] ?? CONFIG.HERO_STATS[unit.kind];
  const hp = unit.maxHp ?? stats?.hp ?? 0;
  const damage = unit.damage ?? stats?.damage ?? 0;
  return hp + damage * 5;
}

function isCombatUnit(unit) {
  return !unit.isMiner && !unit.isStructure && !unit.isStatue;
}

function getHomeX(team) {
  return team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
}

function getEnemyHomeX(team) {
  return team === 'player' ? CONFIG.AI_HOME_X : CONFIG.PLAYER_HOME_X;
}

function getObjectiveProgress(team, x) {
  const homeX = getHomeX(team);
  const enemyHomeX = getEnemyHomeX(team);
  const direction = Math.sign(enemyHomeX - homeX);
  return Math.max(0, Math.min(1, ((x - homeX) * direction) / Math.abs(enemyHomeX - homeX)));
}

// The frontline is a fixed-depth band ending at the forward-most living
// friendly combat unit, measured toward the enemy objective. Visible enemy
// combat is local only when it lies within the same horizontal band.
function buildFrontlineAssessment(world, team, visibleEnemies) {
  const combatUnits = world.units.filter((unit) => unit.team === team && isAliveEntity(unit) && isCombatUnit(unit));
  if (combatUnits.length === 0) {
    return {
      friendlyCombatCount: 0,
      friendlyPower: 0,
      visibleEnemyCombatCount: 0,
      visibleEnemyPower: 0,
      centerX: null,
      forwardMostFriendlyCombatX: null,
      objectiveDistanceRemaining: null,
      objectiveProgress: 0,
    };
  }

  const direction = team === 'player' ? 1 : -1;
  const forwardMostFriendlyCombatX = combatUnits
    .reduce((front, unit) => (unit.x * direction > front * direction ? unit.x : front), combatUnits[0].x);
  const frontlineFriendly = combatUnits.filter((unit) =>
    (forwardMostFriendlyCombatX - unit.x) * direction <= CONFIG.FRONTLINE_COMBAT_DEPTH,
  );
  const frontlineVisibleEnemies = visibleEnemies.filter((enemy) =>
    isCombatUnit(enemy) && Math.abs(enemy.x - forwardMostFriendlyCombatX) <= CONFIG.FRONTLINE_COMBAT_DEPTH,
  );
  const objectiveProgress = getObjectiveProgress(team, forwardMostFriendlyCombatX);
  return {
    friendlyCombatCount: frontlineFriendly.length,
    friendlyPower: frontlineFriendly.reduce((sum, unit) => sum + getCombatPower(unit), 0),
    visibleEnemyCombatCount: frontlineVisibleEnemies.length,
    visibleEnemyPower: frontlineVisibleEnemies.reduce((sum, enemy) => sum + getCombatPower(enemy), 0),
    centerX: forwardMostFriendlyCombatX,
    forwardMostFriendlyCombatX,
    objectiveDistanceRemaining: Math.abs(getEnemyHomeX(team) - forwardMostFriendlyCombatX),
    objectiveProgress,
  };
}

function getEstimatedEnemyPower(composition) {
  let power = 0;
  for (const [kind, count] of Object.entries(composition)) {
    const stats = CONFIG.UNIT_STATS[kind] ?? CONFIG.HERO_STATS[kind];
    if (stats) power += (stats.hp + stats.damage * 5) * count;
  }
  return power;
}

function isEnemyNearHome(team, visibleEnemies, threshold) {
  if (!Number.isFinite(threshold)) return false;
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  return visibleEnemies.some(
    (enemy) =>
      !enemy.isStructure
      && !enemy.isStatue
      && Math.abs(enemy.x - homeX) <= threshold,
  );
}

function copyObservation(enemy, now) {
  return {
    id: enemy.id,
    kind: enemy.kind,
    x: enemy.x,
    y: enemy.y,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    state: enemy.state,
    isHero: enemy.isHero,
    isStructure: enemy.isStructure,
    isTurret: enemy.isTurret,
    isStatue: enemy.isStatue,
    lastSeenAt: enemy.lastSeenAt,
    memoryAge: now - enemy.lastSeenAt,
  };
}

// Read-only snapshot for the decision layer. It deliberately contains no
// world references and does not decide, mutate, or execute an action.
export function buildAiAssessment(world, team, difficulty = null) {
  const state = world.teams[team];
  const memory = world.aiMemory[team] ?? {};
  const composition = copyComposition(memory.composition);
  const visibleEnemies = memory.currentlyVisibleEnemies ?? [];
  const rememberedEnemies = memory.rememberedEnemyUnits ?? [];
  const living = countLivingKinds(world, team);
  const combatUnits = getCombatUnitCount(living);
  const friendlyPower = getFriendlyPower(world, team);
  const frontline = buildFrontlineAssessment(world, team, visibleEnemies);
  const estimatedEnemyPower = getEstimatedEnemyPower(composition);
  const information = difficulty?.scouting
    ? buildInformationState(memory, world.matchElapsedTime, difficulty.scouting)
    : null;
  const enemyNearHome = difficulty ? isEnemyNearHome(team, visibleEnemies, difficulty.defendMineThreshold) : false;
  const underpowered = difficulty?.retreatThreshold > 0
    && estimatedEnemyPower > 0
    && friendlyPower < estimatedEnemyPower * difficulty.retreatThreshold;
  const attackLaunchCombatUnits = difficulty?.attackLaunchCombatUnits ?? null;
  const armyBuildProgress = attackLaunchCombatUnits && attackLaunchCombatUnits > 0
    ? Math.max(0, Math.min(1, combatUnits / attackLaunchCombatUnits))
    : 0;

  return {
    time: world.matchElapsedTime,
    team,
    gold: state.gold,
    command: state.command,
    recovering: state.recovering,
    living,
    combatUnits,
    attackLaunchCombatUnits,
    // Authoritative friendly combat only; this never depends on enemy vision
    // or memory and is reusable by Build Army utility and decision records.
    armyBuildProgress,
    frontline,
    objective: {
      forwardMostFriendlyCombatX: frontline.forwardMostFriendlyCombatX,
      distanceRemaining: frontline.objectiveDistanceRemaining,
      progress: frontline.objectiveProgress,
    },
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
      currentVisibleComposition: copyComposition(memory.currentlyVisibleComposition),
      rememberedComposition: copyComposition(memory.rememberedComposition),
      currentlyVisibleEnemies: visibleEnemies.map((enemy) => copyObservation(enemy, world.matchElapsedTime)),
      rememberedEnemies: rememberedEnemies.map((enemy) => copyObservation(enemy, world.matchElapsedTime)),
      rememberedStructures: (memory.rememberedEnemyStructures ?? []).map((enemy) => copyObservation(enemy, world.matchElapsedTime)),
      knownEnemyBase: memory.knownEnemyBase ? { ...memory.knownEnemyBase } : null,
      lastScoutedAt: memory.lastScoutedAt ?? null,
    },
    information,
    defense: {
      enemyNearHome,
      underpowered,
      friendlyPower,
      estimatedEnemyPower,
    },
  };
}
