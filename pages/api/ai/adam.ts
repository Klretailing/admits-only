import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';
import { isAIEnabled, getAIClient } from '../../../lib/ai';
import { ADAM_PERSONA, ADAM_KNOWLEDGE } from '../../../lib/adamKnowledge';

// Adam — the deeply-knowledgeable, memory-having AI college counselor.
//
// The system prompt is an array of blocks ordered stable -> volatile so that the
// large ADAM_KNOWLEDGE block can be prompt-cached (cache_control on it). The
// persona + knowledge bytes are static (imported constants, never interpolated),
// so the cache stays warm across requests. Only the last block (the student's
// synthesis + live data) changes per turn, and it is NOT cached.

const ADAM_MODEL = process.env.ADAM_MODEL || 'claude-haiku-4-5';
const ADAM_MEMORY_MODEL = process.env.ADAM_MEMORY_MODEL || 'claude-haiku-4-5';

const HISTORY_LIMIT = 20; // prior turns fed to the model
const RESTORE_LIMIT = 50; // messages returned to the client on GET
const SYNTHESIS_EVERY = 4; // turnsSinceSynthesis threshold to refresh memory

type ChatRole = 'user' | 'assistant';

// ---- helpers ---------------------------------------------------------------

function fmtNum(v: any): string | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (Number.isNaN(n)) return typeof v === 'string' ? v : null;
  return String(n);
}

// Build a compact "STUDENT DATA" block from the student's real records.
// Every sub-query is wrapped so missing data never throws.
async function buildStudentData(userId: string): Promise<string> {
  const lines: string[] = [];

  // --- profile / scores ---
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT * FROM "student_profiles" WHERE "userId" = ${userId}
    `;
    const p = rows[0];
    if (p) {
      const bits: string[] = [];
      const gpa = fmtNum(p.gpa);
      const gpaW = fmtNum(p.gpaWeighted);
      if (gpa) bits.push(`GPA ${gpa}${gpaW ? ` (weighted ${gpaW})` : ''}`);
      else if (gpaW) bits.push(`Weighted GPA ${gpaW}`);
      const satM = fmtNum(p.satMath);
      const satR = fmtNum(p.satRW);
      if (satM || satR) {
        const total = satM && satR ? Number(satM) + Number(satR) : null;
        bits.push(`SAT ${total ? `${total} (` : ''}Math ${satM || '?'} / RW ${satR || '?'}${total ? ')' : ''}`);
      }
      const act = fmtNum(p.actScore);
      if (act) bits.push(`ACT ${act}`);
      const holistic = fmtNum(p.holisticScore);
      if (holistic) bits.push(`AdmitsOnly holistic score ${holistic}`);
      const pct = fmtNum(p.percentile);
      if (pct) bits.push(`${pct}th percentile`);
      lines.push(bits.length ? `Academics: ${bits.join(', ')}.` : 'Academics: profile exists but key fields are blank.');
    } else {
      lines.push('Academics: no profile filled in yet.');
    }
  } catch {
    lines.push('Academics: unavailable.');
  }

  // --- essays (metadata only, never content) ---
  try {
    const essays: any[] = await prisma.$queryRaw`
      SELECT "title", "prompt", "status", "overallScore", "updatedAt"
      FROM "essays" WHERE "userId" = ${userId}
      ORDER BY "updatedAt" DESC LIMIT 8
    `;
    if (essays && essays.length) {
      const items = essays.map((e) => {
        const title = e.title || 'Untitled';
        const status = e.status ? `, ${e.status}` : '';
        const score = e.overallScore !== null && e.overallScore !== undefined ? `, score ${fmtNum(e.overallScore)}` : '';
        return `"${title}"${status}${score}`;
      });
      lines.push(`Essays (${essays.length}): ${items.join('; ')}.`);
    } else {
      lines.push('Essays: none started yet.');
    }
  } catch {
    lines.push('Essays: unavailable.');
  }

  // --- saved applications (jsonb list of {name,type,deadline,status}) ---
  try {
    const appRows: any[] = await prisma.$queryRaw`
      SELECT "data" FROM "saved_applications" WHERE "userId" = ${userId}
    `;
    let apps: any = appRows[0]?.data ?? [];
    if (typeof apps === 'string') {
      try { apps = JSON.parse(apps); } catch { apps = []; }
    }
    if (Array.isArray(apps) && apps.length) {
      const items = apps.slice(0, 15).map((a: any) => {
        const name = a?.name || 'School';
        const type = a?.type ? ` (${a.type})` : '';
        const status = a?.status ? `, ${a.status}` : '';
        const deadline = a?.deadline ? `, due ${a.deadline}` : '';
        return `${name}${type}${status}${deadline}`;
      });
      lines.push(`College list (${apps.length}): ${items.join('; ')}.`);
    } else {
      lines.push('College list: no schools saved yet.');
    }
  } catch {
    lines.push('College list: unavailable.');
  }

  return lines.join('\n');
}

// Load or lazily create the student's Adam memory row.
async function loadOrCreateMemory(userId: string): Promise<{
  synthesis: string;
  turnsSinceSynthesis: number;
  totalTurns: number;
}> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT "synthesis", "turnsSinceSynthesis", "totalTurns"
      FROM "adam_memory" WHERE "userId" = ${userId}
    `;
    if (rows[0]) {
      return {
        synthesis: rows[0].synthesis || '',
        turnsSinceSynthesis: Number(rows[0].turnsSinceSynthesis) || 0,
        totalTurns: Number(rows[0].totalTurns) || 0,
      };
    }
    await prisma.$executeRaw`
      INSERT INTO "adam_memory" ("userId", "synthesis", "facts", "turnsSinceSynthesis", "totalTurns")
      VALUES (${userId}, '', '[]'::jsonb, 0, 0)
      ON CONFLICT ("userId") DO NOTHING
    `;
  } catch {
    // fall through to default
  }
  return { synthesis: '', turnsSinceSynthesis: 0, totalTurns: 0 };
}

