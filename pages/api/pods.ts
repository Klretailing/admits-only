import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';
import crypto from 'crypto';

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

const POD_ACHIEVEMENTS = [
  { id: 'first_message', label: 'Ice Breaker', desc: 'Sent your first message', icon: '💬', threshold: { messagesCount: 1 } },
  { id: 'chatterbox', label: 'Chatterbox', desc: 'Sent 50 messages', icon: '🗣️', threshold: { messagesCount: 50 } },
  { id: 'reactor', label: 'Hype Machine', desc: 'Gave 20 reactions', icon: '🔥', threshold: { reactionsGiven: 20 } },
  { id: 'streak_7', label: 'Week Warrior', desc: '7-day study streak', icon: '⚡', threshold: { longestStreak: 7 } },
  { id: 'streak_30', label: 'Monthly Legend', desc: '30-day study streak', icon: '🏆', threshold: { longestStreak: 30 } },
  { id: 'focus_master', label: 'Focus Master', desc: 'Completed 5 focus sessions', icon: '🧘', threshold: { sessionsCount: 5 } },
  { id: 'doc_contributor', label: 'Knowledge Sharer', desc: 'Shared 3 documents', icon: '📄', threshold: { docsShared: 3 } },
  { id: 'pollster', label: 'Voice of the Pod', desc: 'Voted in 5 polls', icon: '📊', threshold: { pollsVoted: 5 } },
];

