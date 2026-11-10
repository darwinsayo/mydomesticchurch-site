// Welcome-email helper for new tester sign-ups.
//
// Every 30 minutes (cron): 1) drafts a welcome email for each new sign-up and emails the draft to Darwin
// with Send / Send now / Edit / Skip links, 2) sends the emails Darwin approved once their time has come.
// Nothing goes to a family until Darwin approves it. Needs the secrets RESEND_API_KEY and WELCOME_SECRET.

const enc = new TextEncoder();
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const html = (body, status = 200) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome emails</title><body style="font:18px/1.5 Georgia,serif;max-width:34rem;margin:2rem auto;padding:0 1rem;color:#2b2b2b;background:#faf6ee">${body}</body>`, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });

// ---- links Darwin can trust: every link carries a signature only this helper can make ----
async function sign(env, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(env.WELCOME_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
const link = async (env, base, id, act) => `${base}/a?id=${id}&act=${act}&t=${await sign(env, `${id}.${act}`)}`;

// ---- time: the next 8 AM (or SEND_HOUR_ET) in Eastern time, in UTC ----
function etParts(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute };
}
function etToUtc(y, m, d, h) {
  let guess = Date.UTC(y, m - 1, d, h);
  for (let i = 0; i < 2; i++) { // correct for daylight saving by checking what Eastern time the guess really is
    const e = etParts(new Date(guess));
    guess += Date.UTC(y, m - 1, d, h) - Date.UTC(e.y, e.m - 1, e.d, e.h, e.mi);
  }
  return guess;
}
export function nextSendTime(now, hour) {
  const e = etParts(now);
  for (let add = 0; add < 3; add++) {
    const t = etToUtc(e.y, e.m, e.d + add, hour);
    if (t > now.getTime() + 60 * 60 * 1000) return t; // at least an hour from now
  }
}

// ---- the draft, in Darwin's voice (the words he has been sending by hand) ----
const THEMES = [
  [/behind|drown|overwhelm|slip|catch up|fall/i, 'Feeling behind is exactly what we built this for, so your note hit home.'],
  [/appointment|therapy|doctor|schedule/i, 'Keeping appointments and the school week together is exactly what we built this for, so your note hit home.'],
  [/chore|clean|mess|help around/i, 'Getting everyone pulling together at home is exactly what we built this for, so your note hit home.'],
  [/pray|rosary|faith|catholic|mass/i, 'Making room for prayer in the middle of a busy day is exactly what we built this for, so your note hit home.'],
  [/new to homeschool|just start|first year|beginning/i, 'Starting out is hard, and a gentle rhythm makes it easier, so your note hit home.'],
];
export function draft(row) {
  const first = String(row.name || '').trim().split(/\s+/)[0] || 'friend';
  const said = [row.hopes, row.school_day, row.kids].filter(Boolean).join(' ');
  const line = (THEMES.find(([re]) => re.test(said)) || [0, ''])[1];
  const body = `Hi ${first},

Thank you for signing up to test the My Domestic Church app.${line ? ' ' + line : ''}

I'm getting your family's space ready now and will send everything you need to get started in the next day or two. In the meantime, I'd love to hear a little about your home:

How do you keep things organized today?

What's working well that you'd hate to lose?

What's the most frustrating part of a normal week?

If one thing got easier, what would it be?

Reply with whatever comes to mind, even a sentence.

God bless,
Darwin`;
  return { subject: 'Thank you for signing up!', body };
}

// ---- database ----
async function setup(db) {
  const made = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='welcome'").first();
  await db.prepare(`CREATE TABLE IF NOT EXISTS welcome (
    waitlist_id INTEGER PRIMARY KEY, state TEXT NOT NULL, subject TEXT, body TEXT, send_at INTEGER, sent_at TEXT, note TEXT)`).run();
  // The first time, everyone already signed up is marked "old" so nobody gets an email they already had by hand.
  if (!made) await db.prepare("INSERT OR IGNORE INTO welcome (waitlist_id, state) SELECT id, 'old' FROM waitlist").run();
}

async function resend(env, msg) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(msg),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

async function sendReview(env, base, row, d) {
  const id = row.id;
  const when = new Date(nextSendTime(new Date(), +env.SEND_HOUR_ET || 8));
  const label = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(when);
  const btn = async (act, text) => `<a href="${await link(env, base, id, act)}" style="display:inline-block;margin:4px 8px 4px 0;padding:10px 16px;background:#4d6b4a;color:#fff;border-radius:8px;text-decoration:none;font-family:sans-serif">${text}</a>`;
  const said = `<p style="font-family:sans-serif;color:#555"><b>${esc(row.name)}</b> · ${esc(row.email)}<br>Who's at home: ${esc(row.kids) || '(nothing)'}<br>School day: ${esc(row.school_day) || '(nothing)'}<br>Hopes: ${esc(row.hopes) || '(nothing)'}</p>`;
  const buttons = `<p>${await btn('send', `Send ${esc(label)}`)}${await btn('now', 'Send now')}${await btn('edit', 'Edit first')}${await btn('skip', 'Skip')}</p>`;
  await resend(env, {
    from: `Welcome helper <${env.FROM.match(/<(.+)>/)[1]}>`, to: [env.REVIEW_TO],
    subject: `Draft for ${row.name}: approve to send`,
    html: `<div style="font:16px/1.5 Georgia,serif;max-width:36rem">${said}${buttons}<hr><div style="white-space:pre-wrap">${esc(d.body)}</div><hr>${buttons}<p style="font-family:sans-serif;color:#777;font-size:13px">Nothing goes to them until you press a button.</p></div>`,
    text: `Draft for ${row.name} <${row.email}>\n\nSend ${label}: ${await link(env, base, id, 'send')}\nSend now: ${await link(env, base, id, 'now')}\nEdit first: ${await link(env, base, id, 'edit')}\nSkip: ${await link(env, base, id, 'skip')}\n\n${d.body}`,
  });
}