// Extract concatenated text from a Claude response.
function extractText(response: any): string {
  try {
    return (response?.content || [])
      .filter((b: any) => b?.type === 'text')
      .map((b: any) => b.text)
      .join('')
      .trim();
  } catch {
    return '';
  }
}

// Fire the cheap memory-synthesis update. Never throws — a synthesis failure
// must never break the chat turn.
async function updateSynthesis(
  userId: string,
  priorSynthesis: string,
  recentTurns: Array<{ role: ChatRole; content: string }>,
  studentData: string,
): Promise<void> {
  try {
    const client = getAIClient();
    if (!client) return;

    const convo = recentTurns
      .slice(-8)
      .map((t) => `${t.role === 'user' ? 'Student' : 'Adam'}: ${t.content}`)
      .join('\n');

    const prompt = `You maintain a compact, first-person-about-the-student memory that Adam (an AI college counselor) uses to stay grounded across conversations.

Current understanding of this student:
${priorSynthesis || '(nothing yet)'}

Their current data:
${studentData}

Recent conversation:
${convo}

Write an UPDATED understanding of this student in 4-8 sentences: their goals (intended major, target schools/type), academic standing, what they're working on, their worries, and anything notable Adam should remember. Be concrete and specific (e.g. "aiming for CS at UC schools; strong in math but anxious about the personal statement; list is reach-heavy"). Do NOT address the student — describe them. Output only the updated understanding, no preamble.`;

    const resp = await client.messages.create({
      model: ADAM_MEMORY_MODEL,
      max_tokens: 500,
      system: 'You produce terse, accurate student profiles for a college counselor to reference. Output only the profile text.',
      messages: [{ role: 'user', content: prompt }],
    });

    const updated = extractText(resp);
    if (updated) {
      await prisma.$executeRaw`
        UPDATE "adam_memory"
        SET "synthesis" = ${updated}, "turnsSinceSynthesis" = 0, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = ${userId}
      `;
    }
  } catch (e) {
    console.error('Adam synthesis update failed:', (e as Error)?.message);
  }
}

