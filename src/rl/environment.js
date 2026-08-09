import { CONFIG } from '../config.js';
import { createWorld, isAliveEntity } from '../sim/world.js';
import { runTick } from '../sim/tick.js';
import { setTeamCommand } from '../sim/systems/commands.js';
import { buyStructure, buyTurret, buyUnit, countQueued, getUnitCount } from '../sim/systems/economy.js';
import { getCap, livingStructures, livingTurrets } from '../sim/systems/supply.js';
import { calculateRlReward } from './rewards.js';

const COMMANDS = ['defend', 'attack', 'retreat'];
const PRODUCTIONS = ['none', 'miner', 'warrior', 'archer', 'structure', 'turret'];

export const RL_ACTIONS = Object.freeze(COMMANDS.flatMap((command) => PRODUCTIONS.map((production) => Object.freeze({ command, production }))));

export function getRlActionIndex(command, production) {
  return RL_ACTIONS.findIndex((action) => action.command === command && action.production === production);
}

function opponentOf(team) { return team === 'player' ? 'ai' : 'player'; }

function combatUnits(world, team) {
  return world.units.filter((unit) => unit.team === team && !unit.isMiner && isAliveEntity(unit)).length;
}

function livingUnitsOfKind(world, team, kind) {
  return world.units.filter((unit) => unit.team === team && unit.kind === kind && isAliveEntity(unit));
}

function commandFeatures(command) {
  return ['defend', 'attack', 'retreat'].map((candidate) => command === candidate ? 1 : 0);
}

function combatFrontProgress(world, team) {
  const combat = world.units.filter((unit) => unit.team === team && !unit.isMiner && isAliveEntity(unit));
  if (combat.length === 0) return 0;
  const homeX = team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
  const enemyHomeX = team === 'player' ? CONFIG.AI_HOME_X : CONFIG.PLAYER_HOME_X;
  const direction = team === 'player' ? 1 : -1;
  const meanX = combat.reduce((sum, unit) => sum + unit.x, 0) / combat.length;
  return Math.max(0, Math.min(1, ((meanX - homeX) * direction) / Math.abs(enemyHomeX - homeX)));
}

function isInCombatContact(world, team) {
  return world.units.some((unit) => unit.team === team && !unit.isMiner && isAliveEntity(unit) && unit.state === 'attacking');
}

function teamObservation(world, team) {
  const teamState = world.teams[team];
  const queueCount = (action) => teamState.productionQueue.filter((item) => item.action === action).length / 10;
  const turrets = world.structures.filter((structure) => structure.team === team && structure.isTurret && !structure.isStartingTurret && isAliveEntity(structure)).length;
  const structures = world.structures.filter((structure) => structure.team === team && !structure.isTurret && isAliveEntity(structure)).length;
  return [
    world.statues[team].hp / world.statues[team].maxHp,
    teamState.gold / 1000,
    livingUnitsOfKind(world, team, 'miner').length / 8,
    livingUnitsOfKind(world, team, 'warrior').length / 20,
    livingUnitsOfKind(world, team, 'archer').length / 20,
    turrets / Math.max(1, CONFIG.MAX_TURRETS - 1),
    structures / Math.max(1, CONFIG.MAX_STRUCTURES),
    queueCount('miner'), queueCount('warrior'), queueCount('archer'), queueCount('turret'), queueCount('structure'),
    ...commandFeatures(teamState.command),
    combatFrontProgress(world, team),
    isInCombatContact(world, team) ? 1 : 0,
  ];
}

export function getRlObservation(world, team) {
  const enemy = opponentOf(team);
  return [...teamObservation(world, team), ...teamObservation(world, enemy), world.matchElapsedTime / 300];
}

export function getRlActionMask(world, team) {
  return RL_ACTIONS.map((action) => productionLegal(world, team, action.production) ? 1 : 0);
}

function occupiedCap(world, team) {
  return getUnitCount(world, team) + countQueued(world, team, 'unit')
    + (livingTurrets(world, team).filter((turret) => !turret.isStartingTurret).length + countQueued(world, team, 'turret')) * CONFIG.TURRET_POPULATION_COST;
}

