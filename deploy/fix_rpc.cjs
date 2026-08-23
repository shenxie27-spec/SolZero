const fs = require('fs');
const p = 'D:/sol/solzero/server/src/index.js';
const s = fs.readFileSync(p, 'utf8');
const a = s.indexOf("app.post('/rpc'");
const b = s.indexOf('app.use((err');
if (a < 0 || b < 0) { console.error('anchors missing'); process.exit(1); }
const block = `app.post('/rpc', handle(async (req, res) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const upstream = await fetch(proxyUpstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });
    const text = await upstream.text();
    res.status(upstream.status).type('application/json').send(text);
  } catch (err) {
    res.status(502).json({ jsonrpc: '2.0', error: { code: -32603, message: 'rpc upstream unavailable' }, id: (req.body && req.body.id) || null });
  } finally {
    clearTimeout(timer);
  }
}));

app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

`;
fs.writeFileSync(p, s.slice(0, a) + block + s.slice(b));
console.log('rewritten ok');
