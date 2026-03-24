import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'educator') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;

  // POST: add a manual earning entry
  if (req.method === 'POST') {
    const { description, hours, amount, date } = req.body;
    if (!description || hours == null || amount == null) {
      return res.status(400).json({ error: 'Description, hours, and amount are required' });
    }
    if (hours <= 0 || amount <= 0) {
      return res.status(400).json({ error: 'Hours and amount must be greater than 0' });
    }
    try {
      const entry = await prisma.manualEarning.create({
        data: {
          educatorId: userId,
          description,
          hours: parseFloat(hours),
          amount: parseFloat(amount),
          date: date ? new Date(date) : new Date(),
        },
      });
      return res.status(201).json({ entry });
    } catch (e) {
      console.error('Manual earning error:', (e as Error).message);
      return res.status(500).json({ error: 'Failed to add earning' });
    }
  }

  // DELETE: remove a manual earning entry
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID is required' });
    try {
      await prisma.manualEarning.delete({ where: { id } });
      return res.json({ ok: true });
    } catch (e) {
      console.error('Delete earning error:', (e as Error).message);
      return res.status(500).json({ error: 'Failed to delete earning' });
    }
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const bookings = await prisma.booking.findMany({
      where: { educatorId: userId, amount: { gt: 0 } },
      include: { student: { select: { studentName: true } } },
      orderBy: { date: 'desc' },
    });

    const manualEarnings = await prisma.manualEarning.findMany({
      where: { educatorId: userId },
      orderBy: { date: 'desc' },
    });

    const completed = bookings.filter(b => b.status === 'completed');
    const bookingRevenue = completed.reduce((sum, b) => sum + b.amount, 0);
    const manualRevenue = manualEarnings.reduce((sum, e) => sum + e.amount, 0);
    const totalRevenue = bookingRevenue + manualRevenue;

    const bookingMonthRevenue = completed.filter(b => b.date >= startOfMonth).reduce((sum, b) => sum + b.amount, 0);
    const manualMonthRevenue = manualEarnings.filter(e => e.date >= startOfMonth).reduce((sum, e) => sum + e.amount, 0);
    const monthRevenue = bookingMonthRevenue + manualMonthRevenue;

    const paidAmount = completed.filter(b => b.paid).reduce((sum, b) => sum + b.amount, 0) + manualRevenue;
    const unpaidAmount = completed.filter(b => !b.paid).reduce((sum, b) => sum + b.amount, 0);

    const allBookings = await prisma.booking.count({ where: { educatorId: userId } });
    const completedCount = await prisma.booking.count({ where: { educatorId: userId, status: 'completed' } });

    // Total hours: booking hours (from duration) + manual hours
    const bookingHours = completed.reduce((sum, b) => sum + b.duration / 60, 0);
    const manualHours = manualEarnings.reduce((sum, e) => sum + e.hours, 0);
    const totalHours = bookingHours + manualHours;
    const avgHourlyRate = totalHours > 0 ? totalRevenue / totalHours : 0;

    // Build monthly breakdown for charts (last 12 months)
    const monthlyBreakdown: { month: string; label: string; earnings: number; cumulative: number }[] = [];
    let cumulative = 0;
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bookingEarnings = completed
        .filter(b => b.date >= d && b.date <= monthEnd)
        .reduce((sum, b) => sum + b.amount, 0);
      const manualMonthEarnings = manualEarnings
        .filter(e => e.date >= d && e.date <= monthEnd)
        .reduce((sum, e) => sum + e.amount, 0);
      const monthEarnings = bookingEarnings + manualMonthEarnings;
      cumulative += monthEarnings;
      monthlyBreakdown.push({ month: monthKey, label, earnings: monthEarnings, cumulative });
    }

    return res.json({
      totalRevenue,
      monthRevenue,
      paidAmount,
      unpaidAmount,
      totalSessions: allBookings,
      completedSessions: completedCount,
      totalHours: Math.round(totalHours * 100) / 100,
      avgHourlyRate: Math.round(avgHourlyRate * 100) / 100,
      monthlyBreakdown,
      payments: bookings.map(b => ({
        id: b.id,
        title: b.title,
        date: b.date.toISOString(),
        amount: b.amount,
        paid: b.paid,
        status: b.status,
        studentName: b.student?.studentName || 'Unknown',
        type: 'booking' as const,
      })),
      manualEarnings: manualEarnings.map(e => ({
        id: e.id,
        description: e.description,
        hours: e.hours,
        amount: e.amount,
        date: e.date.toISOString(),
        type: 'manual' as const,
      })),
    });
  } catch (e) {
    console.error('Earnings error:', (e as Error).message);
    return res.json({ totalRevenue: 0, monthRevenue: 0, paidAmount: 0, unpaidAmount: 0, totalSessions: 0, completedSessions: 0, totalHours: 0, avgHourlyRate: 0, monthlyBreakdown: [], payments: [], manualEarnings: [] });
  }
}
