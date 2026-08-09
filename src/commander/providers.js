const VALID_COMMANDS = new Set(['attack', 'defend', 'retreat']);
const VALID_OBJECTIVES = new Set(['expand', 'pressure', 'fortify', 'recover']);
const VALID_PLAN_HORIZONS = new Set([30, 45, 60]);
const VALID_PURCHASES = new Set(['miner', 'warrior', 'archer', 'structure', 'turret', 'forgemaster', 'hawkeye', 'vanguard']);
import { COMMANDER_TARGET_INTENTS, validateCommanderTargetIntent } from './actionContract.js';
// The local model is outside the deterministic simulation and can return an
// arbitrarily large HTTP response if it is misconfigured. Bound that response
// before JSON parsing just as the companion bounds browser request bodies.
export const MAX_LM_STUDIO_RESPONSE_BYTES = 16_384;
// A local model may need to load/warm after LM Studio starts. Thirty seconds
// remains a bounded request while avoiding a false unavailable state during a
// normal cold start on the first Watch decision.
export const DEFAULT_LM_STUDIO_TIMEOUT_MILLISECONDS = 30_000;
// Gemma exposes a reasoning mode that can consume an entire short response
// budget before producing a decision. Request structured JSON with reasoning
// disabled, retaining a small bounded output budget for timely Watch turns.
export const COMMANDER_MAX_RESPONSE_TOKENS = 120;
const COMMANDER_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['command', 'objective', 'targetIntent', 'horizonSeconds', 'purchasePriority'],
  properties: {
    command: { type: 'string', enum: [...VALID_COMMANDS] },
    objective: { type: 'string', enum: [...VALID_OBJECTIVES] },
    targetIntent: { type: 'string', enum: COMMANDER_TARGET_INTENTS },
    horizonSeconds: { type: 'integer', enum: [...VALID_PLAN_HORIZONS] },
    purchasePriority: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: { type: 'string', enum: [...VALID_PURCHASES] },
    },
  },
};

// Validate rather than repair untrusted model output. A default command would
// be a deterministic strategic fallback, which model-controlled matches must
// never invent after malformed output.
export function normalizeCommanderDecision(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  if (!input) return { ok: false, reason: 'rejected-schema', detail: 'decision must be an object' };
  for (const field of ['command', 'objective', 'targetIntent', 'horizonSeconds', 'purchasePriority']) {
    if (!(field in input)) return { ok: false, reason: 'rejected-schema', detail: `missing ${field}` };
  }
  if (!VALID_COMMANDS.has(input.command)) return { ok: false, reason: 'rejected-schema', detail: 'invalid command' };
  if (!VALID_OBJECTIVES.has(input.objective)) return { ok: false, reason: 'rejected-schema', detail: 'invalid objective' };
  const targetValidation = validateCommanderTargetIntent(input.targetIntent, input.command);
  if (!targetValidation.ok) return targetValidation;
  if (!VALID_PLAN_HORIZONS.has(input.horizonSeconds)) return { ok: false, reason: 'rejected-schema', detail: 'invalid horizonSeconds' };
  if (!Array.isArray(input.purchasePriority) || input.purchasePriority.length < 1 || input.purchasePriority.length > 4
    || input.purchasePriority.some((item) => !VALID_PURCHASES.has(item))) {
    return { ok: false, reason: 'rejected-schema', detail: 'invalid purchasePriority' };
  }
  return {
    ok: true,
    decision: {
      command: input.command,
      objective: input.objective,
      targetIntent: input.targetIntent,
      horizonSeconds: input.horizonSeconds,
      purchasePriority: [...input.purchasePriority],
    },
  };
}

export function parseCommanderDecision(content) {
  const match = String(content ?? '').match(/\{[\s\S]*\}/);
  if (!match) return { ok: false, reason: 'rejected-schema', detail: 'no JSON object found' };
  try {
    return normalizeCommanderDecision(JSON.parse(match[0]));
  } catch {
    return { ok: false, reason: 'rejected-schema', detail: 'invalid JSON' };
  }
}

