// Server-side boundary for browser-supplied commander observations. The
// deterministic browser simulation remains the source of these observations,
// but only a fixed, bounded data shape is allowed into an LM Studio prompt.
import { sanitizeStrategyProfile } from '../strategy/watchLeague.js';

const COMMANDS = new Set(['attack', 'defend', 'retreat']);
const OBJECTIVES = new Set(['expand', 'pressure', 'fortify', 'recover']);
const PLAN_STATUSES = new Set(['active', 'executing', 'blocked-gold', 'blocked-cap']);
const PLAN_HORIZONS = new Set([30, 45, 60]);
const PURCHASE_KEYS = ['miner', 'warrior', 'archer', 'structure', 'turret', 'forgemaster', 'hawkeye', 'vanguard'];
const COMPOSITION_KEYS = ['miner', 'warrior', 'archer', 'turret', 'structures'];
const MAX_COUNT = 1_000;
const MAX_GOLD = 1_000_000_000;

function nonNegativeNumber(value, maximum = MAX_GOLD) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(maximum, value)) : 0;
}

function boundedCount(value) {
  return Number.isInteger(value) ? Math.max(0, Math.min(MAX_COUNT, value)) : 0;
}

function composition(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(COMPOSITION_KEYS.map((key) => [key, boundedCount(source[key])]));
}

function purchaseOptions(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(PURCHASE_KEYS.map((kind) => [kind, {
    cost: nonNegativeNumber(source[kind]?.cost),
  }]));
}

function activePlan(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const purchasesRemaining = [];
  if (Array.isArray(source.purchasesRemaining)) {
    for (const kind of source.purchasesRemaining) {
      if (PURCHASE_KEYS.includes(kind) && !purchasesRemaining.includes(kind)) purchasesRemaining.push(kind);
      if (purchasesRemaining.length === 4) break;
    }
  }
  if (!OBJECTIVES.has(source.objective) || !PLAN_HORIZONS.has(source.horizonSeconds) || !PLAN_STATUSES.has(source.status)) return null;
  return {
    objective: source.objective,
    horizonSeconds: source.horizonSeconds,
    status: source.status,
    purchasesRemaining,
  };
}

// `profile` comes from companion storage, never from the browser request. This
// makes the own-team-only strategy constraint enforceable at the provider edge.
export function buildBoundedCommanderContext(state, leagueTeam, profile) {
  const input = state && typeof state === 'object' && !Array.isArray(state) ? state : {};
  const ownProfile = sanitizeStrategyProfile(profile, leagueTeam);
  return {
    elapsedSeconds: Math.floor(nonNegativeNumber(input.elapsedSeconds)),
    gold: nonNegativeNumber(input.gold),
    enemyGold: nonNegativeNumber(input.enemyGold),
    population: boundedCount(input.population),
    command: COMMANDS.has(input.command) ? input.command : 'defend',
    purchaseOptions: purchaseOptions(input.purchaseOptions),
    activePlan: activePlan(input.activePlan),
    strategyProfile: ownProfile,
    friendly: composition(input.friendly),
    enemy: composition(input.enemy),
  };
}
