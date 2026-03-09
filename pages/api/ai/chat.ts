import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { isAIEnabled, getAIClient, SYSTEM_PROMPT_COUNSELOR } from '../../../lib/ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  if (!isAIEnabled()) {
    return res.status(503).json({
      error: 'AI assistant is not configured. Add ANTHROPIC_API_KEY to enable.',
      available: false,
    });
  }

  const { messages, context } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const client = getAIClient()!;
  const systemPrompt = context
    ? `${SYSTEM_PROMPT_COUNSELOR}\n\nStudent context:\n${context}`
    : SYSTEM_PROMPT_COUNSELOR;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.type === 'text' ? block.text : '')
      .join('');

    return res.json({ reply: text, available: true });
  } catch (e) {
    console.error('AI chat error:', (e as Error).message);
    return res.status(500).json({ error: 'AI request failed' });
  }
}
