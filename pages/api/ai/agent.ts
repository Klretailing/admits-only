import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { isAIEnabled, getAIClient } from '../../../lib/ai';
import { prisma, ensureSchema } from '../../../lib/db';

const AGENT_SYSTEM_PROMPT = `You are Ari, a dedicated personal admissions counselor AI built into AdmitsOnly. You are NOT a generic chatbot — you are this specific student's personal advisor who remembers everything about them.

Your personality:
- Warm, encouraging, but refreshingly honest — like a big sibling who went through the process
- You celebrate wins but don't sugarcoat weaknesses
- You use natural, conversational language (not corporate-speak)
- You're deeply knowledgeable about selective college admissions (T20, T50, Ivy+)
- You proactively connect dots between different parts of the student's profile

Your capabilities:
- You have full access to the student's profile, essays, scores, and activity history
- You remember previous conversations and learn the student's preferences
- You can give specific, data-driven advice based on their actual numbers
- You can help brainstorm essay topics, review essay strategies, plan activities
- You can assess school fit based on their holistic profile

Key behaviors:
- When you learn something new about the student (goals, preferences, personality traits, dream schools), note it explicitly
- Reference their specific data (GPA, scores, ECs, essays) when relevant
- If they mention something that contradicts or updates what you know, acknowledge the update
- Give specific, actionable next steps — not vague encouragement
- When discussing schools, reference actual acceptance rates and what makes a competitive applicant there

IMPORTANT: You are embedded in the AdmitsOnly platform. You can reference features like:
- Their essay workspace with live scoring
- Their holistic profile score
- Their motif board for narrative threading
- Their application tracker
- Study pods for peer review

Never suggest they go to another AI tool — you ARE their AI tool.`;

interface AgentRequestBody {
  message: string;
  conversationId?: string;
  action?: 'list' | 'new' | 'chat' | 'delete';
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  await ensureSchema();
  const userId = (session.user as any).id;

  const { message, conversationId, action = 'chat' } = req.body as AgentRequestBody;

  // ─── LIST conversations ───
  if (action === 'list') {
    const conversations = await prisma.$queryRawUnsafe(
      `SELECT id, title, "updatedAt" FROM agent_conversations WHERE "userId" = $1 ORDER BY "updatedAt" DESC LIMIT 20`,
      userId
    ) as any[];
    return res.json({ conversations });
  }

