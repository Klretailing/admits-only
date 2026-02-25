import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';

// ─── Essay scoring engine ───

// Common filler / low-quality patterns that AI generators tend to produce
const AI_PATTERNS = [
  /\bin conclusion\b/gi,
  /\bfurthermore\b/gi,
  /\bmoreover\b/gi,
  /\bit is worth noting\b/gi,
  /\bit is important to note\b/gi,
  /\bin today'?s (?:world|society|day and age)\b/gi,
  /\bas a matter of fact\b/gi,
  /\bdelve\b/gi,
  /\btapestry\b/gi,
  /\bundeniably\b/gi,
  /\bholistic\b/gi,
  /\bleverage\b/gi,
  /\bparadigm\b/gi,
  /\bsynergy\b/gi,
  /\bplethora\b/gi,
  /\bmyriad of\b/gi,
  /\bcrucial\b/gi,
  /\bpivotal\b/gi,
  /\bseamless(?:ly)?\b/gi,
  /\bembark on (?:a|this) journey\b/gi,
  /\bthis essay (?:will|aims to)\b/gi,
  /\boverall[,]? (?:it can be|we can)\b/gi,
];

// Structural patterns typical of AI text
const AI_STRUCTURAL = [
  /^(?:In |The |This |It is |One of |There (?:is|are) )/m, // generic sentence starters
  /\b(?:firstly|secondly|thirdly|lastly)\b/gi,
  /\b(?:on the other hand|that being said|having said that)\b/gi,
];

// Vocabulary sophistication – SAT-level words (subset)
const ADVANCED_VOCAB = [
  'ambivalent', 'ephemeral', 'juxtapose', 'nuance', 'paradigm', 'quintessential',
  'ubiquitous', 'vicarious', 'anomaly', 'dichotomy', 'eloquent', 'fervent',
  'gregarious', 'idiosyncratic', 'labyrinth', 'meticulous', 'nonchalant', 'ostentatious',
  'pragmatic', 'resilient', 'sagacious', 'tenacious', 'vivacious', 'zealous',
  'ameliorate', 'benevolent', 'cacophony', 'diligent', 'ebullient', 'fortuitous',
  'galvanize', 'harbinger', 'impervious', 'kinetic', 'lucid', 'magnanimous',
  'nascent', 'obfuscate', 'penchant', 'recalcitrant', 'sanguine', 'tangential',
  'undulate', 'venerate', 'whimsical', 'acumen', 'brevity', 'candor',
  'deft', 'equanimity', 'fastidious', 'gratuitous', 'hubris', 'innate',
  'judicious', 'keen', 'lament', 'magnify', 'negligent', 'opaque',
  'pervasive', 'querulous', 'rectify', 'succinct', 'trepidation', 'unequivocal',
];

// Common grammar issues (simplified heuristics)
const GRAMMAR_ISSUES = [
  { pattern: /\bi\b/g, msg: 'lowercase I' }, // lowercase personal pronoun
  { pattern: /\s{2,}/g, msg: 'double spaces' },
  { pattern: /[.!?]\s*[a-z]/g, msg: 'lowercase after sentence-ending punctuation' },
  { pattern: /\b(their|there|they're)\b.*\b(their|there|they're)\b/gi, msg: 'their/there/they\'re confusion potential' },
  { pattern: /\b(your|you're)\b.*\b(your|you're)\b/gi, msg: 'your/you\'re confusion potential' },
  { pattern: /\b(its|it's)\b.*\b(its|it's)\b/gi, msg: 'its/it\'s confusion potential' },
  { pattern: /\balot\b/gi, msg: '"alot" should be "a lot"' },
  { pattern: /\bcould of\b/gi, msg: '"could of" should be "could have"' },
  { pattern: /\bshould of\b/gi, msg: '"should of" should be "should have"' },
  { pattern: /\bwould of\b/gi, msg: '"would of" should be "would have"' },
  { pattern: /([.!?])\1{2,}/g, msg: 'excessive punctuation' },
  { pattern: /\bvery\s+very\b/gi, msg: 'repeated "very"' },
];