// ---- handler ---------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = (session.user as any).id;
  await ensureSchema();

  // ---- GET: restore the persisted thread --------------------------------
  if (req.method === 'GET') {
    try {
      const rows: any[] = await prisma.$queryRaw`
        SELECT "id", "role", "content", "createdAt"
        FROM "adam_messages" WHERE "userId" = ${userId}
        ORDER BY "createdAt" DESC LIMIT ${RESTORE_LIMIT}
      `;
      const messages = rows.reverse().map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }));
      return res.json({ messages, available: isAIEnabled() });
    } catch {
      return res.json({ messages: [], available: isAIEnabled() });
    }
  }

  // ---- DELETE: start fresh ----------------------------------------------
  if (req.method === 'DELETE') {
    try {
      await prisma.$executeRaw`DELETE FROM "adam_messages" WHERE "userId" = ${userId}`;
      await prisma.$executeRaw`
        UPDATE "adam_memory"
        SET "synthesis" = '', "facts" = '[]'::jsonb, "turnsSinceSynthesis" = 0, "totalTurns" = 0, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = ${userId}
      `;
    } catch (e) {
      console.error('Adam reset error:', (e as Error)?.message);
    }
    return res.json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ---- POST: a new chat turn --------------------------------------------
  if (!isAIEnabled()) {
    return res.status(503).json({
      error: 'Adam is not configured. Add ANTHROPIC_API_KEY to enable.',
      available: false,
    });
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  // 1. Load prior turns (chronological).
  let priorTurns: Array<{ role: ChatRole; content: string }> = [];
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT "role", "content" FROM "adam_messages" WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC LIMIT ${HISTORY_LIMIT}
    `;
    priorTurns = rows
      .reverse()
      .filter((r) => r.role === 'user' || r.role === 'assistant')
      .map((r) => ({ role: r.role as ChatRole, content: String(r.content || '') }));
  } catch {
    priorTurns = [];
  }

  // 2. Student data block (defensive inside).
  const studentData = await buildStudentData(userId);

  // 3. Memory row.
  const memory = await loadOrCreateMemory(userId);
  const synthesis = memory.synthesis && memory.synthesis.trim().length
    ? memory.synthesis.trim()
    : '(No saved understanding yet — this is an early conversation. Learn who they are.)';

  // 4. Call Claude. System array is stable -> volatile; cache the knowledge block.
  const system = [
    { type: 'text', text: ADAM_PERSONA },
    { type: 'text', text: ADAM_KNOWLEDGE, cache_control: { type: 'ephemeral' } },
    {
      type: 'text',
      text: `# What Adam knows about this student\n${synthesis}\n\n# Current student data\n${studentData}`,
    },
  ];

  const client = getAIClient()!;
  let reply = '';
  try {
    const response = await client.messages.create({
      model: ADAM_MODEL,
      max_tokens: 1200,
      // Default 5-minute ephemeral cache — no beta header required; the frozen
      // knowledge prefix is re-read at ~0.1x within an active conversation.
      system: system as any,
      messages: [
        ...priorTurns.map((t) => ({ role: t.role, content: t.content })),
        { role: 'user' as const, content: message },
      ],
    });
    reply = extractText(response);
  } catch (e: any) {
    const errMsg = e?.message || String(e);
    console.error('Adam chat error:', errMsg);

    if (errMsg.includes('credit balance is too low') || errMsg.includes('billing')) {
      return res.status(503).json({ error: 'billing', errorCode: 'BILLING', available: false });
    }
    if (errMsg.includes('authentication') || errMsg.includes('invalid x-api-key') || e?.status === 401) {
      return res.status(503).json({ error: 'invalid_key', errorCode: 'INVALID_KEY', available: false });
    }
    if (errMsg.includes('rate limit') || e?.status === 429) {
      return res.status(429).json({ error: 'Rate limited — please wait a moment and try again.' });
    }
    return res.status(500).json({ error: 'Adam request failed' });
  }

  if (!reply) {
    reply = "Sorry — I couldn't put a reply together just then. Mind trying that again?";
  }

  // 5. Persist both messages + bump counters.
  try {
    const now = Date.now();
    const userMsgId = `am_${now.toString(36)}_${randomUUID().slice(0, 8)}`;
    const asstMsgId = `am_${(now + 1).toString(36)}_${randomUUID().slice(0, 8)}`;
    await prisma.$executeRaw`
      INSERT INTO "adam_messages" ("id", "userId", "role", "content")
      VALUES (${userMsgId}, ${userId}, 'user', ${message})
    `;
    await prisma.$executeRaw`
      INSERT INTO "adam_messages" ("id", "userId", "role", "content", "createdAt")
      VALUES (${asstMsgId}, ${userId}, 'assistant', ${reply}, CURRENT_TIMESTAMP + INTERVAL '1 millisecond')
    `;
    await prisma.$executeRaw`
      UPDATE "adam_memory"
      SET "totalTurns" = "totalTurns" + 1,
          "turnsSinceSynthesis" = "turnsSinceSynthesis" + 1,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = ${userId}
    `;
  } catch (e) {
    console.error('Adam persist error:', (e as Error)?.message);
  }

  // 6. Memory feedback loop — fire-and-forget so it never delays/breaks the reply.
  if (memory.turnsSinceSynthesis + 1 >= SYNTHESIS_EVERY) {
    const turnsForSynthesis = [
      ...priorTurns,
      { role: 'user' as ChatRole, content: message },
      { role: 'assistant' as ChatRole, content: reply },
    ];
    // Not awaited: the chat reply returns immediately regardless of synthesis.
    void updateSynthesis(userId, memory.synthesis || '', turnsForSynthesis, studentData);
  }

  // 7. Return the reply.
  return res.json({ reply, available: true });
}
