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
  const serviceId = req.query.id as string;

  const service = await prisma.educatorService.findFirst({
    where: { id: serviceId, educatorId: userId },
  });
  if (!service) return res.status(404).json({ error: 'Service not found' });

  if (req.method === 'PATCH') {
    const { name, description, duration, price, type, maxStudents, active } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (duration !== undefined) data.duration = duration;
    if (price !== undefined) data.price = price;
    if (type !== undefined) data.type = type;
    if (maxStudents !== undefined) data.maxStudents = maxStudents;
    if (active !== undefined) data.active = active;

    const updated = await prisma.educatorService.update({
      where: { id: serviceId },
      data,
    });
    return res.json({ service: updated });
  }

  if (req.method === 'DELETE') {
    await prisma.educatorService.delete({ where: { id: serviceId } });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
