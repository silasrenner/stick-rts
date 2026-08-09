const port = Number(process.env.PORT || 8812);
const base = `http://127.0.0.1:${port}`;
const health = await fetch(`${base}/api/commander/status`);
if (!health.ok) throw new Error(`Commander status endpoint failed: ${health.status}`);
const payload = await health.json();
if (payload.enabled !== false || payload.lmStudio !== 'unavailable') throw new Error(`Expected a safe disabled commander state without opt-in: ${JSON.stringify(payload)}`);
const blocked = await fetch(`${base}/api/commander`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
if (blocked.status !== 503) throw new Error(`Commander requests must be disabled without explicit opt-in: ${blocked.status}`);
console.log('PASS — LAN companion server exposes safe disabled commander endpoints.');
