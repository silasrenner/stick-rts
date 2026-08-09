import { CONFIG } from '../config.js';
import { isAliveEntity } from '../sim/world.js';
import { livingTurrets, livingStructures } from '../sim/systems/supply.js';
import { setTeamCommand } from '../sim/systems/commands.js';
import { getCommanderTargetAnchor } from './actionContract.js';

function composition(world, team) {
  const result = { miner: 0, warrior: 0, archer: 0, turret: livingTurrets(world, team).length };
  for (const unit of world.units) if (unit.team === team && isAliveEntity(unit) && result[unit.kind] !== undefined) result[unit.kind] += 1;
  return result;
}

function purchaseOptions(world, team) {
  return {
    miner: { cost: CONFIG.UNIT_STATS.miner.cost },
    warrior: { cost: CONFIG.UNIT_STATS.warrior.cost },
    archer: { cost: CONFIG.UNIT_STATS.archer.cost },
    structure: { cost: CONFIG.STRUCTURE_COST },
    turret: { cost: CONFIG.TURRET_COST },
    forgemaster: { cost: CONFIG.BASE_HERO_COST },
    hawkeye: { cost: CONFIG.BASE_HERO_COST },
    vanguard: { cost: CONFIG.BASE_HERO_COST },
  };
}

export function buildCommanderState(world, team) {
  const enemy = team === 'player' ? 'ai' : 'player';
  return {
    elapsedSeconds: Math.floor(world.matchElapsedTime),
    goal: 'Destroy the enemy core while protecting your own core.',
    gold: world.teams[team].gold,
    purchaseOptions: purchaseOptions(world, team),
    activePlan: world.teams[team].commanderPlan ? {
      ...world.teams[team].commanderPlan,
      purchasesRemaining: [...(world.teams[team].commanderPriority ?? [])],
    } : null,
    enemyGold: world.teams[enemy].gold,
    population: world.units.filter((unit) => unit.team === team && isAliveEntity(unit)).length,
    command: world.teams[team].command,
    // Never include the opponent's profile: a local commander is given only
    // its team's reviewed (or explicitly pending) strategic context.
    strategyProfile: world.teams[team].strategyProfile ?? null,
    friendly: { ...composition(world, team), structures: livingStructures(world, team).length, coreHp: world.statues[team].hp },
    enemy: { ...composition(world, enemy), structures: livingStructures(world, enemy).length, coreHp: world.statues[enemy].hp },
  };
}

export function applyCommanderDecision(world, team, result) {
  const teamState = world.teams[team];
  if (!result?.ok) {
    // Telemetry is permitted, but rejection never changes a command, plan,
    // queue, or unit order. The last accepted intent remains authoritative.
    teamState.commanderEvent = {
      status: result?.reason ?? 'rejected-schema',
      detail: result?.detail ?? 'invalid commander result',
      at: world.matchElapsedTime,
      revision: teamState.commanderEvent?.revision ?? 0,
    };
    return { ok: false, reason: teamState.commanderEvent.status };
  }
  const decision = result.decision;
  const targetAnchor = getCommanderTargetAnchor(world, team, decision.targetIntent);
  if (!targetAnchor) {
    teamState.commanderEvent = { status: 'rejected-schema', detail: 'invalid target anchor', at: world.matchElapsedTime, revision: teamState.commanderEvent?.revision ?? 0 };
    return { ok: false, reason: 'rejected-schema' };
  }
  // Model intent crosses the same deterministic command boundary as AI and
  // player intent. Updating only teamState.command would leave existing units
  // on their prior orders (and would skip retreat target clearing), making a
  // valid Local Gemma command merely cosmetic until later production.
  setTeamCommand(world, team, decision.command);
  teamState.commanderTargetIntent = decision.targetIntent;
  teamState.commanderTargetAnchor = targetAnchor;
  teamState.commanderPriority = [...decision.purchasePriority];
  teamState.commanderPlan = {
    objective: decision.objective,
    targetIntent: decision.targetIntent,
    horizonSeconds: decision.horizonSeconds,
    startedAt: world.matchElapsedTime,
    status: 'active',
  };
  teamState.commanderEvent = { status: 'accepted', command: decision.command, objective: decision.objective, targetIntent: decision.targetIntent, anchorId: targetAnchor.id, at: world.matchElapsedTime, revision: (teamState.commanderEvent?.revision ?? 0) + 1 };
  return { ok: true };
}

// A plan is intentionally held for its declared horizon unless a prior
// deterministic legality check reports it blocked. This asks the model to
// revise its own strategy; it never substitutes a scripted purchase choice.
export function isCommanderReplanDue(world, team) {
  const plan = world.teams[team]?.commanderPlan;
  if (!plan) return true;
  if (String(plan.status).startsWith('blocked-')) return true;
  return world.matchElapsedTime >= plan.startedAt + plan.horizonSeconds;
}

// Companion requests are asynchronous while a player can leave, restart, or
// finish a Watch match. A decision is valid only for the exact active world
// and controller that generated its bounded observation; never let an old
// response steer a later deterministic match.
export function isCurrentCommanderRequest(currentWorld, requestedWorld, controller) {
  return currentWorld === requestedWorld
    && currentWorld?.matchState === 'playing'
    && currentWorld.modelCommander === controller;
}
