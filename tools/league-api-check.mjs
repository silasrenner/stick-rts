import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { Agent, request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = await mkdtemp(join(tmpdir(), 'stick-rts-league-api-'));
const port = 8824;
const dataFile = join(directory, 'league.json');
const child = spawn(process.execPath, ['tools/lan-preview-server.mjs'], {
  cwd: process.cwd(), env: { ...process.env, PORT: String(port), LEAGUE_DATA_FILE: dataFile }, stdio: ['ignore', 'pipe', 'pipe'],
});
const ready = new Promise((resolve, reject) => {
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; if (output.includes('listening')) resolve(); });
  child.stderr.on('data', (chunk) => { output += chunk; });
  child.once('error', reject);
  child.once('exit', (code) => reject(new Error(`Preview server exited ${code}: ${output}`)));
});
const match = {
  matchId: 'watch-api-retry-001', winner: 'blue', durationSeconds: 61, strategyRevisions: { red: 0, blue: 0 },
  teams: {
    red: { gold: 10, goldSpent: 500, losses: 8, composition: { miner: 2, warrior: 3 } },
    blue: { gold: 80, goldSpent: 450, losses: 2, composition: { archer: 4, turret: 1 } },
  },
};

function chunkedPost(url, chunks) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = httpRequest({
      hostname: target.hostname,
      port: target.port,
      path: target.pathname,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    }, (res) => {
      res.resume();
      res.once('end', () => resolve(res.statusCode));
    });
    req.once('error', reject);
    for (const chunk of chunks) req.write(chunk);
    req.end();
  });
}

