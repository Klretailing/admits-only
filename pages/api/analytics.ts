import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { prisma, ensureSchema } from '../../lib/db';
import { authOptions } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let events: any[];

  if (typeof req.body === 'string') {
    try { events = JSON.parse(req.body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  } else {
    events = req.body;
  }

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'Expected an array of events' });
  }

  await ensureSchema();

  const batch = events.slice(0, 100).filter((e) => e && typeof e === 'object');

  // Who the event belongs to comes from the session, never from the body:
  // a client-supplied userId let anyone mark any student as active, which
  // skewed the idle-reminder emails and the admin numbers.
  const session = await getServerSession(req, res, authOptions).catch(() => null);
  const userId: string | null = (session?.user as any)?.id || null;
  const when = (t: unknown) => { const d = new Date(typeof t === 'number' || typeof t === 'string' ? t : Date.now()); return Number.isNaN(d.getTime()) ? new Date() : d; };
  const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);

  try {
    await prisma.analyticsEvent.createMany({
      data: batch.map((evt: any) => ({
        type: String(evt.type || 'event').slice(0, 40),
        timestamp: when(evt.timestamp),
        path: String(evt.path || '/').slice(0, 300),
        sessionId: typeof evt.sessionId === 'string' ? evt.sessionId.slice(0, 80) : null,
        userId,
        referrer: typeof evt.referrer === 'string' ? evt.referrer.slice(0, 500) : null,
        meta: obj(evt.meta) as any,
        deviceInfo: obj(evt.deviceInfo) as any,
      })),
    });
  } catch {
    return res.status(500).json({ error: 'Failed to store events' });
  }

  return res.status(200).json({ ok: true, count: batch.length });
}
