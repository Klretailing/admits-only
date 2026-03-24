import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureSchema();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(401).json({ error: 'User not found' });

  const { method } = req;

  /* ─── GET: List sessions for a pod ─── */
  if (method === 'GET') {
    const { podId, sessionId } = req.query;

    if (!podId) return res.status(400).json({ error: 'podId is required' });

    // Verify membership
    const membership = await (prisma as any).podMember.findUnique({
      where: { podId_userId: { podId: podId as string, userId: user.id } },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this pod' });

    // Get single session
    if (sessionId) {
      const s = await (prisma as any).podStudySession.findUnique({
        where: { id: sessionId as string },
        include: {
          creator: { select: { id: true, name: true } },
          participants: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { joinedAt: 'asc' as const },
          },
        },
      });
      if (!s) return res.status(404).json({ error: 'Session not found' });
      return res.json({ session: s });
    }

    // List sessions for pod (active + recent)
    const sessions = await (prisma as any).podStudySession.findMany({
      where: { podId: podId as string },
      include: {
        creator: { select: { id: true, name: true } },
        participants: {
          include: { user: { select: { id: true, name: true } } },
        },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' as const },
      take: 20,
    });
    return res.json({ sessions });
  }

  /* ─── POST: Create, join, start, complete session ─── */
  if (method === 'POST') {
    const { action, podId, sessionId, title, focusDuration, breakDuration, rounds, goal } = req.body;

    // Create a new focus session
    if (action === 'create') {
      if (!podId) return res.status(400).json({ error: 'podId is required' });

      const membership = await (prisma as any).podMember.findUnique({
        where: { podId_userId: { podId, userId: user.id } },
      });
      if (!membership) return res.status(403).json({ error: 'Not a member of this pod' });

      const s = await (prisma as any).podStudySession.create({
        data: {
          podId,
          creatorId: user.id,
          title: title || 'Focus Session',
          focusDuration: focusDuration || 25,
          breakDuration: breakDuration || 5,
          rounds: rounds || 4,
        },
        include: {
          creator: { select: { id: true, name: true } },
          participants: true,
        },
      });

      // Auto-join creator
      await (prisma as any).sessionParticipant.create({
        data: {
          sessionId: s.id,
          userId: user.id,
          goal: goal || '',
        },
      });

      // Post message about new session
      await (prisma as any).podMessage.create({
        data: {
          podId,
          userId: user.id,
          content: `Started a focus session: "${title || 'Focus Session'}" (${focusDuration || 25}min focus / ${breakDuration || 5}min break x${rounds || 4} rounds)`,
          type: 'discussion',
        },
      });

      return res.json({ session: s });
    }

    // Join a session
    if (action === 'join') {
      if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

      const s = await (prisma as any).podStudySession.findUnique({ where: { id: sessionId } });
      if (!s) return res.status(404).json({ error: 'Session not found' });
      if (s.status === 'completed') return res.status(400).json({ error: 'Session already completed' });

      // Verify pod membership
      const membership = await (prisma as any).podMember.findUnique({
        where: { podId_userId: { podId: s.podId, userId: user.id } },
      });
      if (!membership) return res.status(403).json({ error: 'Not a member of this pod' });

      // Check if already joined
      const existing = await (prisma as any).sessionParticipant.findUnique({
        where: { sessionId_userId: { sessionId, userId: user.id } },
      });
      if (existing) return res.status(400).json({ error: 'Already joined this session' });

      const participant = await (prisma as any).sessionParticipant.create({
        data: {
          sessionId,
          userId: user.id,
          goal: goal || '',
        },
        include: { user: { select: { id: true, name: true } } },
      });

      return res.json({ participant });
    }

    // Start the session (creator only)
    if (action === 'start') {
      if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

      const s = await (prisma as any).podStudySession.findUnique({ where: { id: sessionId } });
      if (!s) return res.status(404).json({ error: 'Session not found' });
      if (s.creatorId !== user.id) return res.status(403).json({ error: 'Only the creator can start the session' });

      const now = new Date();
      const endsAt = new Date(now.getTime() + s.focusDuration * 60000);

      const updated = await (prisma as any).podStudySession.update({
        where: { id: sessionId },
        data: {
          status: 'active',
          currentRound: 1,
          startedAt: now,
          endsAt,
        },
      });

      return res.json({ session: updated });
    }

    // Advance to next round or complete
    if (action === 'advance') {
      if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

      const s = await (prisma as any).podStudySession.findUnique({ where: { id: sessionId } });
      if (!s) return res.status(404).json({ error: 'Session not found' });

      const now = new Date();

      if (s.status === 'active') {
        if (s.currentRound >= s.rounds) {
          // Complete the session
          const updated = await (prisma as any).podStudySession.update({
            where: { id: sessionId },
            data: { status: 'completed', endsAt: now },
          });
          return res.json({ session: updated });
        }
        // Move to break
        const endsAt = new Date(now.getTime() + s.breakDuration * 60000);
        const updated = await (prisma as any).podStudySession.update({
          where: { id: sessionId },
          data: { status: 'break', endsAt },
        });
        return res.json({ session: updated });
      }

      if (s.status === 'break') {
        // Move to next focus round
        const endsAt = new Date(now.getTime() + s.focusDuration * 60000);
        const updated = await (prisma as any).podStudySession.update({
          where: { id: sessionId },
          data: {
            status: 'active',
            currentRound: s.currentRound + 1,
            endsAt,
          },
        });
        return res.json({ session: updated });
      }

      return res.status(400).json({ error: 'Session cannot be advanced in its current state' });
    }

    // Mark goal as completed
    if (action === 'complete-goal') {
      if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

      const participant = await (prisma as any).sessionParticipant.findUnique({
        where: { sessionId_userId: { sessionId, userId: user.id } },
      });
      if (!participant) return res.status(404).json({ error: 'Not a participant' });

      const updated = await (prisma as any).sessionParticipant.update({
        where: { id: participant.id },
        data: { completed: !participant.completed },
      });

      return res.json({ participant: updated });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${method} not allowed` });
}
