import type { NextApiRequest, NextApiResponse } from 'next';
import { createUser } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (!['student', 'parent', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // Admin registration requires a secret key to prevent unauthorized admin accounts
  if (role === 'admin') {
    const adminKey = req.body.adminKey || req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: 'Unauthorized: invalid admin key' });
    }
  }

  try {
    const user = await createUser(name, email, password, role);
    return res.status(201).json({ user });
  } catch (err: any) {
    return res.status(409).json({ error: err.message || 'Registration failed' });
  }
}
