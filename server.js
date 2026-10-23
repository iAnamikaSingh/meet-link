// MeetLink server: zero dependencies. Static files + REST + Server-Sent Events relay.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000, PUB = path.join(__dirname, 'public');
const MAX_MEETINGS = 5000, MAX_PEOPLE = 25;
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.txt': 'text/plain', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png' };
const meetings = new Map(); // code -> {exp, vis, token, clients:Map, timer}

const rc = () => Array.from(crypto.randomBytes(11), b => A[b % 36]).join('');
const send = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
const ev = (res, name, data) => res.write('event: ' + name + '\ndata: ' + JSON.stringify(data) + '\n\n');

function readBody(req, max = 700000) {
  return new Promise((ok, no) => {
    let n = 0; const c = [];
    req.on('data', d => { n += d.length; if (n > max) { no(new Error('too big')); req.destroy(); } else c.push(d); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(c).toString() || '{}')); } catch (e) { no(e); } });
    req.on('error', no);
  });
}
function live(code) {
  const m = meetings.get(code);
  if (m && m.exp <= Date.now()) { endMeeting(code); return null; }
  return m || null;
}
function endMeeting(code) {
  const m = meetings.get(code); if (!m) return;
  clearTimeout(m.timer);
  m.clients.forEach(c => { ev(c.res, 'expired', {}); c.res.end(); });
  meetings.delete(code);
}
const pushPeers = m => m.clients.forEach(c => ev(c.res, 'peers', { peers: [...m.clients.values()].map(p => ({ id: p.id, n: p.name })) }));

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self)');
  const u = new URL(req.url, 'http://x'), p = u.pathname;
  try {
    if (req.method === 'POST' && p === '/api/create') {
      const b = await readBody(req, 2000);
      let mins = parseInt(b.minutes, 10); if (!(mins >= 1 && mins <= 1440)) mins = 60;
      if (meetings.size >= MAX_MEETINGS) return send(res, 503, { error: 'busy' });
      let code; do { code = rc(); } while (meetings.has(code));
      const m = { exp: Date.now() + mins * 60000, vis: b.vis === 'A' ? 'A' : 'E', token: crypto.randomBytes(16).toString('hex'), clients: new Map() };
      m.timer = setTimeout(() => endMeeting(code), mins * 60000 + 500);
      meetings.set(code, m);
      return send(res, 200, { code, token: m.token });
    }
    if (req.method === 'GET' && p.startsWith('/api/meeting/')) {
      const m = live(p.slice(13)); if (!m) return send(res, 200, { ok: false });
      const admin = u.searchParams.get('token') === m.token;
      return send(res, 200, { ok: true, admin, vis: m.vis, exp: (m.vis === 'E' || admin) ? m.exp : null });
    }
    if (req.method === 'GET' && p === '/api/ice') {
      let ice = [{ urls: 'stun:stun.l.google.com:19302' }];
      try { if (process.env.ICE_SERVERS) ice = JSON.parse(process.env.ICE_SERVERS); } catch (e) {}
      return send(res, 200, ice);
    }
    if (req.method === 'GET' && p.startsWith('/api/events/')) {
      const m = live(p.slice(12)), id = u.searchParams.get('id') || '';
      if (!m || !/^[a-z0-9]{4,12}$/.test(id) || m.clients.size >= MAX_PEOPLE) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      m.clients.set(id, { id, name: (u.searchParams.get('name') || 'Guest').slice(0, 24), res });
      ev(res, 'hello', {}); pushPeers(m);
      const hb = setInterval(() => res.write(': ping\n\n'), 25000);
      req.on('close', () => { clearInterval(hb); m.clients.delete(id); pushPeers(m); });
      return;
    }
    if (req.method === 'POST' && p.startsWith('/api/send/')) {
      const m = live(p.slice(10)), b = await readBody(req);
      if (!m || !m.clients.has(b.id) || !['chat', 'sig'].includes(b.topic)) return send(res, 400, { ok: false });
      m.clients.forEach(c => { if (c.id !== b.id) ev(c.res, 'msg', { topic: b.topic, data: b.data }); });
      return send(res, 200, { ok: true });
    }
    // static files, falling back to index.html
    let f = path.normalize(path.join(PUB, p === '/' ? 'index.html' : p));
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(PUB, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=300' });
    fs.createReadStream(f).pipe(res);
  } catch (e) { if (!res.headersSent) send(res, 400, { error: 'bad request' }); }
});
server.listen(PORT, () => console.log('MeetLink running on http://localhost:' + PORT));