  // ─── DELETE conversation ───
  if (action === 'delete' && conversationId) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM agent_conversations WHERE id = $1 AND "userId" = $2`,
      conversationId, userId
    );
    return res.json({ success: true });
  }

  // ─── NEW conversation ───
  if (action === 'new') {
    const id = genId('conv');
    await prisma.$executeRawUnsafe(
      `INSERT INTO agent_conversations (id, "userId", title, "createdAt", "updatedAt") VALUES ($1, $2, 'New Conversation', NOW(), NOW())`,
      id, userId
    );
    return res.json({ conversation: { id, title: 'New Conversation' } });
  }

  // ─── CHAT ───
  if (!message?.trim()) return res.status(400).json({ error: 'message is required' });

  if (!isAIEnabled()) {
    return res.status(503).json({ error: 'AI not configured', available: false });
  }

  // Get or create conversation
  let convId = conversationId;
  if (!convId) {
    convId = genId('conv');
    await prisma.$executeRawUnsafe(
      `INSERT INTO agent_conversations (id, "userId", title, "createdAt", "updatedAt") VALUES ($1, $2, 'New Conversation', NOW(), NOW())`,
      convId, userId
    );
  }

  // Load full student context
  const [profile, essays, memoryRows, prevMessages] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId } }),
    prisma.essay.findMany({
      where: { userId },
      select: { id: true, title: true, prompt: true, status: true, overallScore: true, aiScore: true, vocabScore: true, grammarScore: true, originalityScore: true, content: true },
    }),
    prisma.$queryRawUnsafe(
      `SELECT facts, preferences FROM agent_memories WHERE "userId" = $1 LIMIT 1`,
      userId
    ) as Promise<any[]>,
    prisma.$queryRawUnsafe(
      `SELECT role, content FROM agent_messages WHERE "conversationId" = $1 ORDER BY "createdAt" ASC LIMIT 50`,
      convId
    ) as Promise<any[]>,
  ]);

  const memory = memoryRows.length > 0 ? memoryRows[0] : null;

  // Build rich context
  const contextParts: string[] = [];

  contextParts.push(`Student: ${session.user.name || 'Unknown'}`);

  if (profile) {
    const parts: string[] = [];
    if (profile.gpa) parts.push(`GPA: ${profile.gpa}/${profile.gpaScale}`);
    if (profile.satMath && profile.satRW) parts.push(`SAT: ${profile.satMath + profile.satRW} (Math: ${profile.satMath}, RW: ${profile.satRW})`);
    if (profile.holisticScore) parts.push(`Holistic Score: ${profile.holisticScore}/100 (${profile.percentile ? `${profile.percentile}th percentile` : 'no percentile'})`);
    if (profile.gpaScore) parts.push(`GPA Score: ${profile.gpaScore}/100`);
    if (profile.satScore) parts.push(`SAT Score: ${profile.satScore}/100`);
    if (profile.ecScore) parts.push(`EC Score: ${profile.ecScore}/100`);

    const ecs = profile.extracurriculars as any[];
    if (Array.isArray(ecs) && ecs.length > 0) {
      parts.push(`\nExtracurriculars (${ecs.length}):`);
      ecs.forEach((ec: any) => {
        parts.push(`  - ${ec.name} (${ec.role || 'Member'}, ${ec.years || '?'} yrs, ${ec.hoursPerWeek || '?'} hrs/wk): ${ec.description || 'No description'}`);
      });
    }
    contextParts.push(`Profile:\n${parts.join('\n')}`);
  } else {
    contextParts.push('Profile: Not yet set up — encourage them to fill it out for personalized advice.');
  }

  if (essays.length > 0) {
    contextParts.push(`\nEssays (${essays.length}):`);
    essays.forEach(e => {
      const scores = e.overallScore != null ? ` | Impact: ${e.overallScore}, Voice: ${e.aiScore}, Vocab: ${e.vocabScore}, Structure: ${e.grammarScore}, Story: ${e.originalityScore}` : ' | Not yet scored';
      const wordCount = e.content ? e.content.trim().split(/\s+/).length : 0;
      contextParts.push(`  - "${e.title}" [${e.status}] ${wordCount}w${scores}`);
      if (e.prompt) contextParts.push(`    Prompt: "${e.prompt}"`);
    });
  } else {
    contextParts.push('\nEssays: None yet — encourage them to start writing!');
  }

  // Memory context
  if (memory) {
    const facts = (memory.facts || []) as string[];
    const prefs = (memory.preferences || {}) as Record<string, any>;
    if (facts.length > 0) {
      contextParts.push(`\nThings I remember about this student:\n${facts.map((f: string) => `  - ${f}`).join('\n')}`);
    }
    if (Object.keys(prefs).length > 0) {
      contextParts.push(`\nPreferences: ${JSON.stringify(prefs)}`);
    }
  }

  const fullSystem = `${AGENT_SYSTEM_PROMPT}\n\n--- STUDENT DATA ---\n${contextParts.join('\n')}\n--- END STUDENT DATA ---\n\nIMPORTANT: After your response, if you learned any NEW facts about the student (goals, dream schools, personality, preferences, deadlines, concerns), output them on a final line starting with "MEMORY_UPDATE:" followed by a JSON array of new fact strings. Only include genuinely new information, not things already in the student data above. If nothing new was learned, do not include the MEMORY_UPDATE line.`;

  // Build messages array
  const apiMessages = prevMessages.map((m: any) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content as string,
  }));
  apiMessages.push({ role: 'user' as const, content: message });

  const client = getAIClient()!;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: fullSystem,
      messages: apiMessages,
    });

    let reply = response.content
      .filter(b => b.type === 'text')
      .map(b => b.type === 'text' ? b.text : '')
      .join('');

    // Extract memory updates (multiline-safe without 's' flag)
    const memoryMatch = reply.match(/MEMORY_UPDATE:\s*(\[[\s\S]*\])\s*$/);
    let newFacts: string[] = [];
    if (memoryMatch) {
      reply = reply.replace(/MEMORY_UPDATE:\s*\[[\s\S]*\]\s*$/, '').trim();
      try {
        newFacts = JSON.parse(memoryMatch[1]);
      } catch {}
    }

    // Save messages to conversation
    const userMsgId = genId('msg');
    const assistMsgId = genId('amsg');
    const titleUpdate = prevMessages.length === 0 ? `, title = $4` : '';
    const titleParams = prevMessages.length === 0 ? [convId, new Date(), new Date(), message.slice(0, 80)] : [convId, new Date(), new Date()];

    await Promise.all([
      prisma.$executeRawUnsafe(
        `INSERT INTO agent_messages (id, "conversationId", role, content, "createdAt") VALUES ($1, $2, 'user', $3, NOW())`,
        userMsgId, convId, message
      ),
      prisma.$executeRawUnsafe(
        `INSERT INTO agent_messages (id, "conversationId", role, content, "createdAt") VALUES ($1, $2, 'assistant', $3, NOW())`,
        assistMsgId, convId, reply
      ),
      prisma.$executeRawUnsafe(
        prevMessages.length === 0
          ? `UPDATE agent_conversations SET "updatedAt" = NOW(), title = $2 WHERE id = $1`
          : `UPDATE agent_conversations SET "updatedAt" = NOW() WHERE id = $1`,
        convId,
        ...(prevMessages.length === 0 ? [message.slice(0, 80)] : [])
      ),
    ]);

    // Update memory if new facts learned
    if (newFacts.length > 0) {
      const existing = memory ? ((memory.facts || []) as string[]) : [];
      const merged = [...existing, ...newFacts].slice(-50); // Keep last 50 facts
      const mergedJson = JSON.stringify(merged);
      const prefsJson = JSON.stringify(memory?.preferences || {});

      if (memory) {
        await prisma.$executeRawUnsafe(
          `UPDATE agent_memories SET facts = $1::jsonb, "updatedAt" = NOW() WHERE "userId" = $2`,
          mergedJson, userId
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO agent_memories (id, "userId", facts, preferences, "updatedAt") VALUES ($1, $2, $3::jsonb, $4::jsonb, NOW())`,
          genId('mem'), userId, mergedJson, prefsJson
        );
      }
    }

    return res.json({ reply, conversationId: convId, available: true });
  } catch (e) {
    console.error('Agent error:', (e as Error).message);
    return res.status(500).json({ error: 'AI request failed' });
  }
}
