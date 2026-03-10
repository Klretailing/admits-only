import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';
import { isAIEnabled, getAIClient, SYSTEM_PROMPT_ESSAY_REVIEWER } from '../../../lib/ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  if (!isAIEnabled()) {
    return res.status(503).json({
      error: 'AI essay feedback is not configured. Add ANTHROPIC_API_KEY to enable.',
      available: false,
    });
  }

  await ensureSchema();
  const userId = (session.user as any).id as string;
  const { essayId, content, prompt } = req.body;

  let essayContent = content || '';
  let essayPrompt = prompt || '';

  // Load from DB if essayId provided
  if (essayId) {
    const essay = await prisma.essay.findFirst({
      where: { id: essayId, userId },
    });
    if (!essay) return res.status(404).json({ error: 'Essay not found' });
    essayContent = essay.content;
    essayPrompt = essay.prompt;
  }

  if (!essayContent || essayContent.trim().length < 50) {
    return res.status(400).json({ error: 'Essay content must be at least 50 characters' });
  }

  const client = getAIClient()!;
  const userMessage = essayPrompt
    ? `Essay prompt: ${essayPrompt}\n\nEssay:\n${essayContent}`
    : `Essay:\n${essayContent}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT_ESSAY_REVIEWER,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.type === 'text' ? block.text : '')
      .join('');

    // Try to parse structured feedback
    try {
      const feedback = JSON.parse(text);
      return res.json({ feedback, available: true });
    } catch {
      return res.json({ feedback: { raw: text }, available: true });
    }
  } catch (e: any) {
    const errMsg = e?.message || String(e);
    console.error('AI essay feedback error:', errMsg);

    if (errMsg.includes('credit balance is too low') || errMsg.includes('billing')) {
      return res.status(503).json({ error: 'billing', errorCode: 'BILLING', available: false });
    }
    if (errMsg.includes('authentication') || errMsg.includes('invalid x-api-key') || e?.status === 401) {
      return res.status(503).json({ error: 'invalid_key', errorCode: 'INVALID_KEY', available: false });
    }
    if (errMsg.includes('rate limit') || e?.status === 429) {
      return res.status(429).json({ error: 'Rate limited — please wait a moment and try again.' });
    }

    return res.status(500).json({ error: 'AI request failed' });
  }
}
