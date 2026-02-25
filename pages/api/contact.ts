import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma, ensureSchema } from '../../lib/db';

async function sendEmailNotification(data: { name: string; email: string; phone?: string; message: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFICATION_EMAIL;
  if (!apiKey || !notifyEmail) return; // skip if not configured

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'AdmitsOnly <notifications@admitsonly.com>',
        to: [notifyEmail],
        subject: `New Contact Form: ${data.name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
          <hr />
          <p><strong>Message:</strong></p>
          <p>${data.message.replace(/\n/g, '<br />')}</p>
        `,
      }),
    });
  } catch (e) {
    console.error('Email notification failed (non-fatal):', (e as Error).message);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  await ensureSchema();

  const submission = await prisma.contactSubmission.create({
    data: { name, email, phone: phone || null, message },
  });

  // Fire-and-forget email notification
  sendEmailNotification({ name, email, phone, message });

  return res.status(201).json({ success: true, id: submission.id });
}
