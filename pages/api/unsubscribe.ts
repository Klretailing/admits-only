import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyUnsubToken, setPrefs, ensureEmailSchema, type EmailKind } from '../../lib/email';

/* One-click unsubscribe. Deliberately requires no login: a student who wants
   these emails to stop should not have to remember a password to make that
   happen. The token is an HMAC of the user id, so the link cannot be guessed
   or used to unsubscribe anyone else. */

const KIND_TO_PREF: Record<string, 'essayFeedback' | 'deadlineReminders' | 'weeklyDigest'> = {
  essay_feedback: 'essayFeedback',
  deadline_reminder: 'deadlineReminders',
  weekly_digest: 'weeklyDigest',
};

const LABEL: Record<string, string> = {
  essay_feedback: 'essay feedback emails',
  deadline_reminder: 'deadline reminders',
  weekly_digest: 'the weekly catch-up',
};

function page(title: string, message: string): string {
  return `<!doctype html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
  <body style="margin:0;background:#faf8f5;font:400 15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1a17;">
    <div style="max-width:460px;margin:14vh auto;padding:30px;background:#fff;border:1px solid #eae5dd;border-radius:14px;">
      <p style="margin:0 0 14px;font-weight:600;color:#5457dd;">AdmitsOnly</p>
      <h1 style="margin:0 0 10px;font-size:20px;">${title}</h1>
      <p style="margin:0;color:#4a4640;">${message}</p>
    </div>
  </body></html>`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const u = String(req.query.u || '');
  const t = String(req.query.t || '');
  const k = String(req.query.k || '');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (!u || !t || !verifyUnsubToken(u, t)) {
    return res.status(400).send(page('That link did not work', 'It may have expired or been copied incompletely. You can change email settings any time from Settings in your dashboard.'));
  }

  const pref = KIND_TO_PREF[k];
  try {
    await ensureEmailSchema();
    if (pref) {
      await setPrefs(u, { [pref]: false } as any);
      return res.status(200).send(page('Done — those are off', `You will not get ${LABEL[k] || 'those emails'} any more. Everything else stays as it was, and you can turn them back on in Settings whenever you like.`));
    }
    await setPrefs(u, { essayFeedback: false, deadlineReminders: false, weeklyDigest: false });
    return res.status(200).send(page('Done — all emails off', 'You will not get any more email from us. You can turn them back on in Settings whenever you like.'));
  } catch {
    return res.status(500).send(page('Something went wrong', 'Please try again in a moment, or change your email settings from the dashboard.'));
  }
}
