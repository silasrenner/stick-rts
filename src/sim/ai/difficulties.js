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
    minArmyToAttack: 2,
    heroPurchaseDelay: 20,
    heroKind: 'auto',
    defendMineThreshold: 400,
    globalVision: true,
  },
};
