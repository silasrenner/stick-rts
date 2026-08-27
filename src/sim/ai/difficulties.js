import { CONFIG } from '../../config.js';

// One shared behavior tree (behavior.js), three parameter sets — no
// per-difficulty code branches, only data. Starting-point numbers from S5,
// re-tuned in S8 for the production queue (see below); otherwise tunable
// like everything else.
//
// S8 re-tune: build cycles originally front-loaded *two* miners before any
// combat unit — free under S5-S7's instant purchases, but under S8's
// sequential production queue that alone serializes to a fixed 10s before
// the first warrior's own 10s build even starts (miners/warriors/archers
// can't build in parallel — one queue per team). Verified live (see
// PLAN.md): with the original two-miner front-load, Hard-vs-Hard still had
// zero combat units after 30+ seconds and every mirror/near-mirror pairing
// ran far slower or flatly stalemated. Trimmed to one miner before the
// first warrior — second miner now comes after it — cutting ~5s off
// every difficulty's time-to-first-combat-unit without giving up economy
// depth (still two miners per cycle, just reordered).
export const DIFFICULTIES = {
  easy: {
    decisionInterval: 3.5,
    buildCycle: ['miner', 'warrior', 'miner', 'warrior', 'archer'],
    useComposition: false,
    memoryStaleness: 0,
    retreatThreshold: 0, // never retreats — over-commits attacks
    minArmyToAttack: 1,
    heroPurchaseDelay: 150,
    heroKind: 'vanguard',
    defendMineThreshold: Infinity,
  },
  medium: {
    decisionInterval: 2.0,
    buildCycle: ['miner', 'warrior', 'miner', 'archer', 'warrior'],
    useComposition: true,
    memoryStaleness: 15,
    retreatThreshold: 0.7,
    minArmyToAttack: 2,
    heroPurchaseDelay: 60,
    heroKind: 'auto',
    defendMineThreshold: Infinity,
  },
  hard: {
    decisionInterval: 1.0,
    buildCycle: ['warrior', 'miner', 'miner', 'archer', 'warrior'],
    useComposition: true,
    memoryStaleness: 6,
    retreatThreshold: 0.85,
    // Launch and sustain are deliberately separate so normal combat losses do
    // not oscillate command posture around a single readiness boundary.
    // Build Army prepares a materially useful opening force. This remains the
    // single configurable launch point for the Build → Scout → Adapt → Mass
    // loop; scouting is helpful, never a launch prerequisite.
    attackLaunchCombatUnits: 24,
    // A committed force may reinforce through normal attrition before it
    // rebuilds, while the existing forward-frontline sustain exception remains.
    attackSustainCombatUnits: 12,
    // A committed attack below global sustain may continue only if its current
    // friendly frontline retains local power parity at this objective progress.
    // This does not affect launch, scouting, memory, or production feasibility.
    forwardSustainObjectiveProgress: 0.65,
    forwardSustainFrontlineCombatUnits: 2,
    // Miner utility declines continuously once friendly reserves can fund
    // several representative combat purchases; this is not a miner cap.
    economicNeed: {
      reserveCombatUnits: 3,
      softMinerCount: 8,
      minimumMinerFactor: 0.25,
    },
    // Raven is an occasional information action, not a strategic goal or a
    // normal-unit build-cycle entry. All fields consume only team-visible
    // current observations and bounded memory age.
    scouting: {
      staleTime: 60,
      stalenessWeight: 0.60,
      coverageWeight: 0.40,
      utilityScale: 2.50,
      // Build Army scouting is an optional information investment. The simple
      // triangular timing multiplier peaks mid-build, leaving baseline combat
      // preferred at very low progress and avoiding routine near-launch delay.
      buildArmyTiming: {
        peakProgress: 0.55,
        halfWidth: 0.35,
        minimumMultiplier: 0.20,
      },
      goalWeights: {
        recover: 0.20,
        buildArmy: 1.00,
        defend: 0.50,
        attack: 1.00,
      },
    },
    heroPurchaseDelay: 20,
    heroKind: 'auto',
    defendMineThreshold: 400,
    turretBuildTimes: [CONFIG.HARD_TURRET_FIRST_TIME, CONFIG.HARD_TURRET_SECOND_TIME, CONFIG.HARD_TURRET_THIRD_TIME],
    unitUtilityWeights: {
      recover: { recoveryProgress: 1.00, combatEfficiency: 0.75, counterValue: 0.25, buildCycleBias: 0.10, economicNeed: 1.00 },
      // Below minArmyToAttack, Build Army must convert friendly-state combat
      // deficit into an affordable force even without enemy composition.
      // Counter value still decides warrior versus archer; the cycle is only a
      // secondary tie-break once readiness is satisfied by a candidate.
      buildArmy: { recoveryProgress: 1.00, combatEfficiency: 0.75, counterValue: 1.00, buildCycleBias: 0.10, economicNeed: 1.00 },
      defend: { recoveryProgress: 0, combatEfficiency: 0, counterValue: 1.00, buildCycleBias: 0.25, economicNeed: 1.00 },
      // Maintain an actively committed standing force through the same utility
      // framework; counters still select its composition and cycle stays minor.
      attack: { recoveryProgress: 1.00, combatEfficiency: 0.75, counterValue: 1.00, buildCycleBias: 0.10, economicNeed: 1.00 },
    },
  },
};
