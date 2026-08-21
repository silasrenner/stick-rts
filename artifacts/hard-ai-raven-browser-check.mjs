import { mkdir, writeFile } from 'node:fs/promises';

const appUrl = `http://127.0.0.1:8811/?hard-raven-browser=${Date.now()}`;
const outDir = new URL('./hard-ai-raven-browser/', import.meta.url);
await mkdir(outDir, { recursive: true });

async function newTarget(url) {
  const response = await fetch(`http://127.0.0.1:9225/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`CDP target creation failed: ${response.status}`);
  return response.json();
}
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); }
    else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '));
  };
  const ready = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params })); });
  return { ws, ready, send, errors };
}
const target = await newTarget('about:blank');
const { ws, ready, send, errors } = connect(target.webSocketDebuggerUrl);
await ready; await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: appUrl }); await new Promise((resolve) => setTimeout(resolve, 500));
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function screenshot(name) { const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true }); await writeFile(new URL(`${name}.png`, outDir), Buffer.from(data, 'base64')); }

const controlResult = await evaluate(`
  window.__startWatchAiMatch('hard', 'hard', 703);
  const canvas = document.querySelector('#game'); const rect = canvas.getBoundingClientRect();
  window.__uiState.spectatorView = 'full'; window.__forceTicks(0);
  canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rect.left + 238 * rect.width / canvas.width, clientY: rect.top + 520 * rect.height / canvas.height }));
  const left = window.__uiState.spectatorView;
  canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rect.left + 294 * rect.width / canvas.width, clientY: rect.top + 520 * rect.height / canvas.height }));
  ({ left, right: window.__uiState.spectatorView });
`);
if (controlResult.left !== 'left' || controlResult.right !== 'right') throw new Error(`Spectator controls failed: ${JSON.stringify(controlResult)}`);

const runToPurchase = (view) => evaluate(`
  (() => {
    window.__startWatchAiMatch('hard', 'hard', 703);
    window.__uiState.spectatorView = '${view}';
    let event = null;
    for (let tick = 0; tick < 36000; tick += 1) {
      window.__forceTicks(1);
      for (const team of ['player', 'ai']) {
        const decision = window.__world.teams[team].lastAiDecision;
        if (decision?.selection?.source === 'raven-utility' && decision.selection.result?.ok) { event = { team, time: decision.time, decision }; break; }
      }
      if (event) break;
    }
    const normalize = (world) => JSON.stringify({
      time: world.matchElapsedTime,
      teams: Object.fromEntries(Object.entries(world.teams).map(([team, state]) => [team, { gold: state.gold, spent: state.goldSpent, command: state.command, buildIndex: state.buildIndex, cooldown: state.ravenCooldownTimer, decision: state.lastAiDecision?.selection }])),
      ravens: world.ravens.map(({ id, ...raven }) => raven),
      visionSources: world.visionSources.map(({ ravenId, ...source }) => source),
    });
    return { event, snapshot: normalize(window.__world) };
  })()
`);
const full = await runToPurchase('full'); const left = await runToPurchase('left'); const right = await runToPurchase('right');
if (!full.event || !left.event || !right.event) throw new Error('Hard AI did not autonomously purchase a Raven within the fixed scenario bound.');
if (full.snapshot !== left.snapshot || full.snapshot !== right.snapshot) throw new Error('Spectator perspective altered autonomous Raven simulation state.');

await evaluate(`
  (() => {
  window.__startWatchAiMatch('hard', 'hard', 703); window.__uiState.spectatorView = 'full';
  let event = null;
  for (let tick = 0; tick < 36000 && !event; tick += 1) {
    window.__forceTicks(1);
    for (const team of ['player', 'ai']) { const decision = window.__world.teams[team].lastAiDecision; if (decision?.selection?.source === 'raven-utility' && decision.selection.result?.ok) { event = { team, decision }; break; } }
  }
  window.__forceTicks(180);
  const raven = window.__world.ravens.find((entry) => entry.team === event.team);
  window.__camera.x = raven.x; window.__camera.targetX = raven.x; window.__forceTicks(0);
  window.__hardRavenBrowserEvent = event;
  })()
`);
await screenshot('autonomous-launch-full');
for (const view of ['left', 'right']) { await evaluate(`window.__uiState.spectatorView = '${view}'; window.__forceTicks(0);`); await screenshot(`autonomous-inflight-${view}`); }
const reveal = await evaluate(`
  (() => {
  window.__uiState.spectatorView = 'full'; window.__forceTicks(500);
  const event = window.__hardRavenBrowserEvent; const raven = window.__world.ravens.find((entry) => entry.team === event.team);
  window.__camera.x = raven?.enemyHomeX ?? window.__camera.x; window.__camera.targetX = window.__camera.x; window.__forceTicks(0);
  return ({ event, raven: raven ? { state: raven.state, team: raven.team } : null, sources: window.__world.visionSources.filter((source) => source.ravenId != null).map(({ team, ravenSource, radius }) => ({ team, ravenSource, radius })), decision: window.__world.teams[event.team].lastAiDecision, cooldown: window.__world.teams[event.team].ravenCooldownTimer });
  })()
`);
if (reveal.raven?.state !== 'revealing' || !reveal.sources.some((source) => source.ravenSource === 'reveal' && source.radius === 800)) throw new Error(`Autonomous Raven did not reach configured reveal: ${JSON.stringify(reveal)}`);
await screenshot('autonomous-reveal-full');
const post = await evaluate(`
  (() => {
  window.__forceTicks(700);
  const event = window.__hardRavenBrowserEvent;
  return ({ ravenCount: window.__world.ravens.filter((raven) => raven.team === event.team).length, ravenSources: window.__world.visionSources.filter((source) => source.ravenId != null && source.team === event.team).length, cooldown: window.__world.teams[event.team].ravenCooldownTimer, observation: window.__world.teams[event.team].lastAiDecision?.observed?.information });
  })()
`);
if (post.ravenSources !== 0 || post.ravenCount !== 0 || !(post.cooldown > 0)) throw new Error(`Autonomous Raven cleanup/cooldown failed: ${JSON.stringify(post)}`);
await screenshot('autonomous-post-reveal-full');
if (errors.length) throw new Error(`Browser console errors: ${errors.join(' | ')}`);
ws.close();
console.log(JSON.stringify({ appUrl, controlResult, autonomousPurchase: full.event, deterministic: { fullEqualsLeft: full.snapshot === left.snapshot, fullEqualsRight: full.snapshot === right.snapshot }, reveal: { raven: reveal.raven, sources: reveal.sources, observation: reveal.decision?.observed?.information, selection: reveal.decision?.selection }, post, screenshots: ['artifacts/hard-ai-raven-browser/autonomous-launch-full.png', 'artifacts/hard-ai-raven-browser/autonomous-inflight-left.png', 'artifacts/hard-ai-raven-browser/autonomous-inflight-right.png', 'artifacts/hard-ai-raven-browser/autonomous-reveal-full.png', 'artifacts/hard-ai-raven-browser/autonomous-post-reveal-full.png'] }, null, 2));
