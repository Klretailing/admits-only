import { createHmac } from 'crypto';
import { prisma } from './db';

/* ══════════════════════════════════════════════════════════════════════
   EMAIL

   The product previously had no way to reach a student who was not already
   looking at it: a tutor could return essay feedback and the student would
   never find out unless they happened to log in. This is that missing layer.

   Three rules shape everything here:

     1. NEVER SEND TWICE. Every send is written to email_log with a dedupe
        key, and the key is checked first. A cron that runs daily must not
        re-send yesterday's reminder because the job was retried.
     2. NEVER SEND NOTHING. If a digest has no real content, it is skipped.
        Silence is better than a weekly "you have 0 updates" email, which
        teaches people to ignore us.
     3. ALWAYS UNSUBSCRIBABLE. Every email carries a one-click link that
        works without logging in. These are teenagers under real stress;
        making them hunt through settings to stop emails is not acceptable.
   ══════════════════════════════════════════════════════════════════════ */

const FROM = 'AdmitsOnly <hello@admitsonly.com>';
/* Overridable so the send path can be exercised end to end against a local
   capture server. Anything that mails minors should be testable without
   putting real mail on the wire. */
const RESEND_URL = process.env.RESEND_BASE_URL || 'https://api.resend.com/emails';
const APP_URL = process.env.NEXTAUTH_URL || 'https://admitsonly.com';

export type EmailKind = 'essay_feedback' | 'deadline_reminder' | 'weekly_digest';

export interface EmailPrefs {
  essayFeedback: boolean;
  deadlineReminders: boolean;
  weeklyDigest: boolean;
}

const DEFAULT_PREFS: EmailPrefs = { essayFeedback: true, deadlineReminders: true, weeklyDigest: true };

const PREF_COLUMN: Record<EmailKind, keyof EmailPrefs> = {
  essay_feedback: 'essayFeedback',
  deadline_reminder: 'deadlineReminders',
  weekly_digest: 'weeklyDigest',
};

export function unsubToken(userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production';
  return createHmac('sha256', secret).update(`unsub:${userId}`).digest('hex').slice(0, 32);
}

export function verifyUnsubToken(userId: string, token: string): boolean {
  const expected = unsubToken(userId);
  // Constant-length compare; both are fixed-width hex so a simple === is fine.
  return token.length === expected.length && token === expected;
}

export async function ensureEmailSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "email_preferences" (
      "userId"            TEXT PRIMARY KEY,
      "essayFeedback"     BOOLEAN NOT NULL DEFAULT true,
      "deadlineReminders" BOOLEAN NOT NULL DEFAULT true,
      "weeklyDigest"      BOOLEAN NOT NULL DEFAULT true,
      "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "email_log" (
      "id"        TEXT PRIMARY KEY,
      "userId"    TEXT NOT NULL,
      "kind"      TEXT NOT NULL,
      "dedupeKey" TEXT NOT NULL,
      "sentAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "email_log_dedupe" ON "email_log"("userId","kind","dedupeKey")`);
}

