// New tester sign-ups, for Darwin's private tester dashboard (a file on his own computer).
// Counts only, no names or emails, and only for a request that carries the dashboard's key.
// Just a hash of the key is kept here. ?since=<time> counts the sign-ups after that time (UTC, like 2026-11-07 20:05:36).
const KEY_HASH = 'f8227bf3886e13e50abaa6c4754d621dcf9726aab560333e9c162023438f33bc';
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' },
});

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(q.get('key') || ''));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex !== KEY_HASH) return json({ error: 'Not allowed.' }, 403);
  if (!env.WAITLIST) return json({ total: 0, since: 0, latest: null });
  const since = String(q.get('since') || '').slice(0, 30);
  try {
    const all = await env.WAITLIST.prepare('SELECT COUNT(*) AS n, MAX(created_at) AS latest FROM waitlist').first();
    const after = since ? await env.WAITLIST.prepare('SELECT COUNT(*) AS n FROM waitlist WHERE created_at > ?').bind(since).first() : all;
    return json({ total: all.n, since: after.n, latest: all.latest });
  } catch {
    return json({ total: 0, since: 0, latest: null });
  }
}
