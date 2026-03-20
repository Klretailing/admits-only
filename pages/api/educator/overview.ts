import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'educator') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  try {
    const [totalStudents, activeStudents, allBookings, todayBookings, recentBookings] = await Promise.all([
      prisma.educatorStudent.count({ where: { educatorId: userId } }),
      prisma.educatorStudent.count({ where: { educatorId: userId, status: 'active' } }),
      prisma.booking.findMany({ where: { educatorId: userId }, select: { amount: true, paid: true, status: true, date: true } }),
      prisma.booking.count({ where: { educatorId: userId, date: { gte: startOfDay, lt: endOfDay }, status: 'scheduled' } }),
      prisma.booking.findMany({
        where: { educatorId: userId, date: { gte: now }, status: 'scheduled' },
        include: { student: { select: { studentName: true } } },
        orderBy: { date: 'asc' },
        take: 5,
      }),
    ]);

    const totalRevenue = allBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.amount, 0);
    const monthRevenue = allBookings.filter(b => b.status === 'completed' && new Date(b.date) >= startOfMonth).reduce((sum, b) => sum + b.amount, 0);

    return res.json({
      totalStudents,
      activeStudents,
      totalBookings: allBookings.length,
      upcomingToday: todayBookings,
      monthRevenue,
      totalRevenue,
      recentBookings: recentBookings.map(b => ({
        id: b.id,
        title: b.title,
        date: b.date.toISOString(),
        status: b.status,
        studentName: b.student?.studentName || 'Unknown',
        platform: b.platform,
        meetingLink: b.meetingLink,
        duration: b.duration,
      })),
    });
  } catch (e) {
    console.error('Educator overview error:', (e as Error).message);
    return res.json({ totalStudents: 0, activeStudents: 0, totalBookings: 0, upcomingToday: 0, monthRevenue: 0, totalRevenue: 0, recentBookings: [] });
  }
}
