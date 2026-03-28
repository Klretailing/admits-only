import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  await ensureSchema();
  const userId = (session.user as any).id as string;

  // GET — list all essay documents
  if (req.method === 'GET') {
    const docs = await prisma.essayDocument.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        collegeName: true,
        prompt: true,
        fileType: true,
        studentGpa: true,
        studentSat: true,
        studentState: true,
        studentECs: true,
        studentAwards: true,
        isFree: true,
        priceInCents: true,
        published: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return res.json({ documents: docs });
  }

  // POST — create new essay document
  if (req.method === 'POST') {
    const {
      title, collegeName, prompt, content, fileData, fileType,
      studentGpa, studentSat, studentState, studentECs, studentAwards,
      isFree, priceInCents, published,
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const doc = await prisma.essayDocument.create({
      data: {
        title: title.trim(),
        collegeName: (collegeName || '').trim(),
        prompt: (prompt || '').trim(),
        content: (content || '').trim(),
        fileData: fileData || '',
        fileType: fileType || 'text',
        studentGpa: (studentGpa || '').trim(),
        studentSat: (studentSat || '').trim(),
        studentState: (studentState || '').trim(),
        studentECs: (studentECs || '').trim(),
        studentAwards: (studentAwards || '').trim(),
        isFree: isFree !== false,
        priceInCents: parseInt(priceInCents) || 0,
        published: published !== false,
        uploadedById: userId,
      },
    });
    return res.status(201).json({ document: doc });
  }

  // PUT — update essay document
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'Document ID is required' });

    const existing = await prisma.essayDocument.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    const data: Record<string, any> = {};
    if (updates.title != null) data.title = updates.title.trim();
    if (updates.collegeName != null) data.collegeName = updates.collegeName.trim();
    if (updates.prompt != null) data.prompt = updates.prompt.trim();
    if (updates.content != null) data.content = updates.content.trim();
    if (updates.fileData != null) data.fileData = updates.fileData;
    if (updates.fileType != null) data.fileType = updates.fileType;
    if (updates.studentGpa != null) data.studentGpa = updates.studentGpa.trim();
    if (updates.studentSat != null) data.studentSat = updates.studentSat.trim();
    if (updates.studentState != null) data.studentState = updates.studentState.trim();
    if (updates.studentECs != null) data.studentECs = updates.studentECs.trim();
    if (updates.studentAwards != null) data.studentAwards = updates.studentAwards.trim();
    if (updates.isFree != null) data.isFree = updates.isFree;
    if (updates.priceInCents != null) data.priceInCents = parseInt(updates.priceInCents) || 0;
    if (updates.published != null) data.published = updates.published;

    const doc = await prisma.essayDocument.update({ where: { id }, data });
    return res.json({ document: doc });
  }

  // DELETE — remove essay document
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Document ID is required' });

    const existing = await prisma.essayDocument.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    await prisma.essayDocument.delete({ where: { id } });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
