const UNIT_KINDS = ['miner', 'warrior', 'archer'];
const HERO_KINDS = ['forgemaster', 'hawkeye', 'vanguard'];

export function createPurchaseCandidate(action, kind = null) {
  return { action, kind };
}

export function createPurchaseCandidates() {
  return [
    ...UNIT_KINDS.map((kind) => createPurchaseCandidate('unit', kind)),
    createPurchaseCandidate('structure'),
    createPurchaseCandidate('turret'),
    ...HERO_KINDS.map((kind) => createPurchaseCandidate('hero', kind)),
  ];
}

export function findPurchaseCandidate(candidates, action, kind = null) {
  return candidates.find((candidate) => candidate.action === action && candidate.kind === kind) ?? null;
}
