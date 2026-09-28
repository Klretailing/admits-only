import type { NextApiRequest, NextApiResponse } from 'next';
import { ensureSchema } from '../../../lib/db';
import { checkResetToken, consumeResetToken } from '../../../lib/passwordReset';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await ensureSchema();

    // GET ?token= — lets the page say "this link expired" before the student
    // bothers typing a new password.
    if (req.method === 'GET') {
      const valid = await checkResetToken(String(req.query.token || ''));
      return res.status(200).json({ valid });
    }

    if (req.method === 'POST') {
      const { token, password } = req.body || {};
      const result = await consumeResetToken(String(token || ''), password);
      if (result === 'weak_password') {
        return res.status(400).json({ error: 'Please use at least 8 characters.' });
      }
      if (result === 'invalid') {
        return res.status(400).json({ error: 'This reset link has expired or was already used. Request a new one below.', expired: true });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('Reset password error:', (e as Error).message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
