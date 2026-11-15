import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !['educator','admin'].includes((session.user as any).role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;

  if (req.method === 'GET') {
    try {
      const bookings = await prisma.booking.findMany({
        where: { educatorId: userId },
        include: {
          student: { select: { id: true, studentName: true } },
          service: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      });
      return res.json({ bookings });
    } catch (e) {
      console.error('Fetch bookings error:', (e as Error).message);
      return res.json({ bookings: [] });
    }
  }

  if (req.method === 'POST') {
    const { title, studentId, serviceId, date, duration, platform, meetingLink, amount, paid } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Title and date are required' });
    if (Number.isNaN(new Date(date).getTime())) return res.status(400).json({ error: 'Invalid date' });
    // The student and service must be this educator's own. Unchecked ids let a
    // tutor attach a booking to another tutor's roster student.
    if (studentId && !(await prisma.educatorStudent.findFirst({ where: { id: studentId, educatorId: userId }, select: { id: true } }))) {
      return res.status(400).json({ error: 'Unknown student' });
    }
    if (serviceId && !(await prisma.educatorService.findFirst({ where: { id: serviceId, educatorId: userId }, select: { id: true } }))) {
      return res.status(400).json({ error: 'Unknown service' });
    }

    try {
      const booking = await prisma.booking.create({
        data: {
          educatorId: userId,
          title,
          studentId: studentId || null,
          serviceId: serviceId || null,
          date: new Date(date),
          duration: duration || 60,
          platform: platform || 'zoom',
          meetingLink: meetingLink || '',
          amount: amount || 0,
          paid: paid || false,
        },
        include: {
          student: { select: { id: true, studentName: true } },
          service: { select: { id: true, name: true } },
        },
      });
      return res.status(201).json({ booking });
    } catch (e) {
      console.error('Create booking error:', (e as Error).message);
      return res.status(500).json({ error: 'Failed to create booking' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
