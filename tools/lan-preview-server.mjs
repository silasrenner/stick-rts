// LAN preview server with an opt-in bridge for the future Model Commander.
// Static pages and browser API calls share one origin, so laptop browsers never
// need direct access to the PC-only LM Studio listener (127.0.0.1:1234).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { createCommanderProvider } from '../src/commander/providers.js';
import { buildBoundedCommanderContext } from '../src/commander/context.js';
import { MatchIdConflictError, createLeagueStore } from '../src/strategy/leagueStore.js';

const root = process.cwd();
const league = await createLeagueStore(resolve(process.env.LEAGUE_DATA_FILE || join(root, '.local', 'strategy-league.json')));
const port = Number(process.env.PORT || 8811);
const host = process.env.HOST || '0.0.0.0';
const commanderEnabled = process.env.MODEL_COMMANDER === '1';
const commander = commanderEnabled ? createCommanderProvider('local-lmstudio', { model: process.env.LM_STUDIO_MODEL || 'google/gemma-4-e4b' }) : null;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

function json(res, statusCode, body) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(`${JSON.stringify(body)}\n`);
}

const MAX_JSON_BODY_BYTES = 16_384;

// The companion deliberately has no CORS surface: browser clients must use
// the origin that served the game.  Modern browsers send Origin for unsafe
// requests, but enforce it here as well so a cross-site form/request cannot
// record telemetry or invoke the model bridge merely because it reaches this
// LAN listener. Requests without Origin remain available to the local offline
// tools that exercise the companion API directly.
function hasSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(`http://${req.headers.host || 'localhost'}`).origin;
  } catch {
    return false;
  }
}

