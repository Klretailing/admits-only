import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'educator') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;

  if (req.method === 'GET') {
    try {
      const services = await prisma.educatorService.findMany({
        where: { educatorId: userId },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ services });
    } catch (e) {
      console.error('Fetch services error:', (e as Error).message);
      return res.json({ services: [] });
    }
  }

  if (req.method === 'POST') {
    const { name, description, duration, price, type, maxStudents } = req.body;
    if (!name || price === undefined) return res.status(400).json({ error: 'Name and price are required' });

    try {
      const service = await prisma.educatorService.create({
        data: {
          educatorId: userId,
          name,
          description: description || '',
          duration: duration || 60,
          price,
          type: type || 'one_on_one',
          maxStudents: maxStudents || 1,
        },
      });
      return res.status(201).json({ service });
    } catch (e) {
      console.error('Create service error:', (e as Error).message);
      return res.status(500).json({ error: 'Failed to create service' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