function productionLegal(world, team, production) {
  if (production === 'none') return true;
  const gold = world.teams[team].gold;
  if (production === 'structure') return gold >= CONFIG.STRUCTURE_COST && livingStructures(world, team).length + countQueued(world, team, 'structure') < CONFIG.MAX_STRUCTURES;
  if (production === 'turret') return gold >= CONFIG.TURRET_COST
    && livingTurrets(world, team).length + countQueued(world, team, 'turret') < CONFIG.MAX_TURRETS
    && occupiedCap(world, team) + CONFIG.TURRET_POPULATION_COST <= getCap(world, team);
  return gold >= CONFIG.UNIT_STATS[production].cost && occupiedCap(world, team) + 1 <= getCap(world, team);
}

function executeProduction(world, team, production) {
  if (production === 'none') return { ok: true, reason: 'no-production' };
  if (production === 'structure') return buyStructure(world, team);
  if (production === 'turret') return buyTurret(world, team);
  return buyUnit(world, team, production);
}

function executeAction(world, team, action) {
  if (!productionLegal(world, team, action.production)) return { ok: false, reason: 'blocked-legality', command: action.command, production: action.production };
  setTeamCommand(world, team, action.command);
  const productionResult = executeProduction(world, team, action.production);
  if (!productionResult.ok) return { ok: false, reason: `blocked-${productionResult.reason}`, command: action.command, production: action.production };
  return { ok: true, command: action.command, production: action.production };
}


// Two policies act before the world advances. Neither side receives a scripted
// opponent or a privileged execution path; this is the trainable self-play
// boundary used by the Python sidecar.
export function createSelfPlayEnvironment({ decisionSeconds = 1, maxEpisodeSeconds = 300 } = {}) {
  const ticksPerDecision = Math.max(1, Math.round(decisionSeconds * CONFIG.TICK_HZ));
  let world = null;

  function mask(team) {
    return RL_ACTIONS.map((action) => productionLegal(world, team, action.production) ? 1 : 0);
  }

  function terminalFor(team) {
    if (world.matchState === 'playing') return null;
    return team === 'player' ? (world.matchState === 'won' ? 'win' : 'loss') : (world.matchState === 'lost' ? 'win' : 'loss');
  }

  function resultFor(team, actionResult, beforeOwnCore, beforeEnemyCore, beforeOwnCombat, beforeEnemyCombat) {
    const enemy = opponentOf(team);
    const enemyCoreDamage = beforeEnemyCore - world.statues[enemy].hp;
    const ownCoreDamage = beforeOwnCore - world.statues[team].hp;
    const enemyCombatLoss = Math.max(0, beforeEnemyCombat - combatUnits(world, enemy));
    const ownCombatLoss = Math.max(0, beforeOwnCombat - combatUnits(world, team));
    const terminated = world.matchState !== 'playing';
    const truncated = !terminated && world.matchElapsedTime >= maxEpisodeSeconds;
    const feedback = calculateRlReward({ enemyCoreDamage, ownCoreDamage, enemyCombatLoss, ownCombatLoss, terminal: terminalFor(team) });
    return {
      observation: getRlObservation(world, team),
      actionMask: mask(team),
      reward: feedback.total,
      rewardComponents: { enemyCoreDamage, ownCoreDamage, enemyCombatLoss, ownCombatLoss, ...feedback.components },
      terminated,
      truncated,
      terminalReason: terminated ? world.matchState : truncated ? 'time-limit' : null,
      actionResult,
    };
  }

  return {
    get world() { return world; },
    reset(seed) {
      world = createWorld(seed);
      world.matchState = 'playing';
      world.teams.player.difficulty = null;
      world.teams.ai.difficulty = null;
      return {
        observation: { player: getRlObservation(world, 'player'), ai: getRlObservation(world, 'ai') },
        actionMask: { player: mask('player'), ai: mask('ai') },
        seed,
      };
    },
    step(actions) {
      if (!world) throw new Error('Call reset(seed) before step(actions).');
      const before = {
        player: { own: world.statues.player.hp, enemy: world.statues.ai.hp, ownCombat: combatUnits(world, 'player'), enemyCombat: combatUnits(world, 'ai') },
        ai: { own: world.statues.ai.hp, enemy: world.statues.player.hp, ownCombat: combatUnits(world, 'ai'), enemyCombat: combatUnits(world, 'player') },
      };
      const actionResult = {};
      for (const team of ['player', 'ai']) {
        const action = RL_ACTIONS[actions?.[team]];
        actionResult[team] = action ? executeAction(world, team, action) : { ok: false, reason: 'invalid-action-index' };
      }
      if (Object.values(actionResult).some((result) => result.ok)) {
        for (let tick = 0; tick < ticksPerDecision && world.matchState === 'playing'; tick += 1) runTick(world, 1 / CONFIG.TICK_HZ);
      }
      const player = resultFor('player', actionResult.player, before.player.own, before.player.enemy, before.player.ownCombat, before.player.enemyCombat);
      const ai = resultFor('ai', actionResult.ai, before.ai.own, before.ai.enemy, before.ai.ownCombat, before.ai.enemyCombat);
      return {
        observation: { player: player.observation, ai: ai.observation },
        actionMask: { player: player.actionMask, ai: ai.actionMask },
        reward: { player: player.reward, ai: ai.reward },
        rewardComponents: { player: player.rewardComponents, ai: ai.rewardComponents },
        terminated: player.terminated,
        truncated: player.truncated,
        terminalReason: player.terminalReason,
        actionResult,
      };
    },
  };
}

