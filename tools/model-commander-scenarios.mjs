const REQUIRED_MILESTONES = [
  'miners',
  'accumulatedSpend',
  'combatUnits',
  'contestedTerritory',
  'combatEvent',
  'coreDamage',
  'completionOrTimeout',
];

function milestones() {
  return {
    miners: { metric: 'maximumLivingMiners', unit: 'count' },
    accumulatedSpend: { metric: 'totalSpend', unit: 'gold' },
    combatUnits: { metric: 'maximumLivingCombatUnits', unit: 'count' },
    contestedTerritory: { metric: 'enteredContestedZone', unit: 'boolean' },
    combatEvent: { metric: 'combatEvents', unit: 'count' },
    coreDamage: { metric: 'enemyCoreDamage', unit: 'damage' },
    completionOrTimeout: { metric: 'terminalStateOrTimeout', unit: 'state' },
  };
}

// These are baseline measurements, not scripted success conditions. A scenario
// may honestly report zero for a milestone; the evaluator records it so later
// commander changes can be compared against the same fixed conditions.
export const MODEL_COMMANDER_SCENARIOS = [
  { id: 'opening-economy', seed: 4101, durationSeconds: 180, focus: 'opening economy', milestones: milestones() },
  { id: 'first-contact', seed: 4102, durationSeconds: 360, focus: 'first opposing-army contact', milestones: milestones() },
  { id: 'pressure-opportunity', seed: 4103, durationSeconds: 540, focus: 'pressure through contested territory', milestones: milestones() },
  { id: 'recovery-after-losses', seed: 4104, durationSeconds: 720, focus: 'rebuild after combat losses', milestones: milestones() },
  { id: 'full-match-completion', seed: 4105, durationSeconds: 1800, focus: 'core damage and terminal match result', milestones: milestones() },
];

export function validateScenarioSet(scenarios) {
  const errors = [];
  const ids = new Set();
  for (const scenario of scenarios) {
    if (!scenario?.id || ids.has(scenario.id)) errors.push(`scenario id must be unique: ${scenario?.id ?? '(missing)'}`);
    ids.add(scenario?.id);
    if (!Number.isInteger(scenario?.seed) || scenario.seed <= 0) errors.push(`${scenario?.id ?? 'scenario'} needs a positive fixed seed`);
    if (!Number.isFinite(scenario?.durationSeconds) || scenario.durationSeconds <= 0) errors.push(`${scenario?.id ?? 'scenario'} needs a positive durationSeconds`);
    for (const key of REQUIRED_MILESTONES) {
      if (!scenario?.milestones?.[key]?.metric) errors.push(`${scenario?.id ?? 'scenario'} missing metric for ${key}`);
    }
  }
  return { valid: errors.length === 0, errors };
}
