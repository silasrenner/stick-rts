import { CONFIG } from '../../config.js';
import { isAliveEntity } from '../world.js';
import { buyUnit, buyStructure, buyTurret, buyHero, getPurchaseFeasibility, hasLivingHero } from '../systems/economy.js';
import { setTeamCommand } from '../systems/commands.js';
import { updateAiMemory, isMemoryFresh } from './vision.js';
import { DIFFICULTIES } from './difficulties.js';
import { buildAiAssessment } from './assessment.js';
import { createPurchaseCandidate, createPurchaseCandidates } from './actions.js';
import { createDecisionRecord } from './decision-log.js';
import { selectStrategicGoal } from './goals.js';
import { selectFeasibleUnitPurchase } from './unit-utility.js';

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
  updateAiMemory(world, team, difficulty.globalVision === true);

  // Phase 1 observability is intentionally read-only until each existing
  // purchase/command step executes. It records the legacy decision path;
  // it does not rank candidates or choose a fallback.
  const assessment = buildAiAssessment(world, team, difficulty);
  const goal = selectStrategicGoal(assessment, difficulty);
  world.teams[team].strategicGoal = goal;

  // Turrets retain their existing scheduled side path and priority. Unit
  // feasibility is assessed after that attempt so utility never scores a
  // queue slot the turret just consumed.
  const turretAttempt = maybeBuyTurret(world, team, difficulty);
  const candidateStates = createPurchaseCandidates().map((candidate) => ({
    candidate,
    feasibility: getPurchaseFeasibility(world, team, candidate),
  }));
  const unitCandidateStates = candidateStates.filter(({ candidate }) => candidate.action === 'unit');
  const purchase = pickPurchase(world, team, difficulty, goal, unitCandidateStates);
  const recordedCandidates = candidateStates.map((candidateState) =>
    purchase.candidateStates?.find(({ candidate }) => candidate.kind === candidateState.candidate.kind)
    ?? candidateState,
  );

  const selection = attemptPurchase(world, team, purchase);
  applyBuildCycleProgression(world, team, selection);
  const heroAttempt = maybeManageHero(world, team, difficulty);
  const command = pickCommand(world, team, difficulty, assessment);
  setTeamCommand(world, team, command);

  world.teams[team].lastAiDecision = createDecisionRecord({
    assessment,
    goal,
    candidates: recordedCandidates,
    selection,
    turretAttempt,
    heroAttempt,
    command,
  });
}

// Phase 3 preserves the zero-miner emergency, but all other Hard unit
// purchases select among feasible candidates. The existing counter and cycle
// remain inputs, not hard overrides.
function pickPurchase(world, team, difficulty, goal, candidateStates) {
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
    candidateStates,
    counterKind,
    buildCycleKind,
  });

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
    candidateStates: utilityDecision.candidateStates,
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
    const allCapBlocked = purchase.candidateStates?.length > 0
      && purchase.candidateStates.every(({ feasibility }) => feasibility.reason === 'cap');
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
  const result = buyUnit(world, team, candidate.kind);
  let fallback = null;
  if (!result.ok && result.reason === 'cap') {
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

function maybeBuyTurret(world, team, difficulty) {
  const buildTimes = difficulty.turretBuildTimes;
  if (!buildTimes) return null;
  const turretIndex =
    world.structures.filter((entity) => entity.team === team && entity.isTurret && !entity.isStartingTurret).length +
    world.teams[team].productionQueue.filter((item) => item.action === 'turret').length;
  if (world.matchElapsedTime < buildTimes[turretIndex]) return null;

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
    if (combatUnits < difficulty.minArmyToAttack) return 'defend';
    teamState.recovering = false;
  }

  if (assessment.defense.enemyNearHome) return 'defend';
  if (assessment.defense.underpowered) return 'defend';

  return combatUnits >= difficulty.minArmyToAttack ? 'attack' : 'defend';
}

function getLivingMinerCount(world, team) {
  return world.units.filter((u) => u.team === team && u.isMiner && isAliveEntity(u)).length;
}