export function createRlEnvironment({ team = 'player', ownDifficulty = null, opponentDifficulty = null, onScriptedDecision = null, decisionSeconds = 1, maxEpisodeSeconds = 300 } = {}) {
  const ticksPerDecision = Math.max(1, Math.round(decisionSeconds * CONFIG.TICK_HZ));
  let world = null;
  let elapsedDecisions = 0;

  function actionMask() {
    return RL_ACTIONS.map((action) => productionLegal(world, team, action.production) ? 1 : 0);
  }

  function transition(actionResult, previousOwnCore, previousEnemyCore) {
    const enemy = opponentOf(team);
    const enemyDamage = previousEnemyCore - world.statues[enemy].hp;
    const ownDamage = previousOwnCore - world.statues[team].hp;
    const terminated = world.matchState !== 'playing';
    const truncated = !terminated && world.matchElapsedTime >= maxEpisodeSeconds;
    const terminalReason = terminated ? world.matchState : truncated ? 'time-limit' : null;
    const terminal = !terminated ? null : (team === 'player' ? (world.matchState === 'won' ? 'win' : 'loss') : (world.matchState === 'lost' ? 'win' : 'loss'));
    const feedback = calculateRlReward({ enemyCoreDamage: enemyDamage, ownCoreDamage: ownDamage, terminal });
    return {
      observation: getRlObservation(world, team),
      actionMask: actionMask(),
      reward: feedback.total,
      rewardComponents: { enemyCoreDamage: enemyDamage, ownCoreDamage: ownDamage, ...feedback.components },
      terminated,
      truncated,
      terminalReason,
      actionResult,
    };
  }

  return {
    get world() { return world; },
    reset(seed) {
      world = createWorld(seed);
      world.matchState = 'playing';
      world.teams.player.difficulty = null;
      world.teams.ai.difficulty = null;
      world.teams[team].difficulty = ownDifficulty;
      world.teams[opponentOf(team)].difficulty = opponentDifficulty;
      world.scriptedDecisionObserver = onScriptedDecision;
      elapsedDecisions = 0;
      return { observation: getRlObservation(world, team), actionMask: actionMask(), seed };
    },
    step(actionIndex) {
      if (!world) throw new Error('Call reset(seed) before step(actionIndex).');
      const previousOwnCore = world.statues[team].hp;
      const previousEnemyCore = world.statues[opponentOf(team)].hp;
      const action = RL_ACTIONS[actionIndex];
      if (!action) return transition({ ok: false, reason: 'invalid-action-index' }, previousOwnCore, previousEnemyCore);
      const actionResult = executeAction(world, team, action);
      if (actionResult.ok) {
        for (let tick = 0; tick < ticksPerDecision && world.matchState === 'playing'; tick += 1) runTick(world, 1 / CONFIG.TICK_HZ);
        elapsedDecisions += 1;
      }
      return transition(actionResult, previousOwnCore, previousEnemyCore);
    },
    get elapsedDecisions() { return elapsedDecisions; },
  };
}

// Training-only named baseline. The learner retains the same bounded action
// interface; only the opposing team runs the existing deterministic Hard AI.
export function createScriptedOpponentEnvironment(options = {}) {
  return createRlEnvironment({ ...options, opponentDifficulty: options.opponentDifficulty ?? 'hard' });
}
