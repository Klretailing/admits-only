import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !['educator','admin'].includes((session.user as any).role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;
  const studentId = req.query.id as string;
  const { text } = req.body;

  if (!text?.trim()) return res.status(400).json({ error: 'Note text is required' });

  const student = await prisma.educatorStudent.findFirst({
    where: { id: studentId, educatorId: userId },
  });
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const existingNotes = (student.notes as any[]) || [];
  const newNote = {
    id: `note_${Date.now()}`,
    text: text.trim(),
    date: new Date().toISOString(),
  };

  const updated = await prisma.educatorStudent.update({
    where: { id: studentId },
    data: { notes: [...existingNotes, newNote] },
  });

  return res.json({ student: { ...updated, tags: updated.tags as string[], notes: updated.notes as any[] } });
}