function groupReactions(rows: { messageId: string; emoji: string; userId: string }[]) {
  const grouped: Record<string, Record<string, string[]>> = {};
  for (const r of rows) {
    if (!grouped[r.messageId]) grouped[r.messageId] = {};
    if (!grouped[r.messageId][r.emoji]) grouped[r.messageId][r.emoji] = [];
    grouped[r.messageId][r.emoji].push(r.userId);
  }
  return grouped;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureSchema();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(401).json({ error: 'User not found' });

  const { method } = req;

  /* ─── GET: List user's pods ─── */
  if (method === 'GET') {
    const { action, podId } = req.query;

    // Get messages for a specific pod
    if (action === 'messages' && podId) {
      const membership = await (prisma as any).podMember.findUnique({
        where: { podId_userId: { podId: podId as string, userId: user.id } },
      });
      if (!membership) return res.status(403).json({ error: 'Not a member of this pod' });

      const messages = await (prisma as any).podMessage.findMany({
        where: { podId: podId as string },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });
      return res.json({ messages });
    }

    // Get members for a specific pod
    if (action === 'members' && podId) {
      const membership = await (prisma as any).podMember.findUnique({
        where: { podId_userId: { podId: podId as string, userId: user.id } },
      });
      if (!membership) return res.status(403).json({ error: 'Not a member of this pod' });

      const members = await (prisma as any).podMember.findMany({
        where: { podId: podId as string },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: 'asc' },
      });
      return res.json({ members });
    }

    // Consolidated bootstrap: everything needed to open a pod in ONE round-trip
    if (action === 'bootstrap' && podId) {
      const pid = podId as string;
      const membership = await (prisma as any).podMember.findUnique({
        where: { podId_userId: { podId: pid, userId: user.id } },
      });
      if (!membership) return res.status(403).json({ error: 'Not a member of this pod' });

      const [messages, members, reactionRows, polls, stats, documents] = await Promise.all([
        (prisma as any).podMessage.findMany({
          where: { podId: pid },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
          take: 100,
        }),
        (prisma as any).podMember.findMany({
          where: { podId: pid },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: 'asc' },
        }),
        (prisma as any).podMessageReaction.findMany({
          where: { message: { podId: pid } },
          select: { messageId: true, emoji: true, userId: true },
        }),
        (prisma as any).podPoll.findMany({
          where: { podId: pid },
          include: {
            creator: { select: { id: true, name: true } },
            votes: { select: { userId: true, optionIdx: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        (prisma as any).podMemberStats.findUnique({
          where: { podId_userId: { podId: pid, userId: user.id } },
          include: { user: { select: { id: true, name: true } } },
        }),
        (prisma as any).podDocument.findMany({
          where: { podId: pid },
          select: {
            id: true, podId: true, uploaderId: true, fileName: true, fileType: true,
            fileSize: true, createdAt: true, updatedAt: true,
            uploader: { select: { id: true, name: true } },
            _count: { select: { comments: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return res.json({
        messages,
        members,
        reactions: groupReactions(reactionRows),
        polls,
        documents,
        myStats: stats,
        achievements: POD_ACHIEVEMENTS,
      });
    }

    // Incremental sync for cheap polling: only new messages + current reactions
    if (action === 'sync' && podId) {
      const pid = podId as string;
      const membership = await (prisma as any).podMember.findUnique({
        where: { podId_userId: { podId: pid, userId: user.id } },
      });
      if (!membership) return res.status(403).json({ error: 'Not a member of this pod' });

      const after = req.query.after as string | undefined;
      const whereClause: any = { podId: pid };
      if (after) {
        const afterDate = new Date(after);
        if (!isNaN(afterDate.getTime())) whereClause.createdAt = { gt: afterDate };
      }

      const [newMessages, reactionRows] = await Promise.all([
        (prisma as any).podMessage.findMany({
          where: whereClause,
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
          take: 100,
        }),
        (prisma as any).podMessageReaction.findMany({
          where: { message: { podId: pid } },
          select: { messageId: true, emoji: true, userId: true },
        }),
      ]);

      return res.json({ messages: newMessages, reactions: groupReactions(reactionRows) });
    }

    // List all pods the user is a member of
    const memberships = await (prisma as any).podMember.findMany({
      where: { userId: user.id },
      include: {
        pod: {
          include: {
            members: { select: { id: true } },
            messages: { orderBy: { createdAt: 'desc' as const }, take: 1, include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const pods = memberships.map((m: any) => ({
      id: m.pod.id,
      name: m.pod.name,
      description: m.pod.description,
      inviteCode: m.pod.inviteCode,
      memberCount: m.pod.members.length,
      myRole: m.role,
      lastMessage: m.pod.messages[0] ? {
        content: m.pod.messages[0].content,
        userName: m.pod.messages[0].user.name,
        createdAt: m.pod.messages[0].createdAt,
      } : null,
      joinedAt: m.joinedAt,
    }));

    return res.json({ pods });
  }

  /* ─── POST: Create pod or send message ─── */
  if (method === 'POST') {
    const { action } = req.body;

    // Create a new pod
    if (action === 'create') {
      const { name, description } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'Pod name is required' });

      const inviteCode = generateInviteCode();
      const pod = await (prisma as any).studyPod.create({
        data: {
          name: name.trim(),
          description: (description || '').trim(),
          inviteCode,
        },
      });

      // Add creator as admin member
      await (prisma as any).podMember.create({
        data: { podId: pod.id, userId: user.id, role: 'admin' },
      });

      return res.json({ pod: { ...pod, memberCount: 1, myRole: 'admin' } });
    }

    // Join a pod via invite code
    if (action === 'join') {
      const { inviteCode } = req.body;
      if (!inviteCode?.trim()) return res.status(400).json({ error: 'Invite code is required' });

      const pod = await (prisma as any).studyPod.findUnique({
        where: { inviteCode: inviteCode.trim().toUpperCase() },
      });
      if (!pod) return res.status(404).json({ error: 'No pod found with that invite code' });

      // Check if already a member
      const existing = await (prisma as any).podMember.findUnique({
        where: { podId_userId: { podId: pod.id, userId: user.id } },
      });
      if (existing) return res.status(400).json({ error: 'You are already a member of this pod' });

      await (prisma as any).podMember.create({
        data: { podId: pod.id, userId: user.id, role: 'member' },
      });

      return res.json({ pod: { id: pod.id, name: pod.name, description: pod.description } });
    }

    // Send a message
    if (action === 'message') {
      const { podId, content, type, essayId } = req.body;
      if (!podId || !content?.trim()) return res.status(400).json({ error: 'Pod ID and content are required' });

      // Verify membership
      const membership = await (prisma as any).podMember.findUnique({
        where: { podId_userId: { podId, userId: user.id } },
      });
      if (!membership) return res.status(403).json({ error: 'Not a member of this pod' });

      const message = await (prisma as any).podMessage.create({
        data: {
          podId,
          userId: user.id,
          content: content.trim(),
          type: type || 'discussion',
          essayId: essayId || null,
          parentId: req.body.parentId || null,
        },
        include: { user: { select: { id: true, name: true } } },
      });

      // Award XP for messaging
      try {
        const today = new Date().toISOString().slice(0, 10);
        const stats = await (prisma as any).podMemberStats.findUnique({
          where: { podId_userId: { podId, userId: user.id } },
        });
        if (stats) {
          const wasActiveYesterday = stats.lastActiveDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          const wasActiveToday = stats.lastActiveDate === today;
          const newStreak = wasActiveToday ? stats.currentStreak : (wasActiveYesterday ? stats.currentStreak + 1 : 1);
          await (prisma as any).podMemberStats.update({
            where: { id: stats.id },
            data: {
              xp: stats.xp + 2,
              messagesCount: stats.messagesCount + 1,
              currentStreak: newStreak,
              longestStreak: Math.max(stats.longestStreak, newStreak),
              lastActiveDate: today,
            },
          });
        } else {
          await (prisma as any).podMemberStats.create({
            data: { podId, userId: user.id, xp: 2, messagesCount: 1, currentStreak: 1, lastActiveDate: today },
          });
        }
      } catch { /* XP tracking is best-effort */ }

      return res.json({ message });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  /* ─── DELETE: Leave pod ─── */
  if (method === 'DELETE') {
    const { podId } = req.body;
    if (!podId) return res.status(400).json({ error: 'Pod ID is required' });

    await (prisma as any).podMember.deleteMany({
      where: { podId, userId: user.id },
    });

    // If no members left, delete the pod
    const remaining = await (prisma as any).podMember.count({ where: { podId } });
    if (remaining === 0) {
      await (prisma as any).studyPod.delete({ where: { id: podId } });
    }

    return res.json({ success: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: `Method ${method} not allowed` });
}
