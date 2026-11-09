// Waitlist sign-ups from the home page form.
// Needs a D1 database bound to this Pages project as WAITLIST (the table is made on first use).
// Optional email to Darwin for each new sign-up: add the secret RESEND_API_KEY (see below).
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
// The school_day column came later (Nov 2026). Older tables get it added here on first use,
// so nobody has to run anything by hand. Same change as migrate-waitlist-school-day.sql.
let schoolDayReady = false;
async function addSchoolDay(db) {
  if (schoolDayReady) return;
  const cols = await db.prepare('PRAGMA table_info(waitlist)').all();
  if (!(cols.results || []).some((c) => c.name === 'school_day')) {
    try { await db.prepare('ALTER TABLE waitlist ADD COLUMN school_day TEXT').run(); } catch { /* added by another request */ }
  }
  schoolDayReady = true;
}
const clean = (v, max) => String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

export async function onRequestPost({ request, env, waitUntil }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: 'Sorry, that did not go through. Please try again.' }, 400); }

  // Spam guard: a hidden field people never see, and a form filled in faster than a person could.
  if (d.website || Number(d.ms) < 1000) return json({ ok: true });

  const name = clean(d.name, 100), email = clean(d.email, 200).toLowerCase(), kids = clean(d.kids, 300), schoolDay = clean(d.school_day, 500);
  const updates = 1; // tester families agree to hear from us while testing
  const hopes = String(d.hopes || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').trim().slice(0, 1500);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Please fill in your name and a valid email." }, 400);

  if (!env.WAITLIST) return json({ error: 'The waitlist opens in a day or two. Until then, please write to Darwin at hello@mydomesticchurch.org.' }, 503);

  await env.WAITLIST.prepare(`CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    name TEXT NOT NULL, email TEXT NOT NULL, kids TEXT NOT NULL, hopes TEXT, updates INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'new', school_day TEXT)`).run();
  await addSchoolDay(env.WAITLIST);
  const dup = await env.WAITLIST.prepare('SELECT id FROM waitlist WHERE email = ?').bind(email).first();
  if (dup) {
    await env.WAITLIST.prepare('UPDATE waitlist SET name = ?, kids = ?, hopes = ?, updates = ?, school_day = ? WHERE id = ?').bind(name, kids, hopes, updates, schoolDay, dup.id).run();
    return json({ ok: true });
  }
  await env.WAITLIST.prepare('INSERT INTO waitlist (name, email, kids, hopes, updates, school_day) VALUES (?, ?, ?, ?, ?, ?)').bind(name, email, kids, hopes, updates, schoolDay).run();

  // Email to Darwin for each new sign-up, sent through Resend (free tier). Needs the secret
  // RESEND_API_KEY on this Pages project. Without a domain set up in Resend, the sender must be
  // onboarding@resend.dev and the email can only go to the Resend account's own address.
  if (env.RESEND_API_KEY) {
    const text = `A new family joined the tester waitlist.\n\nName: ${name}\nEmail: ${email}\nWho's at home: ${kids || '(nothing written)'}\nSchool day: ${schoolDay || '(nothing written)'}\n\nWhat they hope for:\n${hopes || '(nothing written)'}\n\nReply to this email to write to them.\n`;
    waitUntil(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: `Tester waitlist <${env.NOTIFY_FROM || 'onboarding@resend.dev'}>`,
        to: [env.NOTIFY_TO || 'darwin.sayo@gmail.com'],
        reply_to: email,
        subject: `New tester family: ${name.replace(/[\r\n]/g, ' ')}`,
        text,
      }),
    }).then(async r => { if (!r.ok) console.log('waitlist email failed', r.status, await r.text()); })
      .catch(e => console.log('waitlist email failed', String(e))));
  }
  return json({ ok: true });
}
