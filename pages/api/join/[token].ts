import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { prisma, ensureSchema } from '../../../lib/db';
import { authOptions } from '../../../lib/auth';
import { linkInvite } from '../../../lib/invites';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invalid invite link' });
  }

  // POST: a signed-in student accepts the invite with their existing account.
  if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions);
    const user = session?.user as any;
    if (!user?.id) return res.status(401).json({ error: 'Please sign in first' });
    if (user.role !== 'student') return res.status(403).json({ error: 'Invites are for student accounts' });
    await ensureSchema();
    const ok = await linkInvite(token, user.id, user.name || '', user.email || '');
    if (!ok) return res.status(410).json({ error: 'This invite has already been used or is no longer valid' });
    return res.json({ ok: true });
  }

  try {
    await ensureSchema();

    const rows: any[] = await prisma.$queryRaw`
      SELECT es."studentName", es."studentEmail", es."inviteStatus", u."name" AS "tutorName"
      FROM "educator_students" es
      JOIN "users" u ON u."id" = es."educatorId"
      WHERE es."inviteToken" = ${token}
    `;

    if (rows.length === 0) {
      return res.status(404).json({ error: 'This invite link is no longer valid' });
    }

    const row = rows[0];
    if (row.inviteStatus === 'active') {
      return res.status(410).json({ error: 'This invite has already been used' });
    }

    return res.json({
      tutorName: row.tutorName || 'Your tutor',
      studentName: row.studentName || '',
      studentEmail: row.studentEmail || '',
    });
  } catch (e: any) {
    console.error('Join lookup error:', e.message);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