function requestOnAgent(url, { method = 'GET', headers = {}, body } = {}, agent) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = httpRequest({
      hostname: target.hostname,
      port: target.port,
      path: target.pathname,
      method,
      headers,
      agent,
    }, (res) => {
      let responseBody = '';
      const socketPort = res.socket.localPort;
      res.setEncoding('utf8');
      res.on('data', (chunk) => { responseBody += chunk; });
      res.once('end', () => resolve({ status: res.statusCode, body: responseBody, socketPort }));
    });
    req.once('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
try {
  await ready;
  const base = `http://127.0.0.1:${port}`;
  // Static assets are read-only companion routes too. An unexpected body must
  // be drained before 405 so the same keep-alive connection can safely read
  // League history afterward.
  const keepAliveAgent = new Agent({ keepAlive: true, maxSockets: 1 });
  try {
    const staticMutation = await requestOnAgent(`${base}/index.html`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"ignored":true}\n',
    }, keepAliveAgent);
    const followupRead = await requestOnAgent(`${base}/api/league`, {}, keepAliveAgent);
    if (staticMutation.status !== 405 || followupRead.status !== 200 || staticMutation.socketPort !== followupRead.socketPort
      || JSON.parse(followupRead.body).aggregate?.matches !== 0) {
      throw new Error(`Static method rejection did not safely preserve the keep-alive companion connection: ${JSON.stringify({ staticMutation, followupRead })}`);
    }
  } finally { keepAliveAgent.destroy(); }
  const initial = await (await fetch(`${base}/api/league`)).json();
  if (initial.aggregate.matches !== 0 || initial.profiles.red.status !== 'pending-provider') throw new Error(`Missing safe initial league state: ${JSON.stringify(initial)}`);
  // Encoded separators must be decoded before static-path containment checks;
  // they cannot escape the served game root into a sibling/local file.
  const encodedTraversal = await fetch(`${base}/..%2fpackage.json`);
  if (encodedTraversal.status !== 403) throw new Error(`Encoded static traversal was not rejected: ${encodedTraversal.status}`);
  const statusMutation = await fetch(`${base}/api/commander/status`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: '{"ignored":true}',
  });
  if (statusMutation.status !== 405) throw new Error(`Commander status endpoint is unexpectedly mutable: ${statusMutation.status}`);
  const disabledCommander = await fetch(`${base}/api/commander`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: base },
    body: JSON.stringify({ team: 'player', state: { gold: 500 } }),
  });
  if (disabledCommander.status !== 503) throw new Error(`Disabled commander boundary must reject requests without provider access: ${disabledCommander.status}`);
  const redProfile = await (await fetch(`${base}/api/league/strategy/red`)).json();
  if (redProfile.team !== 'red' || redProfile.revision !== 0 || redProfile.status !== 'pending-provider') throw new Error(`Team-scoped strategy endpoint is incorrect: ${JSON.stringify(redProfile)}`);
  const strategyMutation = await fetch(`${base}/api/league/strategy/red`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ignored: true }),
  });
  if (strategyMutation.status !== 405) throw new Error(`Strategy endpoint is unexpectedly mutable: ${strategyMutation.status}`);
  const crossOriginRecord = await fetch(`${base}/api/league/matches`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://untrusted.example' }, body: JSON.stringify(match),
  });
  if (crossOriginRecord.status !== 403) throw new Error(`Cross-origin match request was not rejected: ${crossOriginRecord.status}`);
  const afterCrossOrigin = await (await fetch(`${base}/api/league`)).json();
  if (afterCrossOrigin.aggregate.matches !== 0) throw new Error(`Cross-origin request mutated league history: ${JSON.stringify(afterCrossOrigin)}`);
  const formRecord = await fetch(`${base}/api/league/matches`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'winner=red',
  });
  if (formRecord.status !== 415) throw new Error(`Non-JSON match request was not rejected: ${formRecord.status}`);
  const afterFormRecord = await (await fetch(`${base}/api/league`)).json();
  if (afterFormRecord.aggregate.matches !== 0) throw new Error(`Non-JSON request mutated league history: ${JSON.stringify(afterFormRecord)}`);
  const record = await fetch(`${base}/api/league/matches`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify(match) });
  if (record.status !== 201) throw new Error(`Match endpoint rejected valid summary: ${record.status}`);
  const result = await (await fetch(`${base}/api/league`)).json();
  if (result.aggregate.wins.blue !== 1 || result.recent[0].winner !== 'blue' || result.profiles.blue.revision !== 0) throw new Error(`League result incorrect: ${JSON.stringify(result)}`);
  const retry = await fetch(`${base}/api/league/matches`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify(match) });
  if (retry.status !== 201) throw new Error(`Retried match endpoint response is incorrect: ${retry.status}`);
  const afterRetry = await (await fetch(`${base}/api/league`)).json();
  if (afterRetry.aggregate.matches !== 1 || afterRetry.aggregate.wins.blue !== 1) throw new Error(`Retried completion duplicated persistent history: ${JSON.stringify(afterRetry)}`);
  const conflictingRetry = await fetch(`${base}/api/league/matches`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({ ...match, winner: 'red' }),
  });
  if (conflictingRetry.status !== 409) throw new Error(`Conflicting match-id retry was not rejected: ${conflictingRetry.status}`);
  const afterConflict = await (await fetch(`${base}/api/league`)).json();
  if (afterConflict.aggregate.matches !== 1 || afterConflict.aggregate.wins.blue !== 1) throw new Error(`Conflicting retry mutated league history: ${JSON.stringify(afterConflict)}`);
  const invalid = await fetch(`${base}/api/league/matches`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  if (invalid.status !== 400) throw new Error(`Invalid match was not rejected: ${invalid.status}`);
  const oversized = await fetch(`${base}/api/league/matches`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...match, padding: 'x'.repeat(20_000) }),
  });
  if (oversized.status !== 400) throw new Error(`Oversized request was not rejected: ${oversized.status}`);
  const afterOversized = await (await fetch(`${base}/api/league`)).json();
  if (afterOversized.aggregate.matches !== 1) throw new Error(`Oversized request mutated league history: ${afterOversized}`);
  // Omit Content-Length and cross the body limit over several chunks. This
  // exercises the streaming drain path rather than the early header check.
  const chunkedOversized = await chunkedPost(`${base}/api/league/matches`, ['{"padding":"', 'x'.repeat(20_000), '"}']);
  if (chunkedOversized !== 400) throw new Error(`Chunked oversized request was not rejected: ${chunkedOversized}`);
  const afterChunkedOversized = await (await fetch(`${base}/api/league`)).json();
  if (afterChunkedOversized.aggregate.matches !== 1) throw new Error(`Chunked oversized request mutated league history: ${JSON.stringify(afterChunkedOversized)}`);
  const mutation = await fetch(`${base}/api/league`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ignored: true }),
  });
  if (mutation.status !== 405) throw new Error(`League read endpoint is unexpectedly mutable: ${mutation.status}`);
  const afterReadOnlyBodies = await (await fetch(`${base}/api/league`)).json();
  if (afterReadOnlyBodies.aggregate.matches !== 1) throw new Error(`Read-only request bodies altered league history: ${JSON.stringify(afterReadOnlyBodies)}`);
  // A manually corrupted or interrupted local JSON write must not turn the
  // same-origin history API into a 500/leak stale strategy state. The next
  // valid browser completion safely starts a fresh bounded file.
  await writeFile(dataFile, '{invalid json', 'utf8');
  const corruptRead = await fetch(`${base}/api/league`);
  const corruptSnapshot = await corruptRead.json();
  if (corruptRead.status !== 200 || corruptSnapshot.aggregate?.matches !== 0
    || corruptSnapshot.profiles?.red?.status !== 'pending-provider') {
    throw new Error(`Invalid local league JSON did not fail closed through the API: ${JSON.stringify({ status: corruptRead.status, corruptSnapshot })}`);
  }
  const recoveryRecord = await fetch(`${base}/api/league/matches`, { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({ ...match, matchId: 'watch-api-recover-002' }) });
  if (recoveryRecord.status !== 201 || (await (await fetch(`${base}/api/league`)).json()).aggregate.matches !== 1) {
    throw new Error('A valid same-origin completion did not safely recover corrupt local league JSON.');
  }
  console.log('PASS — same-origin JSON-only companion league API rejects cross-origin/form writes, safely drains bounded request bodies, records only validated completed summaries, and exposes pending-review profiles.');
} finally {
  child.kill();
  await rm(directory, { recursive: true, force: true });
}
