import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma, ensureSchema } from '../../lib/db';

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

  const batch = events.slice(0, 100);

  try {
    await prisma.analyticsEvent.createMany({
      data: batch.map((evt: any) => ({
        type: String(evt.type || 'event'),
        timestamp: new Date(evt.timestamp || Date.now()),
        path: String(evt.path || '/'),
        sessionId: evt.sessionId || null,
        userId: evt.userId || null,
        referrer: evt.referrer || null,
        meta: evt.meta || null,
        deviceInfo: evt.deviceInfo || null,
      })),
    });
  } catch {
    return res.status(500).json({ error: 'Failed to store events' });
  }

  return res.status(200).json({ ok: true, count: batch.length });
}
