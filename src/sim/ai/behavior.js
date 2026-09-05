import { CONFIG } from '../../config.js';
import { isAliveEntity } from '../world.js';
import { buyUnit, buyStructure, buyTurret, buyHero, buyRaven, getPurchaseFeasibility, hasLivingHero } from '../systems/economy.js';
import { setTeamCommand } from '../systems/commands.js';
import { updateAiMemory, isMemoryFresh } from './vision.js';
import { DIFFICULTIES } from './difficulties.js';
import { buildAiAssessment } from './assessment.js';
import { createPurchaseCandidate, createPurchaseCandidates } from './actions.js';
import { createDecisionRecord } from './decision-log.js';
import { selectStrategicGoal } from './goals.js';
import { selectFeasibleUnitPurchase, getCheapestFeasibleCombatCost } from './unit-utility.js';
import { getRavenUtility } from './scouting.js';
import { getAttackSustainReason, shouldSustainAttack } from './attack-sustain.js';

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
    // Seed-derived jitter (S9): the only variation point in the sim's
    // otherwise fully deterministic decision loop — small enough to need
    // no dedicated balance pass, but enough that Watch AI shows a
    // genuinely different match per seed instead of an identical replay.
    const jitter = teamState.rng.nextRange(-CONFIG.AI_DECISION_JITTER, CONFIG.AI_DECISION_JITTER);
    teamState.decisionTimer = difficulty.decisionInterval * (1 + jitter);
    runDecision(world, team, difficulty);
  }
}

function runDecision(world, team, difficulty) {
  updateAiMemory(world, team, difficulty.memoryStaleness);

  // Phase 1 observability is intentionally read-only until each existing
  // purchase/command step executes. It records the legacy decision path;
  // it does not rank candidates or choose a fallback.
  const assessment = buildAiAssessment(world, team, difficulty);
  const goal = selectStrategicGoal(assessment, difficulty);
  world.teams[team].strategicGoal = goal;

  // Turrets retain their existing scheduled side path and priority. Unit
  // feasibility is assessed after that attempt so utility never scores a
  // queue slot the turret just consumed.
  const turretAttempt = maybeBuyTurret(world, team, difficulty, assessment);
  const candidateStates = createPurchaseCandidates().map((candidate) => ({
    candidate,
    feasibility: getPurchaseFeasibility(world, team, candidate),
  }));
  const purchase = pickPurchase(world, team, difficulty, goal, assessment, candidateStates);
  const recordedCandidates = candidateStates.map((candidateState) =>
    purchase.candidateStates?.find(({ candidate }) =>
      candidate.action === candidateState.candidate.action && candidate.kind === candidateState.candidate.kind,
    )
    ?? candidateState,
  );

  const selection = attemptPurchase(world, team, purchase);
  applyBuildCycleProgression(world, team, selection);
  const heroAttempt = CONFIG.HEROES_ENABLED ? maybeManageHero(world, team, difficulty) : null;
  const command = pickCommand(world, team, difficulty, assessment);
  setTeamCommand(world, team, command);
  applyHardDefensiveEngagement(world, team, difficulty, command, assessment);

  world.teams[team].lastAiDecision = createDecisionRecord({
    assessment,
    goal,
    candidates: recordedCandidates,
    selection,
    turretAttempt,
    heroAttempt,
    command,
    attackCommitment: describeAttackCommitment(assessment, difficulty, command),
  });
}

function applyHardDefensiveEngagement(world, team, difficulty, command, assessment) {
  const pressure = difficulty === DIFFICULTIES.hard && command === 'defend'
    ? assessment.defense.rangedPressure
    : null;
  for (const unit of world.units) {
    if (unit.team !== team || unit.kind !== 'warrior') continue;
    unit.defensiveEngagement = pressure?.requiresDefensiveResponse
      ? { targetId: pressure.target.id, x: pressure.engagementX }
      : null;
  }
}

function describeAttackCommitment(assessment, difficulty, command) {
  const wasAttacking = assessment.command === 'attack';
  const isAttacking = command === 'attack';
  const sustainReason = wasAttacking ? getAttackSustainReason(assessment, difficulty) : null;
  let state = 'not-attacking';
  if (!wasAttacking && isAttacking) state = 'launched';
  else if (wasAttacking && isAttacking) state = 'sustained';
  else if (wasAttacking && !isAttacking) state = 'abandoned';
  return {
    state,
    combatUnits: assessment.combatUnits,
    attackLaunchCombatUnits: difficulty.attackLaunchCombatUnits,
    attackSustainCombatUnits: difficulty.attackSustainCombatUnits,
    forwardSustainObjectiveProgress: difficulty.forwardSustainObjectiveProgress ?? null,
    forwardSustainFrontlineCombatUnits: difficulty.forwardSustainFrontlineCombatUnits ?? null,
    sustainReason,
  };
}

