// Waitlist sign-ups from the home page form.
// Needs a D1 database bound to this Pages project as WAITLIST (the table is made on first use).
// Optional email to Darwin for each sign-up: a "Send email" binding named SEND_EMAIL (Cloudflare
// Email Routing on mydomesticchurch.org) plus the variables NOTIFY_TO (his address) and
// NOTIFY_FROM (an address on the domain, e.g. waitlist@mydomesticchurch.org).
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const clean = (v, max) => String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: 'Sorry, that did not go through. Please try again.' }, 400); }

  // Spam guard: a hidden field people never see, and a form filled in faster than a person could.
  if (d.website || Number(d.ms) < 1000) return json({ ok: true });

  const name = clean(d.name, 100), email = clean(d.email, 200).toLowerCase(), kids = clean(d.kids, 300);
  const updates = d.updates === true ? 1 : 0;
  const hopes = String(d.hopes || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').trim().slice(0, 1500);
  if (!name || !kids || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Please fill in your name, a valid email and your children's ages." }, 400);

  if (!env.WAITLIST) return json({ error: 'The waitlist opens in a day or two. Until then, please write to Darwin at darwin.sayo@gmail.com.' }, 503);

  await env.WAITLIST.prepare(`CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    name TEXT NOT NULL, email TEXT NOT NULL, kids TEXT NOT NULL, hopes TEXT, updates INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'new')`).run();
  const dup = await env.WAITLIST.prepare('SELECT id FROM waitlist WHERE email = ?').bind(email).first();
  if (dup) {
    await env.WAITLIST.prepare('UPDATE waitlist SET name = ?, kids = ?, hopes = ?, updates = ? WHERE id = ?').bind(name, kids, hopes, updates, dup.id).run();
    return json({ ok: true });
  }
  await env.WAITLIST.prepare('INSERT INTO waitlist (name, email, kids, hopes, updates) VALUES (?, ?, ?, ?, ?)').bind(name, email, kids, hopes, updates).run();

  if (env.SEND_EMAIL && env.NOTIFY_TO && env.NOTIFY_FROM) {
    try {
      const { EmailMessage } = await import('cloudflare:email');
      const body = `New waitlist family\n\nName: ${name}\nEmail: ${email}\nChildren: ${kids}\nUpdates: ${updates ? 'yes' : 'no'}\n\nHopes:\n${hopes || '(none)'}\n`;
      const raw = [
        `From: My Domestic Church waitlist <${env.NOTIFY_FROM}>`,
        `To: ${env.NOTIFY_TO}`,
        `Reply-To: ${email}`,
        `Subject: New waitlist family: ${name.replace(/[\r\n]/g, ' ')}`,
        `Message-ID: <${crypto.randomUUID()}@mydomesticchurch.org>`,
        `Date: ${new Date().toUTCString()}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        '',
        body,
      ].join('\r\n');
      await env.SEND_EMAIL.send(new EmailMessage(env.NOTIFY_FROM, env.NOTIFY_TO, raw));
    } catch (e) { console.log('waitlist email failed', String(e)); }
  }
  return json({ ok: true });
}
