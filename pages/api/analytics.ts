import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const events = req.body;

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'Expected an array of events' });
  }

  // Cap at 100 events per request to prevent abuse
  const batch = events.slice(0, 100);

  await prisma.analyticsEvent.createMany({
    data: batch.map((evt: any) => ({
      type: String(evt.type || 'event'),
      timestamp: new Date(evt.timestamp || Date.now()),
      path: String(evt.path || '/'),
      referrer: evt.referrer || null,
      meta: evt.meta || null,
    })),
  });

  return res.status(200).json({ ok: true, count: batch.length });
}
