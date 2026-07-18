import { CONFIG } from '../../config.js';
import { isAliveEntity } from '../world.js';
import { buyUnit, buyStructure, buyHero, hasLivingHero } from '../systems/economy.js';
import { setTeamCommand } from '../systems/commands.js';
import { updateAiMemory, isMemoryFresh } from './vision.js';
import { DIFFICULTIES } from './difficulties.js';

// Ticks every team's decision timer; when it elapses, that team's
// behavior tree runs once. A team with no difficulty set (null) is
// human-controlled and is never touched here — this is the only branch
// point between "AI-driven" and "player-driven" in the whole module.
export function updateAiDecisions(world, dt) {
  for (const team of ['player', 'ai']) {
    const teamState = world.teams[team];
    const difficultyName = teamState.difficulty;
    if (!difficultyName) continue;

    teamState.decisionTimer -= dt;
    if (teamState.decisionTimer > 0) continue;

    const difficulty = DIFFICULTIES[difficultyName];
    teamState.decisionTimer = difficulty.decisionInterval;
    runDecision(world, team, difficulty);
  }
}

function runDecision(world, team, difficulty) {
  updateAiMemory(world, team);

  attemptPurchase(world, team, pickPurchase(world, team, difficulty));
  maybeManageHero(world, team, difficulty);
  setTeamCommand(world, team, pickCommand(world, team, difficulty));
}

// Counter-pick (if composition intel is fresh enough to trust) or the
// next item in the difficulty's fixed build cycle — same cycling logic
// for all three difficulties, only the array contents differ.
function pickPurchase(world, team, difficulty) {
  if (difficulty.useComposition && isMemoryFresh(world, team, difficulty.memoryStaleness)) {
    const counter = counterPick(world, team);
    if (counter) return counter;
  }

  const teamState = world.teams[team];
  const kind = difficulty.buildCycle[teamState.buildIndex % difficulty.buildCycle.length];
  teamState.buildIndex += 1;
  return kind;
}

function counterPick(world, team) {
  const composition = world.aiMemory[team]?.composition;
  if (!composition) return null;
  const warriors = composition.warrior ?? 0;
  const archers = composition.archer ?? 0;
  if (warriors > archers) return 'archer'; // counter melee with ranged
  if (archers > warriors) return 'warrior'; // counter ranged by closing the gap
  return null; // balanced or unknown — fall back to the build cycle
}

// Buys through the same economy.js functions the player's build menu
// uses — no AI-only purchase path. A cap block reactively buys a
// structure instead; a gold block just waits for the next decision tick.
function attemptPurchase(world, team, kind) {
  const result = buyUnit(world, team, kind);
  if (!result.ok && result.reason === 'cap') buyStructure(world, team);
}

function maybeManageHero(world, team, difficulty) {
  if (hasLivingHero(world, team)) return;
  const teamState = world.teams[team];
  if (teamState.heroCooldownTimer > 0) return;
  if (world.matchElapsedTime < difficulty.heroPurchaseDelay) return;

  const kind = difficulty.heroKind === 'auto' ? pickHeroCounter(world, team) : difficulty.heroKind;
  buyHero(world, team, kind);
}

function pickHeroCounter(world, team) {
  const composition = world.aiMemory[team]?.composition;
  if (!composition) return 'vanguard';
  const warriors = composition.warrior ?? 0;
  const archers = composition.archer ?? 0;
  if (archers > warriors) return 'vanguard'; // tanky melee to close in on archers
  if (warriors > archers) return 'hawkeye'; // snipe warriors from range
  return 'vanguard';
}

function pickCommand(world, team, difficulty) {
  if (isEnemyNearHome(world, team, difficulty.defendMineThreshold)) return 'defend';

  if (difficulty.retreatThreshold > 0) {
    const myPower = armyPower(world, team);
    const enemyPower = estimateEnemyPower(world, team);
    if (enemyPower > 0 && myPower < enemyPower * difficulty.retreatThreshold) return 'defend';
  }

  return countCombatUnits(world, team) >= difficulty.minArmyToAttack ? 'attack' : 'defend';
}

// Vision-gated, not omniscient: an enemy only counts as "near home" if
// some AI unit is also currently close enough to see it (mirrors
// updateAiMemory's visibility rule rather than a free map-wide check).
function isEnemyNearHome(world, team, threshold) {
  if (!Number.isFinite(threshold)) return false;
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const myUnits = world.units.filter((u) => u.team === team && isAliveEntity(u));

  return world.units.some(
    (enemy) =>
      enemy.team !== team &&
      isAliveEntity(enemy) &&
      Math.abs(enemy.x - homeX) <= threshold &&
      myUnits.some((mine) => Math.abs(mine.x - enemy.x) <= CONFIG.AI_SIGHT_RANGE)
  );
}

function countCombatUnits(world, team) {
  return world.units.filter((u) => u.team === team && !u.isMiner && isAliveEntity(u)).length;
}

function armyPower(world, team) {
  return world.units
    .filter((u) => u.team === team && !u.isMiner && isAliveEntity(u))
    .reduce((sum, u) => sum + u.maxHp + u.damage * 5, 0);
}

// Rough estimate from scouted composition counts (not live HP — the
// point is this is working off intel, not ground truth).
function estimateEnemyPower(world, team) {
  const composition = world.aiMemory[team]?.composition;
  if (!composition) return 0;

  let power = 0;
  for (const [kind, count] of Object.entries(composition)) {
    const stats = CONFIG.UNIT_STATS[kind] ?? CONFIG.HERO_STATS[kind];
    if (!stats) continue;
    power += (stats.hp + stats.damage * 5) * count;
  }
  return power;
}