async function run(env, base) {
  const db = env.WAITLIST;
  await setup(db);
  // 1. New sign-ups: draft, then email Darwin to review.
  const fresh = await db.prepare('SELECT w.* FROM waitlist w LEFT JOIN welcome e ON e.waitlist_id = w.id WHERE e.waitlist_id IS NULL ORDER BY w.id').all();
  for (const row of fresh.results || []) {
    const d = draft(row);
    await db.prepare("INSERT INTO welcome (waitlist_id, state, subject, body) VALUES (?, 'review', ?, ?)").bind(row.id, d.subject, d.body).run();
    try { await sendReview(env, base, row, d); }
    catch (e) { await db.prepare('DELETE FROM welcome WHERE waitlist_id = ?').bind(row.id).run(); console.log('review email failed, will retry', String(e)); }
  }
  // 2. Approved emails whose time has come.
  const due = await db.prepare("SELECT e.*, w.name, w.email FROM welcome e JOIN waitlist w ON w.id = e.waitlist_id WHERE e.state = 'approved' AND e.send_at <= ?").bind(Date.now()).all();
  for (const m of due.results || []) {
    try {
      await resend(env, { from: env.FROM, to: [m.email], reply_to: env.REPLY_TO, subject: m.subject, text: m.body });
      await db.prepare("UPDATE welcome SET state = 'sent', sent_at = datetime('now') WHERE waitlist_id = ?").bind(m.waitlist_id).run();
    } catch (e) { console.log('send failed, will retry', String(e)); }
  }
}

// ---- the page Darwin lands on from the email buttons ----
async function page(request, env) {
  const url = new URL(request.url), id = +url.searchParams.get('id'), act = url.searchParams.get('act') || '';
  if (!id || !['send', 'now', 'edit', 'skip'].includes(act) || url.searchParams.get('t') !== await sign(env, `${id}.${act}`)) return html('<p>This link is not valid.</p>', 403);
  const db = env.WAITLIST;
  const m = await db.prepare('SELECT e.*, w.name, w.email FROM welcome e JOIN waitlist w ON w.id = e.waitlist_id WHERE e.waitlist_id = ?').bind(id).first();
  if (!m) return html('<p>Nothing found for this link.</p>', 404);
  if (m.state === 'sent') return html(`<p>Already sent to ${esc(m.name)} on ${esc(m.sent_at)} UTC.</p>`);
  const hour = +env.SEND_HOUR_ET || 8;
  const label = (t) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(t));
  const sendAt = act === 'now' ? Date.now() : nextSendTime(new Date(), hour);

  if (request.method === 'POST') {
    const form = await request.formData();
    if (act === 'skip') {
      await db.prepare("UPDATE welcome SET state = 'skipped' WHERE waitlist_id = ?").bind(id).run();
      return html(`<p>Skipped. Nothing will be sent to ${esc(m.name)}.</p>`);
    }
    let body = m.body;
    if (act === 'edit') body = String(form.get('body') || '').replace(/\r\n/g, '\n').trim().slice(0, 6000);
    if (!body) return html('<p>The email can not be empty.</p>', 400);
    const at = act === 'edit' ? nextSendTime(new Date(), hour) : sendAt;
    await db.prepare("UPDATE welcome SET state = 'approved', body = ?, send_at = ? WHERE waitlist_id = ?").bind(body, at, id).run();
    if (act === 'now') { try { await run(env, url.origin); } catch (e) { console.log(String(e)); } }
    return html(`<p>Done. ${act === 'now' ? 'Sending to' : 'It will go to'} ${esc(m.name)}${act === 'now' ? ' now.' : ` on ${esc(label(at))}.`}</p>`);
  }
  const t = url.searchParams.get('t');
  if (act === 'edit') return html(`<p>Edit the email to ${esc(m.name)} (${esc(m.email)}). It will go ${esc(label(nextSendTime(new Date(), hour)))} after you save.</p><form method="post" action="/a?id=${id}&act=edit&t=${t}"><textarea name="body" rows="22" style="width:100%;font:16px/1.5 Georgia,serif">${esc(m.body)}</textarea><p><button style="padding:10px 18px;font-size:17px">Save and schedule</button></p></form>`);
  const ask = { send: `Send to ${esc(m.name)} (${esc(m.email)}) on ${esc(label(sendAt))}?`, now: `Send to ${esc(m.name)} (${esc(m.email)}) right now?`, skip: `Skip ${esc(m.name)}? Nothing will be sent.` }[act];
  return html(`<p>${ask}</p><form method="post" action="/a?id=${id}&act=${act}&t=${t}"><button style="padding:10px 18px;font-size:17px">Yes</button></form>`);
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(run(env, env.PUBLIC_URL || 'https://welcome.mydomesticchurch.org')); },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/a') return page(request, env);
    return html('<p>This is the welcome-email helper. Nothing to see here.</p>', 404);
  },
};
