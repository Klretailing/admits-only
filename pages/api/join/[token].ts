import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma, ensureSchema } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invalid invite link' });
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
