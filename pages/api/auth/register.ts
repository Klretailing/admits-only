import type { NextApiRequest, NextApiResponse } from 'next';
import { createUser } from '../../../lib/auth';
import { linkInvite } from '../../../lib/invites';
import { checkSignupAge } from '../../../lib/age';
import { passwordProblem } from '../../../lib/passwordPolicy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, password, role, inviteToken, dateOfBirth } = req.body || {};

  if (!name || !email || !password || !role || typeof name !== 'string' || typeof email !== 'string') {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!['student', 'parent', 'educator', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // Age gate (lib/age.ts). Checked on the server, so it can't be skipped from
  // the browser. An under-13 attempt is refused before anything is stored.
  const age = checkSignupAge(role, dateOfBirth);
  if (!age.ok) {
    return res.status(age.status).json({ error: age.error, code: age.code });
  }

  const pwIssue = passwordProblem(password, email, name);
  if (pwIssue) {
    return res.status(400).json({ error: pwIssue });
  }

  // Admin registration requires a secret key to prevent unauthorized admin accounts
  if (role === 'admin') {
    const adminKey = req.body.adminKey || req.headers['x-admin-key'];
    // Fail closed: with ADMIN_SECRET_KEY unset, a request with no key used to
    // match `undefined === undefined` and create an admin.
    if (!process.env.ADMIN_SECRET_KEY || typeof adminKey !== 'string' || adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: 'Unauthorized: invalid admin key' });
    }
  }

  let user;
  try {
    user = await createUser(name, email, password, role, age.birthMonth);
  } catch (err: any) {
    return res.status(409).json({ error: err.message || 'Registration failed' });
  }

  // Link the new student to the inviting educator — never block account creation
  if (role === 'student' && inviteToken) {
    try {
      await linkInvite(inviteToken, user.id, name, email);
    } catch (e: any) {
      console.error('Invite link error (non-fatal):', e.message);
    }
  }

  return res.status(201).json({ user });
}
