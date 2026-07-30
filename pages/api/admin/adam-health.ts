import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { getAIClient } from '../../../lib/ai';

/* ──────────────────────────────────────────────────────────────────────
   ADAM HEALTH CHECK (admin-only)

   Runs a real, minimal request against the Anthropic API and reports the
   exact reason Adam is or isn't working — so an admin can self-diagnose a
   misconfigured key / billing without reading server logs.

   Statuses:
     connected   — key present, a live call succeeded. Adam works.
     no_key      — ANTHROPIC_API_KEY is not set in this environment.
     invalid_key — a key is set but Anthropic rejected it (typo / revoked).
     billing     — key is valid but the Anthropic account has no credit.
     rate_limited— key works but is currently rate limited (temporary).
     error       — some other failure (message included).
   ────────────────────────────────────────────────────────────────────── */

const ADAM_MODEL = process.env.ADAM_MODEL || 'claude-haiku-4-5';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 1. Is a key even present?
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({
      status: 'no_key',
      title: 'No API key found',
      detail:
        'ANTHROPIC_API_KEY is not set in this environment. Add it in Vercel → your project → Settings → Environment Variables (name it exactly ANTHROPIC_API_KEY, apply to Production), then redeploy.',
      model: ADAM_MODEL,
    });
  }

  // 2. Key is present — make a tiny live call to prove it actually works.
  const client = getAIClient();
  if (!client) {
    return res.json({
      status: 'no_key',
      title: 'No API key found',
      detail: 'The Anthropic client could not be created — the key appears to be missing.',
      model: ADAM_MODEL,
    });
  }

  try {
    await client.messages.create({
      model: ADAM_MODEL,
      max_tokens: 4,
      messages: [{ role: 'user', content: 'ping' }],
    });
    return res.json({
      status: 'connected',
      title: 'Adam is connected',
      detail: `A live test message to ${ADAM_MODEL} succeeded. Adam is working.`,
      model: ADAM_MODEL,
    });
  } catch (e: any) {
    const msg = (e?.message || String(e)).toLowerCase();
    const httpStatus = e?.status;

    if (msg.includes('credit balance') || msg.includes('billing')) {
      return res.json({
        status: 'billing',
        title: 'Billing / no credit',
        detail:
          'Your key is valid, but the Anthropic account has no available credit. Add a payment method or buy credits at console.anthropic.com → Billing, then try again.',
        model: ADAM_MODEL,
      });
    }
    if (httpStatus === 401 || msg.includes('authentication') || msg.includes('invalid x-api-key') || msg.includes('invalid_api_key')) {
      return res.json({
        status: 'invalid_key',
        title: 'API key rejected',
        detail:
          'A key is set, but Anthropic rejected it. It was likely copied incorrectly or has been revoked. Create a fresh key at console.anthropic.com → API keys, update it in Vercel, and redeploy.',
        model: ADAM_MODEL,
      });
    }
    if (httpStatus === 429 || msg.includes('rate limit')) {
      return res.json({
        status: 'rate_limited',
        title: 'Temporarily rate limited',
        detail: 'Your key works, but it is currently rate limited. This is temporary — wait a minute and test again.',
        model: ADAM_MODEL,
      });
    }
    if (httpStatus === 404 || msg.includes('model')) {
      return res.json({
        status: 'error',
        title: 'Model unavailable',
        detail: `The model "${ADAM_MODEL}" was not accepted by this account. ${e?.message || ''}`.trim(),
        model: ADAM_MODEL,
      });
    }
    return res.json({
      status: 'error',
      title: 'Connection failed',
      detail: e?.message || 'An unexpected error occurred while contacting Anthropic.',
      model: ADAM_MODEL,
    });
  }
}