// Phase 3 preserves the zero-miner emergency, but all other Hard unit
// purchases select among feasible candidates. The existing counter and cycle
// remain inputs, not hard overrides.
function pickPurchase(world, team, difficulty, goal, assessment, candidateStates) {
  const unitCandidateStates = candidateStates.filter(({ candidate }) => candidate.action === 'unit');
  const ravenCandidateState = candidateStates.find(({ candidate }) => candidate.action === 'raven') ?? null;
  if (getLivingMinerCount(world, team) === 0) {
    return {
      source: 'no-miner',
      candidate: createPurchaseCandidate('unit', 'miner'),
      feasibility: candidateStates.find(({ candidate }) => candidate.kind === 'miner')?.feasibility ?? null,
      utility: null,
      tieBreak: null,
      candidateStates: null,
    };
  }

  const teamState = world.teams[team];
  const buildIndexBefore = teamState.buildIndex;
  const counterKind = getCounterPick(world, team, difficulty);
  const buildCycleKind = difficulty.buildCycle[buildIndexBefore % difficulty.buildCycle.length];

  // Easy and Medium retain their legacy purchase policy until separately
  // migrated. Hard is the bounded Phase 3 utility proof.
  if (!difficulty.unitUtilityWeights) {
    const kind = counterKind ?? buildCycleKind;
    if (!counterKind) teamState.buildIndex += 1;
    const candidate = createPurchaseCandidate('unit', kind);
    return {
      source: counterKind ? 'counter-pick' : 'build-cycle',
      candidate,
      feasibility: candidateStates.find(({ candidate: stateCandidate }) => stateCandidate.kind === kind)?.feasibility ?? null,
      utility: null,
      tieBreak: null,
      candidateStates: null,
    };
  }

  const utilityDecision = selectFeasibleUnitPurchase({
    goal,
    difficulty: world.teams[team].difficulty,
    assessment,
    candidateStates: unitCandidateStates,
    counterKind,
    buildCycleKind,
  });

  // Raven remains a separate temporary action. It is scored only after the
  // unchanged normal-unit selector has chosen its best legal competitor; ties
  // deliberately keep that normal purchase. Zero-miner/turret special paths
  // above cannot be preempted by information spending.
  const cheapestCombatCost = getCheapestFeasibleCombatCost(unitCandidateStates);
  const ravenUtility = ravenCandidateState?.feasibility.feasible && difficulty.scouting
    ? getRavenUtility({ assessment, goal, difficulty, cheapestCombatCost })
    : null;
  const normalUtility = utilityDecision.selected?.utility?.weightedTotal ?? -Infinity;
  const ravenSelected = ravenUtility !== null
    && ravenUtility.intervalEligible
    && ravenUtility.weightedTotal > normalUtility + difficulty.scouting.investmentMargin;
  const scoredRaven = ravenCandidateState ? {
    ...ravenCandidateState,
    utility: ravenUtility ? { ...ravenUtility, selected: ravenSelected } : null,
  } : null;
  const mergedCandidateStates = [
    ...utilityDecision.candidateStates,
    ...(scoredRaven ? [scoredRaven] : []),
  ];

  if (ravenSelected) {
    return {
      source: 'raven-utility',
      candidate: scoredRaven.candidate,
      feasibility: scoredRaven.feasibility,
      utility: scoredRaven.utility,
      tieBreak: { method: 'highest-utility', contenders: ['raven'] },
      counterKind,
      buildIndexBefore,
      buildCycleKind,
      candidateStates: mergedCandidateStates,
    };
  }

  // Phase 3 build-cycle progression is applied only after a successful normal
  // unit commitment. Counter presence remains a scoring input, not a reason to
  // consume or freeze production preference on an uncommitted decision.
  return {
    source: 'unit-utility',
    candidate: utilityDecision.selected?.candidate ?? null,
    feasibility: utilityDecision.selected?.feasibility ?? null,
    utility: utilityDecision.selected?.utility ?? null,
    tieBreak: utilityDecision.tieBreak,
    counterKind,
    buildIndexBefore,
    buildCycleKind,
    candidateStates: mergedCandidateStates,
  };
}

