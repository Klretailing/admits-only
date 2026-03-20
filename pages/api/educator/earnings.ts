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

  try {
    const bookings = await prisma.booking.findMany({
      where: { educatorId: userId, amount: { gt: 0 } },
      include: { student: { select: { studentName: true } } },
      orderBy: { date: 'desc' },
    });

    const completed = bookings.filter(b => b.status === 'completed');
    const totalRevenue = completed.reduce((sum, b) => sum + b.amount, 0);
    const monthRevenue = completed.filter(b => b.date >= startOfMonth).reduce((sum, b) => sum + b.amount, 0);
    const paidAmount = completed.filter(b => b.paid).reduce((sum, b) => sum + b.amount, 0);
    const unpaidAmount = completed.filter(b => !b.paid).reduce((sum, b) => sum + b.amount, 0);

    const allBookings = await prisma.booking.count({ where: { educatorId: userId } });
    const completedCount = await prisma.booking.count({ where: { educatorId: userId, status: 'completed' } });

    return res.json({
      totalRevenue,
      monthRevenue,
      paidAmount,
      unpaidAmount,
      totalSessions: allBookings,
      completedSessions: completedCount,
      payments: bookings.map(b => ({
        id: b.id,
        title: b.title,
        date: b.date.toISOString(),
        amount: b.amount,
        paid: b.paid,
        status: b.status,
        studentName: b.student?.studentName || 'Unknown',
      })),
    });
  } catch (e) {
    console.error('Earnings error:', (e as Error).message);
    return res.json({ totalRevenue: 0, monthRevenue: 0, paidAmount: 0, unpaidAmount: 0, totalSessions: 0, completedSessions: 0, payments: [] });
  }
}
