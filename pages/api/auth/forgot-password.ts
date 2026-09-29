import type { NextApiRequest, NextApiResponse } from 'next';
import { ensureSchema } from '../../../lib/db';
import { issueResetToken, RESET_MINUTES } from '../../../lib/passwordReset';
import { sendPasswordResetEmail } from '../../../lib/email';

const APP_URL = process.env.NEXTAUTH_URL || 'https://admitsonly.com';

/* Always the same answer, whatever happened, so this endpoint cannot be used
   to discover which emails have accounts. */
const GENERIC = {
  ok: true,
  message: 'If an account exists for that email, a reset link is on its way. It can take a minute or two to arrive.',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    await ensureSchema();
    const result = await issueResetToken(email);
    if (result.status === 'issued') {
      const sent = await sendPasswordResetEmail({
        to: result.user.email,
        name: result.user.name,
        resetUrl: `${APP_URL}/auth/reset-password?token=${encodeURIComponent(result.token)}`,
        minutesValid: RESET_MINUTES,
      });
      // Logged server-side only: the user still gets the generic reply.
      if (sent !== 'sent') console.error(`Password reset email not sent: ${sent}`);
    }
  } catch (e) {
    console.error('Forgot password error:', (e as Error).message);
  }
  return res.status(200).json(GENERIC);
}
