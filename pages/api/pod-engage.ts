import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';

const XP_VALUES = {
  message: 2,
  reaction: 1,
  poll_create: 5,
  poll_vote: 2,
  doc_share: 10,
  session_complete: 15,
  session_join: 5,
  streak_bonus_7: 50,
  streak_bonus_30: 200,
};

const ACHIEVEMENTS = [
  { id: 'first_message', label: 'Ice Breaker', desc: 'Sent your first message', icon: '💬', threshold: { messagesCount: 1 } },
  { id: 'chatterbox', label: 'Chatterbox', desc: 'Sent 50 messages', icon: '🗣️', threshold: { messagesCount: 50 } },
  { id: 'reactor', label: 'Hype Machine', desc: 'Gave 20 reactions', icon: '🔥', threshold: { reactionsGiven: 20 } },
  { id: 'streak_7', label: 'Week Warrior', desc: '7-day study streak', icon: '⚡', threshold: { longestStreak: 7 } },
  { id: 'streak_30', label: 'Monthly Legend', desc: '30-day study streak', icon: '🏆', threshold: { longestStreak: 30 } },
  { id: 'focus_master', label: 'Focus Master', desc: 'Completed 5 focus sessions', icon: '🧘', threshold: { sessionsCount: 5 } },
  { id: 'doc_contributor', label: 'Knowledge Sharer', desc: 'Shared 3 documents', icon: '📄', threshold: { docsShared: 3 } },
  { id: 'pollster', label: 'Voice of the Pod', desc: 'Voted in 5 polls', icon: '📊', threshold: { pollsVoted: 5 } },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function getOrCreateStats(podId: string, userId: string) {
  const existing = await (prisma as any).podMemberStats.findUnique({
    where: { podId_userId: { podId, userId } },
  });
  if (existing) return existing;
  return (prisma as any).podMemberStats.create({
    data: { podId, userId, lastActiveDate: todayStr() },
  });
}

async function awardXP(podId: string, userId: string, amount: number, statField?: string) {
  const stats = await getOrCreateStats(podId, userId);
  const today = todayStr();
  const wasActiveToday = stats.lastActiveDate === today;
  const wasActiveYesterday = stats.lastActiveDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let newStreak = stats.currentStreak;
  let bonusXP = 0;

  if (!wasActiveToday) {
    newStreak = wasActiveYesterday ? stats.currentStreak + 1 : 1;
    if (newStreak === 7) bonusXP = XP_VALUES.streak_bonus_7;
    if (newStreak === 30) bonusXP = XP_VALUES.streak_bonus_30;
  }

  const updateData: any = {
    xp: stats.xp + amount + bonusXP,
    currentStreak: newStreak,
    longestStreak: Math.max(stats.longestStreak, newStreak),
    lastActiveDate: today,
    updatedAt: new Date(),
  };

  if (statField) {
    updateData[statField] = (stats[statField] || 0) + 1;
  }

  const updated = await (prisma as any).podMemberStats.update({
    where: { id: stats.id },
    data: updateData,
  });

  // Check for new achievements
  const currentAchievements: string[] = JSON.parse(updated.achievements || '[]');
  const newAchievements: string[] = [];

  for (const a of ACHIEVEMENTS) {
    if (currentAchievements.includes(a.id)) continue;
    const [field, threshold] = Object.entries(a.threshold)[0];
    if ((updated as any)[field] >= threshold) {
      newAchievements.push(a.id);
    }
  }

  if (newAchievements.length > 0) {
    await (prisma as any).podMemberStats.update({
      where: { id: stats.id },
      data: { achievements: JSON.stringify([...currentAchievements, ...newAchievements]) },
    });
  }

  return { ...updated, newAchievements };
}

async function logActivity(podId: string, userId: string, type: string, metadata: Record<string, any> = {}) {
  await (prisma as any).podActivity.create({
    data: { podId, userId, type, metadata: JSON.stringify(metadata) },
  });
}

async function verifyMembership(podId: string, userId: string) {
  return (prisma as any).podMember.findUnique({
    where: { podId_userId: { podId, userId } },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureSchema();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(401).json({ error: 'User not found' });

  const { method } = req;

  /* ─── GET: Fetch engagement data ─── */
  if (method === 'GET') {
    const { action, podId } = req.query;
    if (!podId) return res.status(400).json({ error: 'podId is required' });

    const membership = await verifyMembership(podId as string, user.id);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    // Get reactions for messages in this pod
    if (action === 'reactions') {
      const reactions = await (prisma as any).podMessageReaction.findMany({
        where: { message: { podId: podId as string } },
        select: { messageId: true, emoji: true, userId: true },
      });
      // Group by messageId -> emoji -> userIds
      const grouped: Record<string, Record<string, string[]>> = {};
      for (const r of reactions) {
        if (!grouped[r.messageId]) grouped[r.messageId] = {};
        if (!grouped[r.messageId][r.emoji]) grouped[r.messageId][r.emoji] = [];
        grouped[r.messageId][r.emoji].push(r.userId);
      }
      return res.json({ reactions: grouped });
    }

    // Get leaderboard for this pod
    if (action === 'leaderboard') {
      const stats = await (prisma as any).podMemberStats.findMany({
        where: { podId: podId as string },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { xp: 'desc' },
      });
      return res.json({ leaderboard: stats });
    }

    // Get my stats for this pod
    if (action === 'my-stats') {
      const stats = await getOrCreateStats(podId as string, user.id);
      return res.json({ stats, achievements: ACHIEVEMENTS });
    }

    // Get polls for this pod
    if (action === 'polls') {
      const polls = await (prisma as any).podPoll.findMany({
        where: { podId: podId as string },
        include: {
          creator: { select: { id: true, name: true } },
          votes: { select: { userId: true, optionIdx: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      return res.json({ polls });
    }

    // Get activity feed for this pod
    if (action === 'activity') {
      const activities = await (prisma as any).podActivity.findMany({
        where: { podId: podId as string },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      return res.json({ activities });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  /* ─── POST: Toggle reaction, vote, create poll ─── */
  if (method === 'POST') {
    const { action, podId } = req.body;
    if (!podId) return res.status(400).json({ error: 'podId is required' });

    const membership = await verifyMembership(podId, user.id);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    // Toggle reaction
    if (action === 'toggle-reaction') {
      const { messageId, emoji } = req.body;
      if (!messageId || !emoji) return res.status(400).json({ error: 'messageId and emoji are required' });

      const existing = await (prisma as any).podMessageReaction.findUnique({
        where: { messageId_userId_emoji: { messageId, userId: user.id, emoji } },
      });

      if (existing) {
        await (prisma as any).podMessageReaction.delete({ where: { id: existing.id } });
        return res.json({ added: false });
      }

      await (prisma as any).podMessageReaction.create({
        data: { messageId, userId: user.id, emoji },
      });
      await awardXP(podId, user.id, XP_VALUES.reaction, 'reactionsGiven');
      return res.json({ added: true });
    }

    // Create poll
    if (action === 'create-poll') {
      const { question, options } = req.body;
      if (!question?.trim() || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'Question and at least 2 options required' });
      }

      const poll = await (prisma as any).podPoll.create({
        data: {
          podId,
          creatorId: user.id,
          question: question.trim(),
          options: JSON.stringify(options.map((o: string) => o.trim())),
        },
        include: {
          creator: { select: { id: true, name: true } },
          votes: true,
        },
      });

      // Create a chat message linking to the poll
      await (prisma as any).podMessage.create({
        data: {
          podId,
          userId: user.id,
          content: `📊 Poll: ${question.trim()}`,
          type: 'poll',
          essayId: poll.id,
        },
      });

      await awardXP(podId, user.id, XP_VALUES.poll_create);
      await logActivity(podId, user.id, 'poll_created', { question: question.trim() });

      return res.json({ poll });
    }

    // Vote on poll
    if (action === 'vote-poll') {
      const { pollId, optionIdx } = req.body;
      if (!pollId || optionIdx === undefined) return res.status(400).json({ error: 'pollId and optionIdx required' });

      // Check if already voted
      const existing = await (prisma as any).podPollVote.findUnique({
        where: { pollId_userId: { pollId, userId: user.id } },
      });

      if (existing) {
        // Change vote
        await (prisma as any).podPollVote.update({
          where: { id: existing.id },
          data: { optionIdx },
        });
      } else {
        await (prisma as any).podPollVote.create({
          data: { pollId, userId: user.id, optionIdx },
        });
        await awardXP(podId, user.id, XP_VALUES.poll_vote, 'pollsVoted');
      }

      // Return updated poll
      const poll = await (prisma as any).podPoll.findUnique({
        where: { id: pollId },
        include: {
          creator: { select: { id: true, name: true } },
          votes: { select: { userId: true, optionIdx: true } },
        },
      });

      return res.json({ poll });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${method} not allowed` });
}