export async function getPrefs(userId: string): Promise<EmailPrefs> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT "essayFeedback", "deadlineReminders", "weeklyDigest"
        FROM "email_preferences" WHERE "userId" = ${userId}`;
    if (!rows[0]) return DEFAULT_PREFS;
    return {
      essayFeedback: rows[0].essayFeedback !== false,
      deadlineReminders: rows[0].deadlineReminders !== false,
      weeklyDigest: rows[0].weeklyDigest !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function setPrefs(userId: string, prefs: Partial<EmailPrefs>): Promise<void> {
  await ensureEmailSchema();
  const cur = await getPrefs(userId);
  const next = { ...cur, ...prefs };
  await prisma.$executeRaw`
    INSERT INTO "email_preferences" ("userId","essayFeedback","deadlineReminders","weeklyDigest","updatedAt")
    VALUES (${userId}, ${next.essayFeedback}, ${next.deadlineReminders}, ${next.weeklyDigest}, CURRENT_TIMESTAMP)
    ON CONFLICT ("userId") DO UPDATE
      SET "essayFeedback" = EXCLUDED."essayFeedback",
          "deadlineReminders" = EXCLUDED."deadlineReminders",
          "weeklyDigest" = EXCLUDED."weeklyDigest",
          "updatedAt" = CURRENT_TIMESTAMP`;
}

/* ─── template ───
   Inline styles and table layout only: email clients strip <style> blocks and
   most have no usable flexbox or grid support. Warm, plain, and short — this
   lands next to a student's friends and their school, not in a work inbox. */
function shell(opts: {
  preheader: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  footerNote: string;
  unsubHref: string;
}): string {
  const { preheader, heading, body, ctaLabel, ctaHref, footerNote, unsubHref } = opts;
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf8f5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #eae5dd;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:26px 30px 0;">
          <p style="margin:0;font:600 15px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#5457dd;">AdmitsOnly</p>
        </td></tr>
        <tr><td style="padding:18px 30px 0;">
          <h1 style="margin:0;font:700 21px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1a17;">${heading}</h1>
        </td></tr>
        <tr><td style="padding:12px 30px 0;font:400 15px/1.65 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#4a4640;">
          ${body}
        </td></tr>
        ${ctaLabel && ctaHref ? `
        <tr><td style="padding:22px 30px 0;">
          <a href="${ctaHref}" style="display:inline-block;background:#5457dd;color:#ffffff;text-decoration:none;font:600 15px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;padding:13px 22px;border-radius:10px;">${ctaLabel}</a>
        </td></tr>` : ''}
        <tr><td style="padding:26px 30px 28px;">
          <p style="margin:0;font:400 13px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#8a8279;">${footerNote}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font:400 12px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#a29a90;max-width:520px;">
        <a href="${unsubHref}" style="color:#a29a90;text-decoration:underline;">Turn off these emails</a>
        &nbsp;·&nbsp; You are getting this because you have an AdmitsOnly account.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

/* ─── send ─── */

interface SendArgs {
  userId: string;
  to: string;
  kind: EmailKind;
  dedupeKey: string;
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  footerNote: string;
}

export type SendResult = 'sent' | 'duplicate' | 'opted_out' | 'not_configured' | 'failed';

export async function sendEmail(a: SendArgs): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return 'not_configured';

  await ensureEmailSchema();

  // Respect the student's choice before doing anything else.
  const prefs = await getPrefs(a.userId);
  if (!prefs[PREF_COLUMN[a.kind]]) return 'opted_out';

  // Claim the dedupe key first. If the insert conflicts, someone (or a retry
  // of this same job) already sent it — bail before hitting the API.
  try {
    const claimed: any[] = await prisma.$queryRaw`
      INSERT INTO "email_log" ("id","userId","kind","dedupeKey")
      VALUES (${`el_${a.userId}_${a.kind}_${a.dedupeKey}`.slice(0, 190)}, ${a.userId}, ${a.kind}, ${a.dedupeKey})
      ON CONFLICT ("userId","kind","dedupeKey") DO NOTHING
      RETURNING "id"`;
    if (claimed.length === 0) return 'duplicate';
  } catch {
    return 'failed';
  }

  const unsubHref = `${APP_URL}/api/unsubscribe?u=${encodeURIComponent(a.userId)}&t=${unsubToken(a.userId)}&k=${a.kind}`;
  const html = shell({
    preheader: a.preheader,
    heading: a.heading,
    body: a.body,
    ctaLabel: a.ctaLabel,
    ctaHref: a.ctaHref,
    footerNote: a.footerNote,
    unsubHref,
  });

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [a.to], subject: a.subject, html }),
    });
    if (!res.ok) {
      // Release the claim so a later run can legitimately retry.
      await prisma.$executeRaw`
        DELETE FROM "email_log" WHERE "userId" = ${a.userId} AND "kind" = ${a.kind} AND "dedupeKey" = ${a.dedupeKey}`;
      return 'failed';
    }
    return 'sent';
  } catch {
    await prisma.$executeRaw`
      DELETE FROM "email_log" WHERE "userId" = ${a.userId} AND "kind" = ${a.kind} AND "dedupeKey" = ${a.dedupeKey}`.catch(() => {});
    return 'failed';
  }
}

/* ══════════════════════════════════════════════════════════════════════
   THE THREE EMAILS

   Written to sound like a person who is on the student's side. Short,
   specific, no exclamation-mark cheerleading, and never implying they are
   behind or failing.
   ══════════════════════════════════════════════════════════════════════ */

const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || 'there';

export async function sendEssayFeedbackEmail(args: {
  userId: string; to: string; name?: string | null; essayTitle: string; reviewId: string;
}): Promise<SendResult> {
  return sendEmail({
    userId: args.userId,
    to: args.to,
    kind: 'essay_feedback',
    dedupeKey: args.reviewId,
    subject: `Your feedback on "${args.essayTitle}" is ready`,
    preheader: 'Your tutor left notes on your essay.',
    heading: `Your feedback is ready, ${firstName(args.name)}`,
    body: `<p style="margin:0 0 14px;">Your tutor has finished reading <strong>${escapeHtml(args.essayTitle)}</strong> and left their notes.</p>
           <p style="margin:0;">Take your time with it — there is no rush, and you can reply in the essay if anything is unclear.</p>`,
    ctaLabel: 'Read the feedback',
    ctaHref: `${APP_URL}/dashboard/essays`,
    footerNote: 'Feedback is meant to make the next draft easier, not to grade you.',
  });
}

export async function sendDeadlineEmail(args: {
  userId: string; to: string; name?: string | null;
  schools: { name: string; days: number; remaining: number }[];
  dedupeKey: string;
}): Promise<SendResult> {
  const soonest = args.schools[0];
  const list = args.schools.map(s => {
    const when = s.days === 0 ? 'today' : s.days === 1 ? 'tomorrow' : `in ${s.days} days`;
    const left = s.remaining > 0 ? ` — ${s.remaining} task${s.remaining === 1 ? '' : 's'} left` : ' — everything ticked off';
    return `<li style="margin:0 0 6px;"><strong>${escapeHtml(s.name)}</strong> is due ${when}${left}</li>`;
  }).join('');

  return sendEmail({
    userId: args.userId,
    to: args.to,
    kind: 'deadline_reminder',
    dedupeKey: args.dedupeKey,
    subject: args.schools.length === 1
      ? `${soonest.name} is due ${soonest.days === 0 ? 'today' : soonest.days === 1 ? 'tomorrow' : `in ${soonest.days} days`}`
      : `${args.schools.length} deadlines coming up`,
    preheader: 'A quick heads-up on what is due soon.',
    heading: `A heads-up, ${firstName(args.name)}`,
    body: `<p style="margin:0 0 14px;">Just so nothing sneaks up on you:</p>
           <ul style="margin:0 0 14px;padding-left:20px;">${list}</ul>
           <p style="margin:0;">If you have already handled these, ignore this — your tracker just has not caught up yet.</p>`,
    ctaLabel: 'Open your tracker',
    ctaHref: `${APP_URL}/dashboard/progress`,
    footerNote: 'One nudge per school, and only once. We will not keep pestering you about the same deadline.',
  });
}

export async function sendWeeklyDigestEmail(args: {
  userId: string; to: string; name?: string | null;
  items: string[]; weekKey: string;
}): Promise<SendResult> {
  // Rule 2: never send an empty digest.
  if (args.items.length === 0) return 'duplicate';
  const list = args.items.map(i => `<li style="margin:0 0 6px;">${i}</li>`).join('');
  return sendEmail({
    userId: args.userId,
    to: args.to,
    kind: 'weekly_digest',
    dedupeKey: args.weekKey,
    subject: 'Your week on AdmitsOnly',
    preheader: 'A short catch-up on what moved.',
    heading: `Here is your week, ${firstName(args.name)}`,
    body: `<p style="margin:0 0 14px;">A quick catch-up on what happened:</p>
           <ul style="margin:0 0 14px;padding-left:20px;">${list}</ul>
           <p style="margin:0;">Even a small step this week counts. See you when you are ready.</p>`,
    ctaLabel: 'Pick up where you left off',
    ctaHref: `${APP_URL}/dashboard`,
    footerNote: 'We only send this when something actually happened — never just to fill an inbox.',
  });
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
