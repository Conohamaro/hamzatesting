import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Hamza123';
const SESSION_SECRET = process.env.SESSION_SECRET || ADMIN_PASSWORD + ':love-tester-session-v1';
const COOKIE = 'lt_admin';
const SESSION_MS = 8 * 60 * 60 * 1000;
const store = getStore({ name: 'love-tester-results', consistency: 'strong' });

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}
function cleanName(v) { return String(v ?? '').trim().slice(0, 30); }
function norm(s) { return s.toLowerCase().normalize('NFKD').replace(/[^\p{L}]/gu, ''); }
function fnv(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function scoreFor(a, b) {
  const key = [norm(a), norm(b)].sort().join('|');
  return fnv(key + '#love') % 96 + 5;
}
function tierOf(score) {
  if (score >= 95) return 'Soulmates';
  if (score >= 80) return 'Burning Love';
  if (score >= 60) return 'Hot Stuff';
  if (score >= 40) return 'Warming Up';
  if (score >= 20) return 'Just Friends';
  return 'Cold Fish';
}
function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}
function makeSession() {
  const exp = Date.now() + SESSION_MS;
  const payload = String(exp);
  return `${payload}.${sign(payload)}`;
}
function cookieValue(req) {
  const raw = req.headers.get('cookie') || '';
  const match = raw.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  return match ? decodeURIComponent(match[1]) : null;
}
function isAdmin(req) {
  const value = cookieValue(req);
  if (!value) return false;
  const [exp, sig] = value.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = sign(exp);
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); }
  catch { return false; }
}
function authCookie(session) {
  return `${COOKIE}=${encodeURIComponent(session)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}`;
}
async function readJson(req) {
  try { return await req.json(); } catch { return {}; }
}

export default async function handler(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === 'POST' && path === '/api/admin/login') {
    const body = await readJson(req);
    if (String(body.password || '') !== ADMIN_PASSWORD) return json({ error: 'Invalid password' }, 401);
    return json({ ok: true }, 200, { 'set-cookie': authCookie(makeSession()) });
  }

  if (req.method === 'POST' && path === '/api/admin/logout') {
    return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0` });
  }

  if (req.method === 'POST' && path === '/api/results') {
    const body = await readJson(req);
    const a = cleanName(body.a), b = cleanName(body.b);
    if (!a || !b || norm(a) === norm(b)) return json({ error: 'Invalid names' }, 400);
    // The server calculates the score, so visitors cannot submit fake percentages.
    const score = scoreFor(a, b);
    const row = { id: crypto.randomUUID(), a, b, score, tier: tierOf(score), time: new Date().toISOString() };
    await store.set(`result/${row.id}`, JSON.stringify(row), { metadata: { createdAt: row.time } });
    return json({ ok: true, score, tier: row.tier }, 201);
  }

  if (path === '/api/results' && req.method === 'GET') {
    if (!isAdmin(req)) return json({ error: 'Admin login required' }, 401);
    const { blobs } = await store.list({ prefix: 'result/' });
    const results = await Promise.all(blobs.map(async b => {
      const raw = await store.get(b.key);
      try { return JSON.parse(raw); } catch { return null; }
    }));
    results.sort((a, b) => String(a?.time || '').localeCompare(String(b?.time || '')));
    return json({ results: results.filter(Boolean) });
  }

  if (path === '/api/results' && req.method === 'DELETE') {
    if (!isAdmin(req)) return json({ error: 'Admin login required' }, 401);
    const { blobs } = await store.list({ prefix: 'result/' });
    await Promise.all(blobs.map(b => store.delete(b.key)));
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}
