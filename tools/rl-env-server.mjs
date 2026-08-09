import readline from 'node:readline';
import { createRlEnvironment, createSelfPlayEnvironment } from '../src/rl/environment.js';

let environment = createRlEnvironment();
let opponentPolicy = null;
const selfPlayEnvironment = createSelfPlayEnvironment();

function withOpponentMetadata(result) {
  return {
    ...result,
    opponentPolicy,
    opponentProductionQueueLength: environment.world?.teams.ai.productionQueue.length ?? 0,
  };
}

function response(id, result) {
  process.stdout.write(`${JSON.stringify({ id, result })}\n`);
}

const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  let request;
  try {
    request = JSON.parse(line);
    if (!Number.isInteger(request.id)) throw new Error('request id must be an integer');
    if (request.op === 'reset-self-play') {
      if (!Number.isFinite(request.seed)) throw new Error('reset-self-play seed must be numeric');
      response(request.id, selfPlayEnvironment.reset(request.seed));
    } else if (request.op === 'step-self-play') {
      if (!request.actions || !Number.isInteger(request.actions.player) || !Number.isInteger(request.actions.ai)) throw new Error('step-self-play requires integer player and ai actions');
      response(request.id, selfPlayEnvironment.step(request.actions));
    } else if (request.op === 'reset') {
      if (!Number.isFinite(request.seed)) throw new Error('reset seed must be numeric');
      if (request.decisionSeconds !== undefined && (!Number.isFinite(request.decisionSeconds) || request.decisionSeconds <= 0)) {
        throw new Error('reset decisionSeconds must be a positive number');
      }
      if (request.maxEpisodeSeconds !== undefined && (!Number.isFinite(request.maxEpisodeSeconds) || request.maxEpisodeSeconds <= 0)) {
        throw new Error('reset maxEpisodeSeconds must be a positive number');
      }
      if (request.opponentPolicy !== null && request.opponentPolicy !== undefined && request.opponentPolicy !== 'hard-rl-v1') {
        throw new Error(`unknown opponentPolicy: ${request.opponentPolicy}`);
      }
      opponentPolicy = request.opponentPolicy ?? null;
      environment = createRlEnvironment({
        decisionSeconds: request.decisionSeconds ?? 1,
        maxEpisodeSeconds: request.maxEpisodeSeconds ?? 300,
        opponentDifficulty: opponentPolicy,
      });
      response(request.id, withOpponentMetadata(environment.reset(request.seed)));
    } else if (request.op === 'step') {
      if (!Number.isInteger(request.action)) throw new Error('step action must be an integer');
      response(request.id, withOpponentMetadata(environment.step(request.action)));
    } else if (request.op === 'close') {
      response(request.id, { closed: true });
      break;
    } else {
      throw new Error(`unknown op: ${request.op}`);
    }
  } catch (error) {
    response(Number.isInteger(request?.id) ? request.id : null, { error: error.message });
  }
}
