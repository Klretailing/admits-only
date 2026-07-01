import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'educator') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;

  if (req.method === 'GET') {
    try {
      const students = await prisma.educatorStudent.findMany({
        where: { educatorId: userId },
        orderBy: { createdAt: 'desc' },
      });

      // Invite columns live outside the Prisma model (added via raw SQL) — fetch and merge them
      const inviteRows: any[] = await prisma.$queryRaw`
        SELECT "id", "inviteStatus", "inviteToken", "linkedUserId"
        FROM "educator_students"
        WHERE "educatorId" = ${userId}
      `;
      const inviteMap = new Map(inviteRows.map(r => [r.id, r]));

      return res.json({
        students: students.map(s => {
          const inv = inviteMap.get(s.id) || {};
          return {
            ...s,
            tags: s.tags as string[],
            notes: s.notes as any[],
            inviteStatus: inv.inviteStatus || 'none',
            inviteToken: inv.inviteToken || null,
            linkedUserId: inv.linkedUserId || null,
          };
        }),
      });
    } catch (e) {
      console.error('Fetch students error:', (e as Error).message);
      return res.json({ students: [] });
    }
  }

  if (req.method === 'POST') {
    const { studentName, studentEmail, tags } = req.body;
    if (!studentName) return res.status(400).json({ error: 'Student name is required' });

    try {
      const student = await prisma.educatorStudent.create({
        data: {
          educatorId: userId,
          studentName,
          studentEmail: studentEmail || '',
          tags: tags || [],
          notes: [],
        },
      });
      return res.status(201).json({ student: { ...student, tags: student.tags as string[], notes: student.notes as any[] } });
    } catch (e: any) {
      console.error('Add student error:', e.message);
      return res.status(500).json({ error: 'Failed to add student' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
