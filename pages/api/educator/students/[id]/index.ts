import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'educator') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;
  const studentId = req.query.id as string;

  // Verify ownership
  const student = await prisma.educatorStudent.findFirst({
    where: { id: studentId, educatorId: userId },
  });
  if (!student) return res.status(404).json({ error: 'Student not found' });

  if (req.method === 'PATCH') {
    const { status, tags, studentName, studentEmail } = req.body;
    const data: any = {};
    if (status) data.status = status;
    if (tags) data.tags = tags;
    if (studentName) data.studentName = studentName;
    if (studentEmail !== undefined) data.studentEmail = studentEmail;

    const updated = await prisma.educatorStudent.update({
      where: { id: studentId },
      data,
    });
    return res.json({ student: { ...updated, tags: updated.tags as string[], notes: updated.notes as any[] } });
  }

  if (req.method === 'DELETE') {
    await prisma.educatorStudent.delete({ where: { id: studentId } });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