// Browser API writes are JSON-only. This complements the Origin check: a
// cross-site HTML form cannot satisfy this content type, and non-JSON request
// bodies never reach telemetry or the model-command boundary.
function hasJsonContentType(req) {
  const contentType = req.headers['content-type'];
  return typeof contentType === 'string' && /^application\/json(?:\s*;|\s*$)/i.test(contentType);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    // Do not concatenate an unbounded browser request before rejecting it.
    // Continue draining after the limit so the client gets a normal 400 and
    // this keep-alive connection cannot carry unread request bytes forward.
    let body = '';
    let bytes = 0;
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const declaredLength = Number(req.headers['content-length']);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
      fail(new Error('Request too large'));
      req.resume();
      return;
    }
    req.on('data', (chunk) => {
      // `fail` settles the caller as soon as the cap is crossed, but the
      // stream must keep draining. Do not keep appending subsequent chunks:
      // a chunked request without Content-Length could otherwise retain an
      // unbounded body in memory despite the nominal 16 KiB limit.
      if (settled) return;
      bytes += chunk.length;
      if (bytes > MAX_JSON_BODY_BYTES) return fail(new Error('Request too large'));
      body += chunk;
    });
    req.on('end', () => {
      if (settled) return;
      try { resolve(JSON.parse(body)); } catch { fail(new Error('Invalid JSON')); }
    });
    req.on('error', fail);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/') && !hasSameOrigin(req)) {
    // Consume a rejected request body before responding so a keep-alive
    // connection cannot retain attacker-controlled bytes for the next route.
    req.resume();
    return json(res, 403, { error: 'Cross-origin companion requests are not allowed.' });
  }
  if (url.pathname === '/api/league') {
    if (req.method !== 'GET') {
      // Read-only companion routes must not leave an unexpected request body
      // queued on a keep-alive connection before returning their 405.
      req.resume();
      return json(res, 405, { error: 'Method not allowed' });
    }
    return json(res, 200, await league.snapshot());
  }
  const strategyMatch = url.pathname.match(/^\/api\/league\/strategy\/(red|blue)$/);
  if (strategyMatch) {
    if (req.method !== 'GET') {
      req.resume();
      return json(res, 405, { error: 'Method not allowed' });
    }
    // A commander asks only for its own profile. The aggregate endpoint is
    // for the history UI; it is never used as model context.
    const profile = (await league.snapshot()).profiles[strategyMatch[1]];
    return json(res, 200, profile);
  }
  if (url.pathname === '/api/league/matches') {
    if (req.method !== 'POST') {
      req.resume();
      return json(res, 405, { error: 'Method not allowed' });
    }
    if (!hasJsonContentType(req)) {
      req.resume();
      return json(res, 415, { error: 'Expected application/json request body.' });
    }
    try {
      // Record-only boundary: profiles are intentionally not mutable through
      // this browser-facing API. Their pending-provider status makes the
      // absent OpenAI/Codex review workflow explicit rather than fabricated.
      return json(res, 201, await league.record(await readJson(req)));
    } catch (error) { return json(res, error instanceof MatchIdConflictError ? 409 : 400, { error: error.message }); }
  }
  if (url.pathname === '/api/commander/status') {
    // Status is intentionally read-only too.  Keeping every companion route
    // method-scoped avoids accidental future request-body handling here.
    if (req.method !== 'GET') {
      req.resume();
      return json(res, 405, { error: 'Method not allowed' });
    }
    return json(res, 200, { enabled: commanderEnabled, lmStudio: commanderEnabled ? 'pending' : 'unavailable' });
  }
  if (url.pathname === '/api/commander') {
    if (req.method !== 'POST') {
      req.resume();
      return json(res, 405, { error: 'Method not allowed' });
    }
    if (!hasJsonContentType(req)) {
      req.resume();
      return json(res, 415, { error: 'Expected application/json request body.' });
    }
    if (!commanderEnabled) {
      // This route has already accepted a JSON content type, but it must not
      // leave a browser request body unread when the explicit provider
      // boundary is unavailable. Draining preserves keep-alive framing and
      // confirms that no state reaches the provider in disabled mode.
      req.resume();
      return json(res, 503, { error: 'Model Commander is disabled on this preview server.' });
    }
    try {
      const request = await readJson(req);
      const leagueTeam = request.team === 'player' ? 'red' : request.team === 'ai' ? 'blue' : null;
      if (!leagueTeam || !request.state || typeof request.state !== 'object') return json(res, 400, { error: 'Expected player or ai team and state.' });
      // Do not trust a browser-supplied strategy profile (or arbitrary prompt
      // fields). The provider receives a fixed observation and its team's
      // profile freshly read from companion storage.
      const profile = (await league.snapshot()).profiles[leagueTeam];
      return json(res, 200, await commander.decide(request.team, buildBoundedCommanderContext(request.state, leagueTeam, profile)));
    } catch (error) { return json(res, 502, { error: `Commander unavailable: ${error.message}` }); }
  }
  // Static assets are read-only too. Drain an unexpected body before the 405
  // so a same-origin browser/client cannot leave bytes queued on a reused
  // companion connection after posting to a static path.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.resume();
    return json(res, 405, { error: 'Method not allowed' });
  }
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  // URL pathnames retain percent-encoded traversal separators. Decode before
  // resolving, then use a path-aware relative check rather than a string
  // prefix (`root` must not accidentally authorize a sibling such as
  // `root-backup`). Static files are the last companion surface and must stay
  // inside this feature's served game root.
  let decodedRequested;
  try { decodedRequested = decodeURIComponent(requested); }
  catch { return json(res, 400, { error: 'Invalid URL path' }); }
  const file = resolve(root, `.${decodedRequested}`);
  const pathFromRoot = relative(root, file);
  if (pathFromRoot === '..' || pathFromRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || pathFromRoot === '') {
    return json(res, 403, { error: 'Forbidden' });
  }
  try {
    if (!(await stat(file)).isFile()) return json(res, 404, { error: 'Not found' });
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    if (req.method === 'HEAD') res.end(); else res.end(body);
  } catch { json(res, 404, { error: 'Not found' }); }
});
server.listen(port, host, () => console.log(`Stick RTS LAN preview listening on http://${host}:${port}/`));
