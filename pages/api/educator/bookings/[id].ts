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
  const bookingId = req.query.id as string;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, educatorId: userId },
  });
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (req.method === 'PATCH') {
    const { status, notes, paid, meetingLink } = req.body;
    const data: any = {};
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (paid !== undefined) data.paid = paid;
    if (meetingLink !== undefined) data.meetingLink = meetingLink;

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data,
      include: {
        student: { select: { id: true, studentName: true } },
        service: { select: { id: true, name: true } },
      },
    });
    return res.json({ booking: updated });
  }

  if (req.method === 'DELETE') {
    await prisma.booking.delete({ where: { id: bookingId } });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