function commanderPrompt(team, state) {
  return `You are the ${team} commander in Stick RTS. Objective: destroy the enemy core while protecting your own, according to the game rules. Choose the best strategy from the supplied state; no scripted policy will override you. A passive defense cannot win: use defend for a genuine threat, but do not treat a symmetric quiet battlefield as a reason to remain defensive forever. Seek a calculated attack when it advances the core-destruction objective. Purchase plans execute FIFO: a blocked first item prevents every later item from being bought. Use purchaseOptions cost data and available gold to order a viable plan; never put an unaffordable item ahead of a cheaper purchase you intend to make now. Return one bounded strategic plan: select objective (expand, pressure, fortify, or recover), a named target intent (hold-own-mine, contest-mid, pressure-enemy-mine, siege-enemy-outer, attack-enemy-core, or retreat-home), its required command (defend, attack, attack, attack, attack, or retreat respectively), its 30, 45, or 60 second horizon, and 1-4 FIFO purchases. Do not return a purchase that does not support your selected objective. Return only JSON: {"objective":"expand|pressure|fortify|recover","targetIntent":"hold-own-mine|contest-mid|pressure-enemy-mine|siege-enemy-outer|attack-enemy-core|retreat-home","horizonSeconds":30|45|60,"command":"attack|defend|retreat","purchasePriority":["miner|warrior|archer|structure|turret|forgemaster|hawkeye|vanguard"]}. Use only those values. State: ${JSON.stringify(state)}`;
}

async function readBoundedJsonResponse(response) {
  const declaredLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_LM_STUDIO_RESPONSE_BYTES) {
    throw new Error('LM Studio response too large.');
  }
  const reader = response.body?.getReader?.();
  if (!reader) {
    // Standard fetch responses always have a stream. Keep this small fallback
    // for minimal injected test fetch implementations, while still rejecting
    // an oversized result before it reaches the JSON parser.
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_LM_STUDIO_RESPONSE_BYTES) throw new Error('LM Studio response too large.');
    return JSON.parse(text);
  }
  let bytes = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_LM_STUDIO_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error('LM Studio response too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(result));
}

// A local provider can be enabled yet unreachable or stalled. Keep the bridge
// bounded so one unavailable inference cannot indefinitely hold a same-origin
// companion request (or the browser command loop) open. This is transport-only:
// it does not invent a fallback strategy or bypass deterministic validation.
export function createLocalLmStudioProvider({
  endpoint = 'http://127.0.0.1:1234/v1/chat/completions',
  model = 'google/gemma-4-e4b',
  fetchImpl = fetch,
  timeoutMilliseconds = DEFAULT_LM_STUDIO_TIMEOUT_MILLISECONDS,
} = {}) {
  if (!Number.isInteger(timeoutMilliseconds) || timeoutMilliseconds < 1 || timeoutMilliseconds > 60_000) {
    throw new Error('LM Studio timeoutMilliseconds must be a bounded positive integer.');
  }
  return {
    id: 'local-lmstudio',
    async decide(team, state) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ model, temperature: 0, max_tokens: COMMANDER_MAX_RESPONSE_TOKENS, reasoning_effort: 'none', response_format: { type: 'json_schema', json_schema: { name: 'commander_decision', schema: COMMANDER_RESPONSE_SCHEMA } }, messages: [{ role: 'system', content: 'Return only valid JSON matching the response schema.' }, { role: 'user', content: commanderPrompt(team, state) }] }),
        });
        if (!response.ok) throw new Error(`LM Studio request failed: ${response.status}`);
        const body = await readBoundedJsonResponse(response);
        return parseCommanderDecision(body.choices?.[0]?.message?.content);
      } catch (error) {
        return { ok: false, reason: 'rejected-provider', detail: error instanceof Error ? error.message : 'provider request failed' };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export function createCommanderProvider(kind, options = {}) {
  if (kind === 'local-lmstudio') return createLocalLmStudioProvider(options);
  throw new Error(`Unknown commander provider: ${kind}`);
}