function getCounterPick(world, team, difficulty) {
  if (!difficulty.useComposition || !isMemoryFresh(world, team, difficulty.memoryStaleness)) return null;
  return counterPick(world, team);
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

// Executes only through the normal economy APIs. If utility excluded every
// unit because each is cap-blocked, retain the existing deterministic
// population-expansion response outside unit scoring.
function attemptPurchase(world, team, purchase) {
  if (!purchase.candidate) {
    const allCapBlocked = purchase.candidateStates?.some(({ candidate }) => candidate.action === 'unit')
      && purchase.candidateStates
        .filter(({ candidate }) => candidate.action === 'unit')
        .every(({ feasibility }) => feasibility.reason === 'cap');
    const fallbackCandidate = allCapBlocked ? createPurchaseCandidate('structure') : null;
    const fallbackFeasibility = fallbackCandidate ? getPurchaseFeasibility(world, team, fallbackCandidate) : null;
    const fallback = fallbackCandidate ? {
      candidate: fallbackCandidate,
      feasibility: fallbackFeasibility,
      result: buyStructure(world, team),
    } : null;
    return {
      source: purchase.source,
      candidate: null,
      feasibility: null,
      utility: null,
      tieBreak: purchase.tieBreak,
      counterKind: purchase.counterKind ?? null,
      buildIndexBefore: purchase.buildIndexBefore ?? null,
      buildCycleKind: purchase.buildCycleKind ?? null,
      result: null,
      fallback,
    };
  }

  const candidate = purchase.candidate;
  const feasibility = purchase.feasibility ?? getPurchaseFeasibility(world, team, candidate);
  const result = candidate.action === 'raven'
    ? buyRaven(world, team)
    : buyUnit(world, team, candidate.kind);
  let fallback = null;
  if (candidate.action === 'unit' && !result.ok && result.reason === 'cap') {
    const fallbackCandidate = createPurchaseCandidate('structure');
    const fallbackFeasibility = getPurchaseFeasibility(world, team, fallbackCandidate);
    fallback = {
      candidate: fallbackCandidate,
      feasibility: fallbackFeasibility,
      result: buyStructure(world, team),
    };
  }
  return {
    source: purchase.source,
    candidate,
    feasibility,
    utility: purchase.utility,
    tieBreak: purchase.tieBreak,
    counterKind: purchase.counterKind ?? null,
    buildIndexBefore: purchase.buildIndexBefore ?? null,
    buildCycleKind: purchase.buildCycleKind ?? null,
    result,
    fallback,
  };
}

export function applyBuildCycleProgression(world, team, selection) {
  if (selection.source !== 'unit-utility') return;

  const teamState = world.teams[team];
  const committedNormalUnit = selection.candidate?.action === 'unit' && selection.result?.ok === true;
  const didBuildIndexAdvance = committedNormalUnit;
  if (didBuildIndexAdvance) teamState.buildIndex += 1;

  selection.didBuildIndexAdvance = didBuildIndexAdvance;
  selection.buildIndexAfter = teamState.buildIndex;
  selection.buildIndexReason = didBuildIndexAdvance
    ? 'successful-normal-unit-commit'
    : 'no-normal-unit-commit';
}

function maybeBuyTurret(world, team, difficulty, assessment) {
  if (!difficulty.turretBuildTimes) return null;
  const plan = world.teams[team].turretExpansionPlan;
  if (!plan) return null;
  const turretIndex =
    world.structures.filter((entity) => entity.team === team && entity.isTurret && !entity.isStartingTurret).length +
    world.teams[team].productionQueue.filter((item) => item.action === 'turret').length;
  if (turretIndex >= plan.targetCount) return { candidate: createPurchaseCandidate('turret'), feasibility: null, result: { ok: false, reason: 'planComplete' }, deferred: 'plan-complete' };
  if (world.matchElapsedTime < plan.eligibleAt[turretIndex]) return null;
  if (assessment.combatUnits < CONFIG.HARD_TURRET_COMBAT_RESERVE) return { candidate: createPurchaseCandidate('turret'), feasibility: null, result: { ok: false, reason: 'combatReserve' }, deferred: 'combat-reserve' };
  const candidate = createPurchaseCandidate('turret');
  const feasibility = getPurchaseFeasibility(world, team, candidate);
  return { candidate, feasibility, result: buyTurret(world, team) };
}

function maybeManageHero(world, team, difficulty) {
  if (hasLivingHero(world, team)) return null;
  const teamState = world.teams[team];
  if (teamState.heroCooldownTimer > 0) return null;
  if (world.matchElapsedTime < difficulty.heroPurchaseDelay) return null;

  const kind = difficulty.heroKind === 'auto' ? pickHeroCounter(world, team) : difficulty.heroKind;
  const candidate = createPurchaseCandidate('hero', kind);
  const feasibility = getPurchaseFeasibility(world, team, candidate);
  return { candidate, feasibility, result: buyHero(world, team, kind) };
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

function pickCommand(world, team, difficulty, assessment) {
  const teamState = world.teams[team];
  const combatUnits = assessment.combatUnits;

  // A team that had committed to attack and loses its entire combat force
  // must rebuild under Defend. It cannot resume attacking until the same
  // meaningful-army threshold is restored.
  if (teamState.command === 'attack' && combatUnits === 0) teamState.recovering = true;
  if (teamState.recovering) {
    if (combatUnits < difficulty.attackLaunchCombatUnits) return 'defend';
    teamState.recovering = false;
  }

  if (assessment.defense.enemyNearHome) return 'defend';
  if (teamState.command === 'attack' && shouldSustainAttack(assessment, difficulty)) return 'attack';
  if (assessment.defense.underpowered) return 'defend';

  return combatUnits >= difficulty.attackLaunchCombatUnits ? 'attack' : 'defend';
}

function getLivingMinerCount(world, team) {
  return world.units.filter((u) => u.team === team && u.isMiner && isAliveEntity(u)).length;
}
