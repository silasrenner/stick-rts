import { MODEL_COMMANDER_SCENARIOS, validateScenarioSet } from './model-commander-scenarios.mjs';

const requiredIds = [
  'opening-economy',
  'first-contact',
  'pressure-opportunity',
  'recovery-after-losses',
  'full-match-completion',
];
const requiredMilestones = [
  'miners',
  'accumulatedSpend',
  'combatUnits',
  'contestedTerritory',
  'combatEvent',
  'coreDamage',
  'completionOrTimeout',
];

const result = validateScenarioSet(MODEL_COMMANDER_SCENARIOS);
if (!result.valid) throw new Error(`Scenario schema invalid: ${result.errors.join('; ')}`);

const ids = MODEL_COMMANDER_SCENARIOS.map((scenario) => scenario.id);
if (ids.join('|') !== requiredIds.join('|')) {
  throw new Error(`Expected fixed scenario set ${requiredIds.join(', ')}, received ${ids.join(', ')}`);
}

for (const scenario of MODEL_COMMANDER_SCENARIOS) {
  for (const milestone of requiredMilestones) {
    if (!(milestone in scenario.milestones)) {
      throw new Error(`${scenario.id} is missing baseline milestone ${milestone}`);
    }
  }
  if (!Number.isInteger(scenario.seed) || scenario.seed <= 0) {
    throw new Error(`${scenario.id} must use a positive fixed seed.`);
  }
}

console.log(`PASS — ${MODEL_COMMANDER_SCENARIOS.length} fixed commander baseline scenarios have measurable milestones.`);
