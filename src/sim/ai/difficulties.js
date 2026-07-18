// One shared behavior tree (behavior.js), three parameter sets — no
// per-difficulty code branches, only data. Starting-point numbers,
// tunable in S6 like everything else.
//
// Build cycles front-load two miners before any archer purchase — early
// verification found that spending down to near-zero gold on a 250g
// archer before the economy was established left armies growing far too
// slowly to ever cross minArmyToAttack, stalling matches indefinitely.
export const DIFFICULTIES = {
  easy: {
    decisionInterval: 3.5,
    buildCycle: ['miner', 'miner', 'warrior', 'warrior', 'archer'],
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
    buildCycle: ['miner', 'miner', 'warrior', 'archer', 'warrior'],
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
    buildCycle: ['miner', 'miner', 'warrior', 'archer', 'warrior'],
    useComposition: true,
    memoryStaleness: 6,
    retreatThreshold: 0.85,
    minArmyToAttack: 2,
    heroPurchaseDelay: 20,
    heroKind: 'auto',
    defendMineThreshold: 400,
  },
};
