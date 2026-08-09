import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateScriptedTrace, writeScriptedTrace } from './generate-scripted-trace.mjs';

const trace = generateScriptedTrace({ seed: 26002, maxEpisodeSeconds: 8 });
assert.equal(trace.schema, 'stick-rts-scripted-trace-v1');
assert.equal(trace.baseline, 'hard-rl-v1');
assert.equal(trace.seed, 26002);
assert.ok(trace.decisions.length > 0, 'a scripted reference match must produce full-cadence decisions');

for (const decision of trace.decisions) {
  assert.equal(decision.observation.length, 35);
  assert.equal(decision.actionMask.length, 18);
  assert.ok(Number.isInteger(decision.actionIndex) && decision.actionIndex >= 0 && decision.actionIndex < 18);
  assert.ok(['defend', 'attack', 'retreat'].includes(decision.action.command));
  assert.ok(['none', 'miner', 'warrior', 'archer', 'structure', 'turret'].includes(decision.action.production));
  assert.ok(Number.isFinite(decision.simulatedSeconds));
  assert.equal(decision.team, 'player');
}

const tempDir = mkdtempSync(join(tmpdir(), 'stick-rts-trace-'));
try {
  const outputPath = join(tempDir, 'hard-rl-v1.json');
  const written = writeScriptedTrace(outputPath, { seed: 26003, maxEpisodeSeconds: 4 });
  assert.equal(JSON.parse(readFileSync(outputPath, 'utf8')).seed, 26003);
  assert.equal(written.seed, 26003);
  assert.throws(() => writeScriptedTrace(outputPath, { seed: 26003 }), /already exists/);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log('PASS — hard-rl-v1 trace records replayable policy inputs and actions at every decision boundary.');
