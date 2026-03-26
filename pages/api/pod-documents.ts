import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureSchema();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(401).json({ error: 'User not found' });

  const { method } = req;

  /* ─── GET: List documents for a pod OR get a single document ─── */
  if (method === 'GET') {
    const { podId, documentId, action } = req.query;

    // Verify membership
    if (podId) {
      const membership = await (prisma as any).podMember.findUnique({
        where: { podId_userId: { podId: podId as string, userId: user.id } },
      });
      if (!membership) return res.status(403).json({ error: 'Not a member of this pod' });
    }

    // Get comments for a document
    if (action === 'comments' && documentId) {
      const comments = await (prisma as any).documentComment.findMany({
        where: { documentId: documentId as string, parentId: null },
        include: {
          user: { select: { id: true, name: true } },
          replies: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' as const },
          },
        },
        orderBy: { createdAt: 'desc' as const },
      });
      return res.json({ comments });
    }

    // Get single document with content
    if (documentId) {
      const doc = await (prisma as any).podDocument.findUnique({
        where: { id: documentId as string },
        include: {
          uploader: { select: { id: true, name: true } },
          comments: {
            where: { parentId: null },
            include: {
              user: { select: { id: true, name: true } },
              replies: {
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'asc' as const },
              },
            },
            orderBy: { createdAt: 'desc' as const },
          },
        },
      });
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      return res.json({ document: doc });
    }

    // List all documents for a pod (without fileData for performance)
    if (podId) {
      const documents = await (prisma as any).podDocument.findMany({
        where: { podId: podId as string },
        select: {
          id: true,
          podId: true,
          uploaderId: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          createdAt: true,
          updatedAt: true,
          uploader: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' as const },
      });
      return res.json({ documents });
    }

    return res.status(400).json({ error: 'podId is required' });
  }

  /* ─── POST: Upload document or add comment ─── */
  if (method === 'POST') {
    const { action } = req.body;

    // Upload a document
    if (action === 'upload') {
      const { podId, fileName, fileType, fileSize, content, fileData } = req.body;
      if (!podId || !fileName) return res.status(400).json({ error: 'Pod ID and file name are required' });

      // Verify membership
      const membership = await (prisma as any).podMember.findUnique({
        where: { podId_userId: { podId, userId: user.id } },
      });
      if (!membership) return res.status(403).json({ error: 'Not a member of this pod' });

      const doc = await (prisma as any).podDocument.create({
        data: {
          podId,
          uploaderId: user.id,
          fileName,
          fileType: fileType || 'txt',
          fileSize: fileSize || 0,
          content: content || '',
          fileData: fileData || '',
        },
        include: {
          uploader: { select: { id: true, name: true } },
        },
      });

      // Also post a message to the pod chat about the upload (store docId in essayId)
      await (prisma as any).podMessage.create({
        data: {
          podId,
          userId: user.id,
          content: `Uploaded a document: ${fileName}`,
          type: 'essay_share',
          essayId: doc.id,
        },
      });

      return res.json({ document: doc });
    }

    // Add a comment
    if (action === 'comment') {
      const { documentId, content, section, parentId } = req.body;
      if (!documentId || !content?.trim()) return res.status(400).json({ error: 'Document ID and content are required' });

      // Verify membership via document's pod
      const doc = await (prisma as any).podDocument.findUnique({
        where: { id: documentId },
        select: { podId: true },
      });
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      const membership = await (prisma as any).podMember.findUnique({
        where: { podId_userId: { podId: doc.podId, userId: user.id } },
      });
      if (!membership) return res.status(403).json({ error: 'Not a member of this pod' });

      const comment = await (prisma as any).documentComment.create({
        data: {
          documentId,
          userId: user.id,
          content: content.trim(),
          section: section || '',
          parentId: parentId || null,
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      return res.json({ comment });
    }

    // Update document content (inline editing)
    if (action === 'update') {
      const { documentId, content: newContent } = req.body;
      if (!documentId) return res.status(400).json({ error: 'Document ID is required' });

      const doc = await (prisma as any).podDocument.findUnique({
        where: { id: documentId },
        select: { podId: true, uploaderId: true },
      });
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      // Verify membership
      const membership = await (prisma as any).podMember.findUnique({
        where: { podId_userId: { podId: doc.podId, userId: user.id } },
      });
      if (!membership) return res.status(403).json({ error: 'Not a member of this pod' });

      const updated = await (prisma as any).podDocument.update({
        where: { id: documentId },
        data: { content: newContent || '' },
        include: { uploader: { select: { id: true, name: true } } },
      });

      return res.json({ document: updated });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  /* ─── DELETE: Remove document or comment ─── */
  if (method === 'DELETE') {
    const { documentId, commentId } = req.body;

    if (commentId) {
      // Only the comment author can delete
      const comment = await (prisma as any).documentComment.findUnique({
        where: { id: commentId },
      });
      if (!comment) return res.status(404).json({ error: 'Comment not found' });
      if (comment.userId !== user.id) return res.status(403).json({ error: 'Not your comment' });

      await (prisma as any).documentComment.delete({ where: { id: commentId } });
      return res.json({ success: true });
    }

    if (documentId) {
      // Only the uploader can delete
      const doc = await (prisma as any).podDocument.findUnique({
        where: { id: documentId },
      });
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      if (doc.uploaderId !== user.id) return res.status(403).json({ error: 'Only the uploader can delete this document' });

      await (prisma as any).podDocument.delete({ where: { id: documentId } });
      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'documentId or commentId is required' });
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: `Method ${method} not allowed` });
}
