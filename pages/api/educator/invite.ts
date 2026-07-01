import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'educator') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const educatorId = (session.user as any).id;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ error: 'studentId is required' });

  try {
    await ensureSchema();

    // Confirm the roster row belongs to this educator
    const rows: any[] = await prisma.$queryRaw`
      SELECT "id", "inviteStatus", "inviteToken", "invitedAt"
      FROM "educator_students"
      WHERE "id" = ${studentId} AND "educatorId" = ${educatorId}
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    const row = rows[0];
    if (row.inviteStatus === 'active') {
      return res.status(400).json({ error: 'Student is already on the platform' });
    }

    // Reuse existing token so the link stays stable; otherwise generate one
    const token: string = row.inviteToken || crypto.randomBytes(16).toString('hex');
    const invitedAt = new Date();

    await prisma.$executeRaw`
      UPDATE "educator_students"
      SET "inviteToken" = ${token}, "inviteStatus" = 'invited', "invitedAt" = ${invitedAt}
      WHERE "id" = ${studentId} AND "educatorId" = ${educatorId}
    `;

    return res.json({ token, inviteStatus: 'invited', invitedAt: invitedAt.toISOString() });
  } catch (e: any) {
    console.error('Invite error:', e.message);
    return res.status(500).json({ error: 'Failed to create invite' });
  }
}