// Benchmark phrases from strong college essays for originality comparison
const CLICHE_PHRASES = [
  'changed my life', 'eye-opening experience', 'made me who i am today',
  'since i was a child', 'ever since i can remember', 'throughout my life',
  'passion for helping others', 'diverse background', 'global citizen',
  'giving back to the community', 'step outside my comfort zone',
  'learn from my mistakes', 'the world around me', 'opened my eyes',
  'broaden my horizons', 'follow my dreams', 'make a difference',
  'hard work and dedication', 'never give up', 'once in a lifetime',
  'be the change', 'a rewarding experience', 'shaped who i am',
  'at the end of the day', 'in the grand scheme of things',
];

function scoreEssay(content: string) {
  if (!content || content.trim().length < 50) {
    return { aiScore: null, vocabScore: null, grammarScore: null, originalityScore: null, overallScore: null };
  }

  const text = content.trim();
  const words = text.split(/\s+/);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);
  const avgSentenceLen = wordCount / sentenceCount;
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z']/g, '')));
  const lexicalDiversity = uniqueWords.size / Math.max(wordCount, 1);

  // ─── AI Detection Score (lower = more likely AI-generated) ───
  // We want a HIGH score to mean "likely human-written"
  let aiFlags = 0;
  const totalAiPatterns = AI_PATTERNS.length + AI_STRUCTURAL.length;

  for (const pat of AI_PATTERNS) {
    const matches = text.match(pat);
    if (matches) aiFlags += matches.length;
  }
  for (const pat of AI_STRUCTURAL) {
    const matches = text.match(pat);
    if (matches) aiFlags += matches.length * 0.5;
  }

  // Sentence length uniformity (AI tends to produce uniform-length sentences)
  if (sentenceCount >= 3) {
    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length;
    const cv = Math.sqrt(variance) / Math.max(mean, 1); // coefficient of variation
    // Low variance = possibly AI; human writing varies more
    if (cv < 0.25) aiFlags += 3;
    else if (cv < 0.35) aiFlags += 1.5;
  }

  // Paragraph structure check - AI tends to have very regular paragraph sizes
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  if (paragraphs.length >= 3) {
    const pLengths = paragraphs.map(p => p.trim().split(/\s+/).length);
    const pMean = pLengths.reduce((a, b) => a + b, 0) / pLengths.length;
    const pVariance = pLengths.reduce((sum, l) => sum + Math.pow(l - pMean, 2), 0) / pLengths.length;
    const pCv = Math.sqrt(pVariance) / Math.max(pMean, 1);
    if (pCv < 0.15) aiFlags += 2;
  }

  // Score: normalize flags against text length, cap penalty
  const flagDensity = aiFlags / Math.max(wordCount / 100, 1);
  // AI score: % likelihood it's human-written (high = human)
  const aiScore = Math.max(0, Math.min(100, Math.round(100 - flagDensity * 12)));

  // ─── Vocabulary Score ───
  const lowerWords = words.map(w => w.toLowerCase().replace(/[^a-z']/g, ''));
  let advancedCount = 0;
  for (const word of lowerWords) {
    if (ADVANCED_VOCAB.includes(word)) advancedCount++;
  }
  const advancedRatio = advancedCount / Math.max(wordCount, 1);
  // Also factor in lexical diversity
  const vocabRaw = (advancedRatio * 500) + (lexicalDiversity * 60);
  // Bonus for appropriate essay length (500-700 is ideal for college essays)
  const lengthBonus = wordCount >= 400 && wordCount <= 800 ? 10 : wordCount >= 250 ? 5 : 0;
  const vocabScore = Math.max(10, Math.min(100, Math.round(vocabRaw + lengthBonus)));

  // ─── Grammar Score ───
  let grammarIssues = 0;
  for (const rule of GRAMMAR_ISSUES) {
    const matches = text.match(rule.pattern);
    if (matches) grammarIssues += matches.length;
  }
  // Check for sentence fragments (very short sentences)
  const fragments = sentences.filter(s => s.trim().split(/\s+/).length < 3 && s.trim().length > 0);
  grammarIssues += Math.max(0, fragments.length - 1); // Allow one for style

  const grammarPenalty = grammarIssues / Math.max(sentenceCount, 1);
  const grammarScore = Math.max(15, Math.min(100, Math.round(100 - grammarPenalty * 25)));

  // ─── Originality Score ───
  const lowerText = text.toLowerCase();
  let clicheCount = 0;
  for (const phrase of CLICHE_PHRASES) {
    if (lowerText.includes(phrase)) clicheCount++;
  }
  // Penalize cliches, reward unique phrasing
  const clichePenalty = clicheCount * 8;
  // Reward higher lexical diversity
  const diversityBonus = lexicalDiversity > 0.55 ? 15 : lexicalDiversity > 0.45 ? 8 : 0;
  // Reward varied sentence structure
  const structureBonus = avgSentenceLen > 12 && avgSentenceLen < 25 ? 10 : 0;
  const originalityScore = Math.max(10, Math.min(100, Math.round(75 - clichePenalty + diversityBonus + structureBonus)));

  // ─── Overall Quality Score ───
  // Weighted: Grammar 25%, Vocabulary 20%, Originality 25%, AI-Human 15%, Length appropriateness 15%
  const lengthScore = wordCount >= 500 && wordCount <= 700 ? 100 :
    wordCount >= 400 && wordCount <= 800 ? 80 :
    wordCount >= 250 && wordCount <= 1000 ? 60 :
    wordCount >= 100 ? 40 : 20;

  const overallScore = Math.max(5, Math.min(100, Math.round(
    grammarScore * 0.25 +
    vocabScore * 0.20 +
    originalityScore * 0.25 +
    aiScore * 0.15 +
    lengthScore * 0.15
  )));

  return {
    aiScore: Math.round(100 - aiScore), // Convert to "% AI-generated" (low = good)
    vocabScore: Math.round(vocabScore),
    grammarScore: Math.round(grammarScore),
    originalityScore: Math.round(originalityScore),
    overallScore: Math.round(overallScore),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  await ensureSchema();
  const userId = (session.user as any).id as string;

  // GET: list all essays for this user
  if (req.method === 'GET') {
    const essays = await prisma.essay.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ essays });
  }

  // POST: create a new essay
  if (req.method === 'POST') {
    const { title, prompt, content } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const scores = scoreEssay(content || '');

    const essay = await prisma.essay.create({
      data: {
        userId,
        title: title.trim(),
        prompt: (prompt || '').trim(),
        content: (content || '').trim(),
        status: content && content.trim().length > 50 ? 'Draft' : 'Not Started',
        ...scores,
      },
    });
    return res.status(201).json({ essay });
  }

  // PUT: update an existing essay
  if (req.method === 'PUT') {
    const { id, title, prompt, content, status } = req.body;
    if (!id) return res.status(400).json({ error: 'Essay ID is required' });

    // Verify ownership
    const existing = await prisma.essay.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Essay not found' });

    const scores = scoreEssay(content || existing.content);

    const essay = await prisma.essay.update({
      where: { id },
      data: {
        ...(title != null ? { title: title.trim() } : {}),
        ...(prompt != null ? { prompt: prompt.trim() } : {}),
        ...(content != null ? { content: content.trim() } : {}),
        ...(status != null ? { status } : {}),
        ...scores,
      },
    });
    return res.json({ essay });
  }

  // DELETE: remove an essay
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Essay ID is required' });

    const existing = await prisma.essay.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Essay not found' });

    await prisma.essay.delete({ where: { id } });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
