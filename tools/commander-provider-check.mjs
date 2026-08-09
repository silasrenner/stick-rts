import { createLocalLmStudioProvider, DEFAULT_LM_STUDIO_TIMEOUT_MILLISECONDS, MAX_LM_STUDIO_RESPONSE_BYTES, normalizeCommanderDecision, parseCommanderDecision } from '../src/commander/providers.js';

if (DEFAULT_LM_STUDIO_TIMEOUT_MILLISECONDS !== 30_000) throw new Error(`Expected a 30-second cold-start-safe Local Gemma timeout, received ${DEFAULT_LM_STUDIO_TIMEOUT_MILLISECONDS}.`);

const fenced = parseCommanderDecision('```json\n{"command":"defend","objective":"fortify","targetIntent":"hold-own-mine","horizonSeconds":45,"purchasePriority":["turret","archer","warrior"]}\n```');
if (!fenced.ok || fenced.decision.command !== 'defend' || fenced.decision.objective !== 'fortify' || fenced.decision.horizonSeconds !== 45 || fenced.decision.purchasePriority.join(',') !== 'turret,archer,warrior') throw new Error(`Failed to parse valid fenced commander decision: ${JSON.stringify(fenced)}`);
const rejectedSchema = parseCommanderDecision('{"command":"nuke","objective":"invalid","horizonSeconds":99,"purchasePriority":["invalid"]}');
if (rejectedSchema.ok || rejectedSchema.reason !== 'rejected-schema') throw new Error(`Unsafe model decision must be rejected, not defaulted: ${JSON.stringify(rejectedSchema)}`);
const normalized = normalizeCommanderDecision({ command: 'attack', objective: 'pressure', targetIntent: 'attack-enemy-core', horizonSeconds: 60, purchasePriority: ['archer', 'archer', 'turret', 'miner'] });
if (!normalized.ok || normalized.decision.command !== 'attack' || normalized.decision.objective !== 'pressure' || normalized.decision.horizonSeconds !== 60 || normalized.decision.purchasePriority.join(',') !== 'archer,archer,turret,miner') {
  throw new Error(`Commander decision validation did not preserve bounded model intent: ${JSON.stringify(normalized)}`);
}

// An enabled but stalled local model must fail through the normal provider
// boundary instead of leaving the companion/browser command loop pending.
let receivedSignal;
const stalledProvider = createLocalLmStudioProvider({
  timeoutMilliseconds: 1,
  fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
    receivedSignal = options.signal;
    options.signal.addEventListener('abort', () => reject(new Error('aborted by provider timeout')), { once: true });
  }),
});
const stalledResult = await stalledProvider.decide('player', {});
if (stalledResult.ok || stalledResult.reason !== 'rejected-provider' || stalledResult.detail !== 'aborted by provider timeout' || !receivedSignal?.aborted) {
  throw new Error(`Stalled provider did not return a bounded rejection: ${JSON.stringify(stalledResult)}`);
}
for (const timeoutMilliseconds of [0, -1, 60_001, 1.5]) {
  try {
    createLocalLmStudioProvider({ timeoutMilliseconds });
    throw new Error(`Invalid provider timeout ${timeoutMilliseconds} was accepted.`);
  } catch (error) {
    if (!error.message.includes('timeoutMilliseconds')) throw error;
  }
}
const promptBodies = [];
const promptContractProvider = createLocalLmStudioProvider({
  fetchImpl: async (_url, options) => {
    promptBodies.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"command":"attack","objective":"pressure","targetIntent":"attack-enemy-core","horizonSeconds":30,"purchasePriority":["archer"]}' } }] }));
  },
});
await promptContractProvider.decide('player', { gold: 250, population: 1 });
const promptText = promptBodies[0]?.messages?.[1]?.content ?? '';
if (promptBodies[0]?.max_tokens !== 120) {
  throw new Error(`Expected a bounded 120-token structured commander response, received ${promptBodies[0]?.max_tokens}.`);
}
if (promptBodies[0]?.reasoning_effort !== 'none') {
  throw new Error('Commander request did not disable local model reasoning mode.');
}
const responseSchema = promptBodies[0]?.response_format?.json_schema?.schema;
if (promptBodies[0]?.response_format?.type !== 'json_schema' || responseSchema?.properties?.purchasePriority?.minItems !== 1
  || !responseSchema?.required?.includes('objective') || !responseSchema?.required?.includes('horizonSeconds')) {
  throw new Error('Commander request did not require a bounded structured strategic plan.');
}
if (!promptText.includes('A passive defense cannot win')) {
  throw new Error('Commander prompt does not require strategic initiative toward the core objective.');
}
if (!promptText.includes('Purchase plans execute FIFO') || !promptText.includes('cost')) {
  throw new Error('Commander prompt does not explain FIFO purchase blocking and costs.');
}
if (!promptText.includes('Return one bounded strategic plan') || !promptText.includes('30, 45, or 60 second horizon')) {
  throw new Error('Commander prompt does not require an actionable bounded strategic plan.');
}

const validProvider = createLocalLmStudioProvider({
  fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"command":"attack","objective":"pressure","targetIntent":"attack-enemy-core","horizonSeconds":30,"purchasePriority":["archer"]}' } }] })),
});
const validDecision = await validProvider.decide('player', {});
if (!validDecision.ok || validDecision.decision.command !== 'attack' || validDecision.decision.objective !== 'pressure' || validDecision.decision.horizonSeconds !== 30 || validDecision.decision.purchasePriority.join(',') !== 'archer') {
  throw new Error(`Valid bounded LM Studio response was not decoded: ${JSON.stringify(validDecision)}`);
}
const oversizedProvider = createLocalLmStudioProvider({
  fetchImpl: async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_LM_STUDIO_RESPONSE_BYTES + 1));
      controller.close();
    },
  })),
});
const oversizedResult = await oversizedProvider.decide('player', {});
if (oversizedResult.ok || oversizedResult.reason !== 'rejected-provider' || oversizedResult.detail !== 'LM Studio response too large.') {
  throw new Error(`An oversized streamed LM Studio response was not rejected: ${JSON.stringify(oversizedResult)}`);
}
console.log('PASS — commander parsing preserves valid intent and converts malformed/provider failures into explicit non-strategic rejections.');
