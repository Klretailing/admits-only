import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';
import { SCHOOLS, PROMPT_TYPES as SUPP_PROMPT_TYPES, getPromptTypeInfo, findSchoolByName, findReuseOpportunities, type SchoolData, type SupplementalPrompt, type ReuseMatch, type PromptType as SuppPromptType } from '../../lib/schoolData';
import { analyzeSentences, computeStats, type AnalyzedSentence, type AnalysisStats } from '../../lib/sentenceAnalysis';
import { checkGrammar, applyFix, type GrammarIssue } from '../../lib/grammarCheck';
import { tracker } from '../../lib/analytics';

/* ══════════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════════ */

interface Essay {
  id: string;
  title: string;
  prompt: string;
  content: string;
  status: string;
  aiScore: number | null;
  vocabScore: number | null;
  grammarScore: number | null;
  originalityScore: number | null;
  overallScore: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Extracurricular {
  id: string;
  name: string;
  role: string;
  description: string;
  years: number;
  hoursPerWeek: number;
  category: string;
}

const statusColors: Record<string, string> = {
  'Complete': 'bg-green-100 text-green-700',
  'In Review': 'bg-accent/10 text-accent',
  'Draft': 'bg-amber-100 text-amber-700',
  'Not Started': 'bg-slate-100 text-slate-500',
};

/* ══════════════════════════════════════════════════════════════════════
   PROMPT-AWARE EC SUGGESTION ENGINE
   ══════════════════════════════════════════════════════════════════════ */

const CATEGORY_MAP: Record<string, string> = {
  'Athletics': 'Sport', 'Arts & Music': 'Recreational Programs', 'STEM / Research': 'Research',
  'Community Service': 'Volunteering', 'Leadership / Government': 'Clubs',
  'Clubs & Organizations': 'Clubs', 'Work / Internship': 'Internship', 'Other': 'Clubs',
};
function normalizeBucket(cat: string) { return CATEGORY_MAP[cat] || cat; }

/* ─── Prompt type classification ─── */

interface PromptType {
  key: string;
  label: string;
  keywords: RegExp;
  aoLookingFor: string;
}

const PROMPT_TYPES: PromptType[] = [
  { key: 'creativity', label: 'Creativity & Innovation', keywords: /\b(?:creativ|innovat|invent|imagin|design|original|unique|artistic|unconventional)\b/i, aoLookingFor: 'Unique thinking, risk-taking, ability to see problems differently' },
  { key: 'challenge', label: 'Challenge & Resilience', keywords: /\b(?:challeng|overcome|obstacle|difficult|failure|setback|struggle|hardship|adversity|resilient|persever)\b/i, aoLookingFor: 'Self-awareness, growth mindset, resilience, learning from failure' },
  { key: 'leadership', label: 'Leadership & Influence', keywords: /\b(?:lead|leadership|influence|guide|mentor|direct|manage|organiz|initiative|responsibilit)\b/i, aoLookingFor: 'Impact on others, decision-making, inspiring action, servant leadership' },
  { key: 'community', label: 'Community & Service', keywords: /\b(?:communit|service|volunteer|help|impact|give\s*back|serve|support|advocate|social)\b/i, aoLookingFor: 'Empathy, civic engagement, understanding of systemic issues' },
  { key: 'growth', label: 'Personal Growth', keywords: /\b(?:grow|learn|develop|change|transform|evolve|mature|discover|realiz|perspective|understand)\b/i, aoLookingFor: 'Self-reflection, intellectual curiosity, ability to change perspectives' },
  { key: 'passion', label: 'Passion & Dedication', keywords: /\b(?:passion|love|dedicate|commit|care|inspire|drive|motivate|fascinate|obsess|pursue)\b/i, aoLookingFor: 'Sustained commitment, genuine enthusiasm, depth over breadth' },
  { key: 'identity', label: 'Identity & Values', keywords: /\b(?:identity|culture|heritage|background|who\s*I\s*am|define|values|belief|family|tradition)\b/i, aoLookingFor: 'Self-awareness, cultural consciousness, authenticity' },
  { key: 'teamwork', label: 'Collaboration', keywords: /\b(?:team|collaborat|together|group|cooperat|collective|partner|peer)\b/i, aoLookingFor: 'Interpersonal skills, humility, ability to elevate others' },
];

function classifyPrompt(prompt: string): { primary: PromptType | null; secondary: PromptType[] } {
  if (!prompt || prompt.trim().length < 5) return { primary: null, secondary: [] };

  const scored = PROMPT_TYPES.map(pt => {
    const matches = prompt.match(pt.keywords);
    return { type: pt, score: matches ? matches.length : 0 };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  return {
    primary: scored[0]?.type || null,
    secondary: scored.slice(1).map(s => s.type),
  };
}

/* ─── Detailed EC suggestion generator ─── */

interface ECInsight {
  ec: Extracurricular;
  mentioned: boolean;
  matchType: string;
  suggestion: string;
  relevanceScore: number;
}

function generateDetailedSuggestion(
  ec: Extracurricular,
  promptType: string,
  bucket: string,
  hasLeadership: boolean,
): string {
  const { name, role, years, hoursPerWeek, description } = ec;

  // ─── Prompt-type × EC-bucket specific suggestions ───
  if (promptType === 'creativity') {
    if (bucket === 'Research') return `Your research in ${name} is inherently creative — you're solving unsolved problems. Describe the moment a hypothesis failed and you had to think differently. What unexpected connection did you make? Paint the scene: the lab at 9 PM, the data that didn't add up, the "what if" that changed everything. AOs at research universities love seeing intellectual creativity in action.`;
    if (bucket === 'Recreational Programs') return `${name} is a direct showcase of your creativity. Don't just say you're creative — show the creative process. Describe staring at a blank canvas/stage/screen, the specific choice you made that felt risky, and the moment it came together. Use sensory details: what did it look/sound/feel like? Let the reader experience your creative mind at work.`;
    if (bucket === 'Clubs') return `As ${role} of ${name}, you've likely solved problems creatively. Describe a specific moment: an event that was failing, a budget crisis, a membership challenge. Walk the reader through your thought process — what conventional solution did you reject, and what unconventional approach did you try? The "how you think" matters more than the outcome.`;
    if (bucket === 'Sport') return `Athletics and creativity might seem unrelated, but ${name} requires tactical creativity. Describe a specific play you designed, a training approach you invented, or a strategy you adapted. The best sports essays show how the field/court/track became your laboratory for creative problem-solving.`;
    if (bucket === 'Volunteering') return `Your volunteering with ${name} could show creative problem-solving in a community context. Describe a moment when the standard approach wasn't working and you improvised — a creative fundraiser, an unconventional way to reach people, a program you redesigned. Show how creativity serves real human needs.`;
    if (bucket === 'Internship') return `Your internship at ${name} likely involved creative problem-solving in a professional setting. Describe a specific project where you approached something differently from what was expected. What was the reaction? How did your fresh perspective as a student bring something new to the table?`;
    return `Your ${years}-year involvement in ${name} has likely produced creative moments. Focus on ONE specific instance where you thought differently. Don't describe creativity in the abstract — show us the moment, the sensory details, the risk, and the result.`;
  }

  if (promptType === 'challenge') {
    if (ec.years >= 3) return `Your ${years}-year commitment to ${name} means you've weathered difficulties most people quit over. Identify the hardest moment — not a dramatic crisis, but the Tuesday afternoon when you wanted to give up. What kept you going? The most compelling challenge essays zoom into a quiet, internal struggle rather than an external event.`;
    if (hasLeadership) return `As ${role} of ${name}, you've faced leadership challenges that test character. Describe a specific decision where the right choice wasn't obvious — maybe you had to give tough feedback, manage a conflict, or make an unpopular call. Show your thought process, not just the outcome. AOs want to see how you handle pressure.`;
    if (bucket === 'Sport') return `${name} is built on overcoming challenges. But skip the generic "we lost the championship" story. Instead, describe a personal challenge — an injury, a position change, a teammate conflict, or the gap between your expectations and your performance. The most honest sports essays are about what the scoreboard doesn't show.`;
    if (bucket === 'Research') return `Research is fundamentally about facing failure. Describe a specific setback in ${name} — an experiment that repeatedly failed, a mentor's criticism that stung, a peer review that humbled you. Then show how you adapted. The best research essays reveal not just grit, but intellectual honesty about what you don't know.`;
    return `Think about a specific moment in ${name} when things didn't go as planned. Avoid starting with the challenge itself — start with the moment right before, when everything seemed fine. Then reveal the obstacle. This narrative structure creates tension and keeps the reader engaged.`;
  }

  if (promptType === 'leadership') {
    if (hasLeadership) return `Your title as ${role} of ${name} gives you credibility, but don't lean on the title. Describe a specific moment where you influenced outcomes — a meeting where you changed the group's direction, a person you mentored through difficulty, a system you rebuilt. Use dialogue: what exactly did you say? What did someone say back? Show leadership as action, not position.`;
    if (bucket === 'Sport') return `Even without a captain title, ${name} involves constant micro-leadership. Describe a practice or game moment where you stepped up — encouraging a struggling teammate, calling an audible, staying late to help someone improve. The most memorable leadership essays are about quiet influence, not spotlight moments.`;
    if (bucket === 'Volunteering') return `Volunteering with ${name} is service leadership — leading by doing. Describe a moment where you saw a need nobody else noticed and took initiative. How did you mobilize others? What resistance did you face? Service leadership is about influence without authority, which is exactly what AOs look for.`;
    return `Leadership in ${name} doesn't require a title. Describe a moment where you took initiative without being asked. Maybe you noticed a gap and filled it, suggested a new direction, or supported someone who was struggling. The best leadership essays show self-motivated action with impact on others.`;
  }

  if (promptType === 'community') {
    if (bucket === 'Volunteering') return `Your work with ${name} is a natural fit. But don't write a generic "I helped people and it felt good" essay. Zoom into ONE person or ONE moment. Describe them specifically — their name (or a pseudonym), their situation, the look on their face. Then reflect on what that interaction revealed about the community, about the system, and about yourself. That specificity is what AOs remember.`;
    if (bucket === 'Clubs') return `${name} is a community in itself. Describe how you built or strengthened that community — a new member you welcomed, a culture you shifted, a tradition you started. The best community essays aren't about doing service TO others but building community WITH others.`;
    if (bucket === 'Sport') return `Your team in ${name} is a community. Describe the bonds, the rituals, the unspoken rules. Then show a moment where that community was tested — a loss, a conflict, a departure. How did you contribute to holding it together? Sports communities are deeply human, and AOs see right through generic teamwork claims.`;
    return `Think about how ${name} connects you to a community you might not otherwise know. Describe a specific person you encountered through this activity. What did they teach you about a world different from your own? Community essays that show genuine learning (not performative empathy) stand out.`;
  }

  if (promptType === 'passion') {
    if (ec.hoursPerWeek >= 8) return `You dedicate ${hoursPerWeek} hours a week to ${name} — that's not obligation, that's love. But don't just say "I'm passionate about ${name}." Instead, describe the moment this shifted from activity to identity. What were you doing when you realized this is who you are? Describe the physical sensation of being in the zone. AOs can feel genuine passion through specific, sensory writing.`;
    if (ec.years >= 3) return `${years} years with ${name} is a long relationship. Describe how your passion evolved — the early excitement, the plateau where it got boring, and the deeper engagement that came after. This arc from infatuation → routine → mature commitment mirrors what colleges want in a student: someone who pushes through the boring parts.`;
    return `Your involvement in ${name} could powerfully illustrate dedication. Describe a moment that captures WHY you do this. Not the achievements, not the résumé line — the intrinsic pull. What does it feel like when you're in the middle of it? What do you sacrifice for it? That's what makes a passion essay real.`;
  }

  if (promptType === 'growth') {
    if (ec.years >= 2) return `Over ${years} years in ${name}, you've inevitably changed. Contrast your day-one self with who you are now. Be specific: what did you believe then that you've since questioned? What skill felt impossible at first? Show the reader two versions of yourself, and let the gap between them reveal your growth. The transformation is the essay.`;
    if (hasLeadership) return `Stepping into the role of ${role} at ${name} likely changed how you see yourself. Describe a specific responsibility that stretched you — not in the "I grew as a leader" cliché way, but in a way that surprised you. Maybe you discovered you're more patient than you thought, or more uncomfortable with conflict. Honest self-assessment impresses AOs more than heroic narratives.`;
    return `${name} has shaped you, even in ways you might not expect. Think about a belief or assumption you held before joining, and how your experience changed it. Growth essays that show intellectual or emotional evolution (not just skill development) are the ones that stick with admissions readers.`;
  }

  if (promptType === 'identity') {
    if (bucket === 'Volunteering' || bucket === 'Clubs') return `Your involvement in ${name} likely reflects your values. But instead of stating your values, show them through a specific moment. Describe a decision you made in ${name} that reveals what you stand for — especially one where the right choice cost you something. That tension between values and sacrifice is where identity essays come alive.`;
    return `${name} is part of who you are. Describe a moment where this activity intersected with another part of your identity — your family, your culture, your beliefs. The most compelling identity essays show how different parts of your life connect and sometimes conflict. That complexity is what makes you real to an admissions reader.`;
  }

  // Default: generic but still specific to this EC
  return `Your ${years}-year experience as ${role} in ${name} offers rich material. Choose ONE vivid moment — not a summary, but a scene with specific details. Where were you? What did you see, hear, or feel? What happened next? Then reflect briefly on why it matters. The formula is: Scene + Surprise + Shift in understanding.`;
}

function analyzeEssayECConnections(
  essayContent: string,
  essayPrompt: string,
  ecs: Extracurricular[],
): ECInsight[] {
  if (ecs.length === 0) return [];

  const content = essayContent.toLowerCase();
  const { primary, secondary } = classifyPrompt(essayPrompt);
  const promptType = primary?.key || '';

  const insights: ECInsight[] = [];

  for (const ec of ecs) {
    const nameWords = ec.name.toLowerCase().split(/\s+/).filter(w =>
      w.length > 3 && !['club','team','the','and','for','with','group','society','organization'].includes(w)
    );
    const roleWords = ec.role.toLowerCase().split(/\s+/).filter(w =>
      w.length > 3 && !['member','volunteer','the','and','student','assistant'].includes(w)
    );

    const exactNameMatch = content.includes(ec.name.toLowerCase());
    const nameMatch = !exactNameMatch && nameWords.length > 0 && nameWords.some(w => content.includes(w));
    const roleMatch = roleWords.length > 0 && roleWords.some(w => content.includes(w));

    const mentioned = exactNameMatch || nameMatch || roleMatch;
    const matchType = exactNameMatch ? 'by name' : nameMatch ? 'by keyword' : roleMatch ? 'by role' : '';

    // ─── Relevance scoring: primary prompt type is king ───
    let relevanceScore = 0;
    const bucket = normalizeBucket(ec.category);
    const hasLeadershipRole = /(?:president|founder|captain|leader|chair|director|head|editor|chief|coordinator|manager)/i.test(ec.role);

    // Primary theme match (much higher weight)
    if (promptType) {
      const primaryRelevance = computePromptRelevance(promptType, ec, bucket, hasLeadershipRole);
      relevanceScore += primaryRelevance * 3;
    }

    // Secondary themes (smaller bonus)
    for (const sec of secondary) {
      relevanceScore += computePromptRelevance(sec.key, ec, bucket, hasLeadershipRole) * 0.5;
    }

    // Depth bonus (smaller, shouldn't override prompt relevance)
    if (ec.years >= 3) relevanceScore += 0.5;
    if (ec.hoursPerWeek >= 8) relevanceScore += 0.5;

    // Generate suggestion
    let suggestion = '';
    if (mentioned) {
      suggestion = generateMentionedFeedback(ec, content, promptType);
    } else if (relevanceScore >= 3) {
      suggestion = generateDetailedSuggestion(ec, promptType, bucket, hasLeadershipRole);
    } else if (relevanceScore >= 1.5) {
      suggestion = `Your experience in ${ec.name} could add a supporting detail. As ${ec.role}, you have ${ec.years} years of perspective. Consider a brief reference that connects to your main narrative.`;
    } else {
      suggestion = '';  // Not relevant enough to suggest — will be filtered out
    }

    if (suggestion) {
      insights.push({ ec, mentioned, matchType, suggestion, relevanceScore });
    }
  }

  insights.sort((a, b) => {
    if (a.mentioned && !b.mentioned) return -1;
    if (!a.mentioned && b.mentioned) return 1;
    return b.relevanceScore - a.relevanceScore;
  });

  return insights;
}

function computePromptRelevance(
  promptType: string,
  ec: Extracurricular,
  bucket: string,
  hasLeadership: boolean,
): number {
  const descLower = ec.description.toLowerCase();

  switch (promptType) {
    case 'creativity':
      if (['Recreational Programs', 'Research'].includes(bucket)) return 3;
      if (/(?:creat|design|invent|innovat|built|develop|experiment)/i.test(descLower)) return 2;
      if (['Clubs', 'Internship'].includes(bucket) && hasLeadership) return 1;
      return 0;
    case 'challenge':
      if (ec.years >= 3) return 2;
      if (ec.hoursPerWeek >= 10) return 2;
      if (/(?:overcam|struggled|difficult|failed|setback|obstacle)/i.test(descLower)) return 3;
      if (bucket === 'Sport') return 1.5;
      return 0.5;
    case 'leadership':
      if (hasLeadership) return 3;
      if (/(?:led|manag|organiz|direct|coordinated|mentor|trained)/i.test(descLower)) return 2;
      if (['Clubs', 'Volunteering'].includes(bucket)) return 1;
      return 0;
    case 'community':
      if (bucket === 'Volunteering') return 3;
      if (/(?:communit|serve|helped|impact|advocat|raised|families|students)/i.test(descLower)) return 2;
      if (bucket === 'Clubs') return 1;
      return 0;
    case 'growth':
      if (ec.years >= 2) return 2;
      if (/(?:learn|grew|changed|develop|improved|transform)/i.test(descLower)) return 2;
      return 0.5;
    case 'passion':
      if (ec.hoursPerWeek >= 8) return 2;
      if (ec.years >= 3) return 2;
      if (/(?:passion|love|dedicat|commit|fascin)/i.test(descLower)) return 2;
      return 0.5;
    case 'identity':
      if (/(?:cultur|heritage|identity|tradition|famil|value|belief)/i.test(descLower)) return 3;
      if (['Volunteering', 'Recreational Programs', 'Clubs'].includes(bucket)) return 1;
      return 0;
    case 'teamwork':
      if (['Sport', 'Clubs', 'Volunteering'].includes(bucket)) return 2;
      if (/(?:team|collaborat|together|group)/i.test(descLower)) return 2;
      return 0;
    default:
      return 0;
  }
}

function generateMentionedFeedback(ec: Extracurricular, content: string, promptType: string): string {
  const nameLower = ec.name.toLowerCase();
  // Check depth of mention
  const nameIndex = content.indexOf(nameLower);
  if (nameIndex === -1) {
    return `You're referencing this activity — good. Make sure to ground it with a specific scene: what did you see, hear, or feel in that moment?`;
  }

  // Check how much content surrounds the mention
  const surroundingText = content.substring(Math.max(0, nameIndex - 200), Math.min(content.length, nameIndex + 200));
  const hasSensory = /(?:saw|heard|felt|watched|looked|smelled|tasted|warm|cold|bright|dark|loud)/i.test(surroundingText);
  const hasDialogue = /"[^"]{3,}"/g.test(surroundingText);
  const hasNumbers = /\b\d+\b/.test(surroundingText);

  const improvements: string[] = [];
  if (!hasSensory) improvements.push('add sensory details (what you saw, heard, or felt)');
  if (!hasDialogue) improvements.push('include a line of dialogue to bring the moment to life');
  if (!hasNumbers) improvements.push('add a specific number or date to anchor the reader');

  if (improvements.length === 0) {
    return `Strong use of ${ec.name} — you're showing rather than telling, which is exactly what admissions readers want to see.`;
  }
  return `You mention ${ec.name}, which is great. To make this section more vivid, try to ${improvements.join(', and ')}. These details separate memorable essays from forgettable ones.`;
}

/* ══════════════════════════════════════════════════════════════════════
   LIVE WRITING TIPS ENGINE
   ══════════════════════════════════════════════════════════════════════ */

function generateLiveTips(content: string, prompt: string, ecs: Extracurricular[]): string[] {
  if (!content || content.trim().length < 30) return [];

  const text = content.trim();
  const wordCount = text.split(/\s+/).length;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const tips: string[] = [];

  // ─── Opening analysis ───
  const firstLine = text.split(/[.!?\n]/)[0] || '';
  if (/^I have always /i.test(firstLine)) tips.push('Your opening "I have always..." is one of the most common essay starters. Try opening with a specific moment instead — drop the reader into a scene mid-action.');
  else if (/^Since I was /i.test(firstLine)) tips.push('Starting with "Since I was..." tells your story chronologically. Instead, start with a vivid present-day moment, then flash back. In medias res openings are more engaging.');
  else if (/^Growing up/i.test(firstLine)) tips.push('"Growing up..." is a common opening that distances the reader. Start in a specific moment: describe what you see, hear, or feel RIGHT NOW in the scene.');
  else if (/^In this essay/i.test(firstLine)) tips.push('Never announce what your essay will do. Instead, just do it. Drop the reader directly into your story.');
  else if (/^"[^"]+"/.test(firstLine)) tips.push('Starting with a quote can work if it\'s a line YOU said or heard. Generic inspirational quotes feel impersonal. If this is your own dialogue, great — make sure the reader knows who\'s speaking.');

  // ─── Show vs Tell detection ───
  if (/\bI (?:learned|realized|understood|discovered) that\b/i.test(text)) {
    tips.push('You wrote "I learned/realized that..." — this is telling, not showing. Instead of stating the lesson, show the moment of realization through your actions, thoughts, or a specific scene. Let the reader draw the conclusion.');
  }
  if (/\bI felt (?:happy|sad|proud|nervous|excited|grateful)\b/i.test(text)) {
    tips.push('Instead of "I felt [emotion]," show the emotion through physical sensations: sweaty palms (nervous), a tight chest (anxious), an uncontrollable smile (joy). Admissions readers respond to visceral details.');
  }
  if (/\b(?:it|this) was (?:an? )?(?:amazing|incredible|life-changing|meaningful|important) (?:experience|moment|event)\b/i.test(text)) {
    tips.push('Calling something "amazing" or "meaningful" tells the reader how to feel. Instead, describe the experience so vividly that the reader concludes it was meaningful on their own. Show, don\'t label.');
  }
  if (/\bthis (?:experience|activity|moment) taught me\b/i.test(text)) {
    tips.push('"This experience taught me..." is a tell phrase. Rewrite this section to show the lesson through a specific moment of change in your behavior, perspective, or understanding.');
  }

  // ─── Coherence / topic drift ───
  if (paragraphs.length >= 3) {
    const paraKeywords = paragraphs.map(p => {
      const words = p.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z']/g, ''));
      return new Set(words.filter(w => w.length > 4));
    });

    for (let i = 1; i < paraKeywords.length; i++) {
      const prev = paraKeywords[i - 1];
      const curr = paraKeywords[i];
      if (prev.size < 4 || curr.size < 4) continue;
      let overlap = 0;
      for (const w of curr) { if (prev.has(w)) overlap++; }
      const ratio = overlap / Math.min(prev.size, curr.size);
      if (ratio < 0.03) {
        tips.push(`Paragraph ${i + 1} shifts topics abruptly from the previous paragraph. Add a transition sentence that bridges the two ideas, or reconsider whether this paragraph belongs in this essay.`);
        break; // Only flag the first major drift
      }
    }

    // Prompt alignment check
    if (prompt && prompt.trim().length > 10) {
      const promptKeywords = new Set(
        prompt.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z']/g, '')).filter(w => w.length > 4)
      );
      const lastPara = paragraphs[paragraphs.length - 1].toLowerCase();
      const lastWords = new Set(lastPara.split(/\s+/).map(w => w.replace(/[^a-z']/g, '')).filter(w => w.length > 4));
      let promptOverlap = 0;
      for (const w of lastWords) { if (promptKeywords.has(w)) promptOverlap++; }
      if (promptOverlap === 0 && paragraphs.length >= 3) {
        tips.push('Your conclusion doesn\'t circle back to the prompt. Revisit the core question in your final paragraph — not by restating the prompt, but by showing how your story answers it.');
      }
    }
  }

  // ─── Structural tips ───
  if (wordCount > 100 && paragraphs.length === 1) {
    tips.push('Your essay is a single paragraph. Break it into 3-5 paragraphs for better readability. Each paragraph should cover one scene, idea, or shift.');
  }
  if (/\b(?:in conclusion|to summarize|overall|in summary|to conclude)\b/i.test(text)) {
    tips.push('Phrases like "in conclusion" or "to summarize" feel formulaic in a personal essay. End with a forward-looking thought, a return to your opening image, or a quiet realization.');
  }

  // ─── Cliche detection ───
  const cliches: Record<string, string> = {
    'changed my life': '"Changed my life" is overused. Show HOW you changed through specific behavior differences.',
    'step outside my comfort zone': '"Step outside my comfort zone" is a cliche. Describe the specific discomfort: what did it feel like physically? What did you almost do instead?',
    'made me who i am today': '"Made me who I am today" is abstract. Show who you are through a specific action or decision you make differently now.',
    'passion for helping others': '"Passion for helping others" is generic. Name ONE person you helped and describe the specific interaction.',
    'opened my eyes': '"Opened my eyes" is a cliche. Describe what you literally saw differently after this experience.',
    'broaden my horizons': '"Broaden my horizons" is vague. What specific new perspective did you gain? Name it precisely.',
  };
  const lowerText = text.toLowerCase();
  for (const [phrase, tip] of Object.entries(cliches)) {
    if (lowerText.includes(phrase)) { tips.push(tip); break; } // Only show first cliche
  }

  // ─── EC-aware tips ───
  if (ecs.length > 0 && wordCount > 100) {
    const { primary } = classifyPrompt(prompt);
    if (primary && !tips.some(t => t.includes('activity'))) {
      const mentionedECs = ecs.filter(ec => {
        const nameWords = ec.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        return nameWords.some(w => lowerText.includes(w));
      });
      if (mentionedECs.length === 0 && wordCount > 150) {
        tips.push('Your essay doesn\'t reference any of your activities yet. Personal essays that ground abstract claims in real experiences are significantly more persuasive. Check the Activity Insights panel for specific suggestions.');
      }
    }
  }

  return tips.slice(0, 4); // Cap at 4 tips to avoid overwhelming
}

/* ══════════════════════════════════════════════════════════════════════
   MOTIFS ENGINE — Story Stitching (Deep Analysis)
   ══════════════════════════════════════════════════════════════════════

   A college essay story architect that discovers hidden connections
   between seemingly unrelated student experiences. Uses deep semantic
   analysis across multiple dimensions: scene, stakes, shift, values,
   imagery, craft, constraints, and evolving questions.
   ══════════════════════════════════════════════════════════════════════ */

interface BulletAnalysis {
  scene: string;
  stakes: string;
  shift: string;
  imagery: string[];
  values: string[];
  tensions: string[];
}

interface MotifBullet {
  id: string;
  text: string;
  themes: string[];
  domains: string[];
  keywords: string[];
  analysis: BulletAnalysis;
}

interface BridgeMechanism {
  type: 'contrast_resolution' | 'cause_effect' | 'shared_craft' | 'recurring_constraint' | 'concrete_metaphor' | 'evolving_question';
  label: string;
}

interface MotifConnection {
  fromId: string;
  toId: string;
  strength: number;
  label: string;
  type: 'shared_theme' | 'complementary' | 'shared_domain' | 'keyword' | 'deep_bridge';
  bridge?: BridgeMechanism;
}

interface MotifGroup {
  id: string;
  name: string;
  narrative: string;
  bulletIds: string[];
  dominantThemes: string[];
  colorIdx: number;
  centralTension?: string;
  suggestedStructure?: string;
  weakConnections?: string[];
}

interface MotifAnalysis {
  bullets: MotifBullet[];
  connections: MotifConnection[];
  motifs: MotifGroup[];
  orphanIds: string[];
  candidateMotifs?: CandidateMotif[];
  bridges?: MotifConnection[];
}

interface CandidateMotif {
  name: string;
  description: string;
  bulletIds: string[];
  insight: string;
  symbolImage: string;
}

interface SavedBoard {
  id: string;
  title: string;
  bullets: unknown;
  analysis: unknown;
  createdAt: string;
  updatedAt: string;
}

/* ─── Deep Semantic Analysis Dimensions ─── */

const MOTIF_STOP_WORDS = new Set([
  'the','a','an','is','was','were','are','been','be','have','has','had','do','does','did','will','would','could','should',
  'may','might','can','this','that','these','those','i','me','my','mine','you','your','we','our','he','she','it','they',
  'them','their','its','and','but','or','not','no','so','if','then','than','when','while','of','in','on','at','to','for',
  'with','by','from','as','into','about','between','through','during','before','after','above','below','up','down','out',
  'off','over','under','again','further','once','here','there','all','each','every','both','few','more','most','other',
  'some','such','only','own','same','just','also','very','really','because','until','where','how','what','which','who',
  'whom','why','being','having','doing','going','wanted','like','even','still','much','many','would','about','been',
  'when','first','time','really','always','never','something','everything','nothing','started','began','went','came',
  'made','back','after','before','during','year','years','day','days',
]);

function extractMotifKeywords(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z'\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !MOTIF_STOP_WORDS.has(w));
}

/* ─── VALUE / TENSION / SHIFT detection (deep semantic layer) ─── */

const VALUE_PATTERNS: Record<string, RegExp> = {
  authenticity: /\b(?:real|true|honest|genuine|authentic|pretend|mask|facade|surface|underneath|who\s+i\s+(?:really|truly)|myself)\b/i,
  justice: /\b(?:fair|unfair|right|wrong|equal|inequal|justice|unjust|discriminat|bias|privilege|margin|oppress|rights|deserve)\b/i,
  connection: /\b(?:connect|bond|close|relationship|together|apart|lonely|isolat|belong|understood|accepted|rejected|friend|trust)\b/i,
  autonomy: /\b(?:independen|freedom|my\s+own|choose|chose|decision|control|agency|self-relian|on\s+my\s+own|alone|myself)\b/i,
  excellence: /\b(?:best|perfect|excellen|master|expert|skill|practice|improve|polish|refine|precise|meticulous|standard)\b/i,
  curiosity: /\b(?:wonder|curious|question|why|how|discover|explore|fascin|puzzle|mystery|understand|figure\s+out|investigat)\b/i,
  responsibility: /\b(?:responsib|duty|obligat|owe|should|must|take\s+care|protect|provide|support|depend|rely|count\s+on)\b/i,
  creativity_val: /\b(?:creat|imagin|invent|design|build|make|original|new\s+way|different\s+approach|outside\s+the\s+box|experiment)\b/i,
  empathy_val: /\b(?:empathy|compassion|understand|felt\s+(?:for|their)|perspective|walk\s+in|shoes|listen|hear|witness|see\s+(?:their|how))\b/i,
  resilience_val: /\b(?:kept\s+going|didn't\s+give\s+up|persever|persist|endur|surviv|overcame|bounce|recover|despite|anyway|still)\b/i,
};

const TENSION_PATTERNS: [RegExp, string][] = [
  [/\b(?:but|however|yet|although|though|despite|even\s+though|on\s+the\s+other\s+hand|instead|rather\s+than)\b/i, 'internal_conflict'],
  [/\b(?:expect|suppos|should\s+have|thought\s+(?:i|it)\s+would|assum|imagin(?:ed)?|planned|meant\s+to)\b.*?\b(?:but|instead|however|actually|turns?\s+out)\b/i, 'expectation_vs_reality'],
  [/\b(?:want|wish|hope|dream|desire|long)\b.*?\b(?:but|can't|couldn't|unable|impossible|hard|difficult)\b/i, 'aspiration_vs_constraint'],
  [/\b(?:family|parent|mom|dad|mother|father|tradition|culture|heritage)\b.*?\b(?:but|while|whereas|different|my\s+own|want(?:ed)?)\b/i, 'tradition_vs_self'],
  [/\b(?:everyone|others|they|people|friends|peers)\b.*?\b(?:but\s+i|while\s+i|i\s+(?:felt|thought|knew|wanted|believed))\b/i, 'individual_vs_group'],
  [/\b(?:success|win|achiev|accomplish|proud)\b.*?\b(?:but|cost|sacrifice|miss|lost|gave\s+up)\b/i, 'success_vs_cost'],
];

const SHIFT_PATTERNS: [RegExp, string][] = [
  [/\b(?:realized|understood|saw|recognized|learned|discovered|noticed|dawned\s+on)\b/i, 'realization'],
  [/\b(?:changed|transformed|shifted|different|new|became|turned\s+into|no\s+longer)\b/i, 'transformation'],
  [/\b(?:decided|chose|committed|resolved|determined|vowed|promised)\b/i, 'decision'],
  [/\b(?:first\s+time|never\s+before|for\s+once|finally|at\s+last|breakthrough)\b/i, 'first_experience'],
  [/\b(?:question|doubt|wonder|uncertain|unsure|rethink|reconsider)\b/i, 'questioning'],
];

const IMAGERY_PATTERNS: [RegExp, string][] = [
  [/\b(?:kitchen|stove|oven|pot|pan|cutting\s+board|counter|apron|recipe|ingredient|spice|flour|dough|simmer|boil|chop)\b/i, 'kitchen'],
  [/\b(?:field|court|track|pool|gym|arena|stadium|bench|locker\s+room|whistle|jersey|cleats|ball|goal|net|hoop|lane)\b/i, 'athletic_space'],
  [/\b(?:stage|spotlight|curtain|audience|microphone|instrument|piano|guitar|violin|drum|note|chord|melody|rhythm|rehearsal)\b/i, 'performance_space'],
  [/\b(?:lab|microscope|beaker|test\s+tube|petri|data|graph|equation|formula|whiteboard|notebook|research|specimen)\b/i, 'lab_space'],
  [/\b(?:classroom|desk|textbook|chalkboard|homework|exam|quiz|lecture|library|study|paper|essay|grade)\b/i, 'academic_space'],
  [/\b(?:hospital|clinic|waiting\s+room|doctor|nurse|patient|bed|iv|monitor|surgery|diagnosis|treatment|medicine)\b/i, 'medical_space'],
  [/\b(?:home|bedroom|living\s+room|dinner\s+table|porch|backyard|neighborhood|apartment|house|door|window|roof|wall)\b/i, 'home_space'],
  [/\b(?:computer|screen|code|keyboard|mouse|app|website|software|program|debug|server|terminal|pixel|interface|algorithm)\b/i, 'digital_space'],
  [/\b(?:garden|tree|flower|soil|seed|root|leaf|branch|forest|mountain|river|ocean|sky|rain|sun|wind|nature)\b/i, 'natural_space'],
  [/\b(?:church|temple|mosque|synagogue|prayer|worship|sacred|spiritual|meditation|faith|god|soul|blessing)\b/i, 'sacred_space'],
  [/\b(?:hands|fingers|eyes|face|heart|voice|breath|sweat|tears|smile|shoulders|arms|feet|stomach|chest)\b/i, 'body'],
  [/\b(?:light|dark|shadow|bright|glow|shine|dim|flicker|illuminate|color|red|blue|green|gold|white|black)\b/i, 'light_dark'],
  [/\b(?:loud|quiet|silence|noise|sound|voice|whisper|echo|ring|buzz|crash|hum|music|rhythm|beat)\b/i, 'sound'],
  [/\b(?:warm|cold|hot|cool|freeze|burn|heat|chill|temperature|sweat|shiver)\b/i, 'temperature'],
];

const DOMAIN_PATTERNS: Record<string, RegExp> = {
  sports: /\b(?:sport|team|game|play|field|court|ball|race|swim|run|compet|athlet|train|coach|practice|win|tournament|track|gym|varsity|soccer|basketball|baseball|football|tennis|volleyball|wrestling|lacrosse|hockey|cross\s*country|rowing|fencing|martial\s*arts)\b/i,
  science: /\b(?:science|lab|experiment|research|biology|chemistry|physics|math|equation|data|hypothesis|molecule|cell|gene|specimen|microscop|calculus|statistics|variable|theory|publish|journal)\b/i,
  arts: /\b(?:art|music|paint|draw|sing|dance|theater|perform|stage|gallery|exhibit|instrument|piano|guitar|violin|choir|orchestra|film|photograph|sculpt|ceramic|poetry|creative\s*writing|compose|direct|act|rehearse)\b/i,
  technology: /\b(?:code|program|computer|tech|software|app|website|robot|AI|machine|digital|hack|engineer|algorithm|database|startup|cybersecurity|data\s*science|javascript|python|develop|deploy)\b/i,
  nature: /\b(?:nature|environment|outdoor|hike|camp|garden|animal|plant|climate|earth|ocean|mountain|forest|wildlife|sustain|ecolog|conservation|biodiversity|pollution|recycle)\b/i,
  family: /\b(?:family|parent|mother|father|mom|dad|sibling|brother|sister|grandparent|home|household|generation|relative|aunt|uncle|cousin|grandma|grandpa|ancestor|legacy)\b/i,
  school: /\b(?:school|class|teacher|student|grade|homework|college|university|campus|education|curriculum|exam|tutor|professor|lecture|AP|honors|GPA|valedictorian|club)\b/i,
  social_justice: /\b(?:justice|equality|rights|protest|advocat|awareness|policy|society|systemic|inequit|poverty|racism|privilege|margin|activis|vote|campaign|reform|nonprofit|organize)\b/i,
  health: /\b(?:health|hospital|doctor|nurse|patient|medic|illness|diagnos|mental\s+health|therapy|disabilit|surgery|clinic|wellness|anxiety|depression|recovery|chronic|care)\b/i,
  food: /\b(?:cook|food|kitchen|recipe|bake|meal|restaurant|culinary|spice|flavor|dish|eat|taste|nourish|ingredient|chef|cuisine|ferment|roast|saut[eé])\b/i,
  business: /\b(?:business|entrepreneur|startup|company|market|sell|profit|revenue|customer|client|investor|pitch|brand|launch|product|e-?commerce|retail)\b/i,
  language: /\b(?:language|bilingual|translat|interpret|spanish|french|mandarin|chinese|arabic|hindi|korean|japanese|tongue|accent|fluent|speak|word|phrase|grammar|vocabulary)\b/i,
  travel: /\b(?:travel|abroad|country|culture|trip|journey|visit|foreign|international|passport|airport|flight|explore|backpack|exchange\s*student)\b/i,
};

const THEME_PATTERNS: Record<string, RegExp> = {
  translation: /\b(?:translat|interpret|bridge|between\s+(?:two|worlds|cultures|languages)|mediat|navigat\s+between|code[\s-]switch|lost\s+in\s+translation|middl(?:e\s+ground|eman)|go[\s-]between|bilingual|bicultural)\b/i,
  calibration: /\b(?:calibrat|adjust|fine[\s-]tun|balanc|recalibrat|measur|precision|accuracy|dial\s+in|tweak|optimiz|refin|perfect(?:ing)?|tinker)\b/i,
  repair: /\b(?:repair|fix|mend|heal|restor|rebuild|reconstruct|patch|broken|damage|stitch|sutur|glue|tape|salvage|reclaim|put\s+(?:back\s+)?together)\b/i,
  threshold: /\b(?:threshold|doorway|gateway|crossroad|turning\s+point|watershed|breaking\s+point|edge|brink|cusp|precipice|verge|boundary|liminal|transition|passage|between)\b/i,
  mapping: /\b(?:map|chart|navigat|compass|direction|path|route|trail|wayfind|orient|guide|explore|discover|terrain|landscape|blueprint|diagram|plan|layout)\b/i,
  signal_noise: /\b(?:signal|noise|filter|focus|distract|attention|clarity|confusion|overwhelm|prioritiz|cut\s+through|static|interference|discern|distinguish|sort\s+through|meaningful)\b/i,
  attention: /\b(?:notic|observ|attenti|detail|careful|closely|watch|see|look|spot|catch|mindful|present|aware|focus|concentrate|pay\s+attention)\b/i,
  building_systems: /\b(?:system|structure|framework|organiz|process|workflow|method|protocol|routine|habit|ritual|foundation|architect|design|engineer|build|construct|assembl)\b/i,
  navigating_uncertainty: /\b(?:uncertain|unknown|ambiguou|unclear|confus|lost|wander|search|seek|grope|fumbl|trial|error|experiment|guess|risk|leap|fog|dark|blind)\b/i,
  balancing_contradictions: /\b(?:contradict|paradox|tension|both|and|dual|two\s+(?:sides|worlds|parts)|torn|pull|push|conflict|reconcil|harmoniz|integrat|embrace|accept|coexist)\b/i,
  resilience: /\b(?:overcame?|struggle|challeng|difficult|tough|hardship|failure|setback|persever|persist|endur|bounce|recover|adapt|obstacle|fight|survive|broke|heal|kept\s+going|didn't\s+(?:give\s+up|quit|stop))\b/i,
  leadership: /\b(?:led|lead|leader|captain|president|found|organiz|manag|direct|coordinat|mentor|inspir|initiative|responsib|delegate|guide|mobiliz|rally|unit|empower)\b/i,
  creativity: /\b(?:creat|design|invent|imagin|innovat|built|original|unique|artistic|compose|paint|draw|code|program|craft|experiment|improv|reimagin|rethink|prototype)\b/i,
  growth: /\b(?:learn|grew|grow|change|transform|develop|improve|progress|evolve|mature|discover|realiz|understand|adapt|expand|open|became|shift|different\s+person)\b/i,
  community: /\b(?:communit|volunteer|serve|help|impact|together|team|neighbor|family|friend|connect|belong|support|uplift|fundrais|donat|collective|mutual|solidarity)\b/i,
  identity: /\b(?:cultur|heritage|identity|tradition|value|belief|who\s*i\s*am|roots|background|immigra|religion|language|bilingual|diaspora|home|belong|define|represent)\b/i,
  passion: /\b(?:passion|love|fascin|obsess|dedicate|commit|drive|motivate|excit|inspir|eager|curious|wonder|thrill|devot|alive|light\s+up|can't\s+stop)\b/i,
  intellectual: /\b(?:research|study|read|think|analyz|question|hypothesis|theory|philosophy|debate|academic|scholar|puzzle|logic|invest|inquiry|critical|intellectual)\b/i,
  empathy: /\b(?:empathy|compassion|understand|listen|care|emotion|perspective|relate|human|kind|gentle|comfort|witness|feel\s+for|walk\s+in|shoes|heart)\b/i,
  ambition: /\b(?:goal|dream|aspir|ambition|future|career|achiev|success|strive|pursu|determin|driven|envision|someday|one\s+day|plan|vision|mission)\b/i,
};

/* ─── Step 1: Deep Bullet Analysis ─── */

function analyzeBulletDeeply(text: string): BulletAnalysis {
  const lower = text.toLowerCase();

  // Detect scene (what happened)
  let scene = text.length > 60 ? text.slice(0, 57) + '...' : text;

  // Detect stakes (why it mattered)
  const stakesPatterns: [RegExp, string][] = [
    [/\b(?:because|since|meant|matter|important|significant|crucial|everything|nothing|life[\s-]changing)\b/i, 'high personal stakes'],
    [/\b(?:family|parent|mom|dad|community|team|school|everyone)\b/i, 'stakes beyond self'],
    [/\b(?:dream|goal|future|career|college|life|path|direction)\b/i, 'future-defining moment'],
    [/\b(?:first|only|last|never|ever|once)\b/i, 'singular moment'],
  ];
  const stakes = stakesPatterns.filter(([rx]) => rx.test(lower)).map(([, s]) => s).join('; ') || 'personal significance';

  // Detect shift/realization
  const shifts: string[] = [];
  for (const [rx, label] of SHIFT_PATTERNS) {
    if (rx.test(lower)) shifts.push(label);
  }

  // Detect imagery
  const imagery: string[] = [];
  for (const [rx, label] of IMAGERY_PATTERNS) {
    if (rx.test(lower)) imagery.push(label);
  }

  // Detect values
  const values: string[] = [];
  for (const [key, rx] of Object.entries(VALUE_PATTERNS)) {
    if (rx.test(lower)) values.push(key);
  }

  // Detect tensions
  const tensions: string[] = [];
  for (const [rx, label] of TENSION_PATTERNS) {
    if (rx.test(lower)) tensions.push(label);
  }

  return {
    scene,
    stakes,
    shift: shifts.join(', ') || 'implicit growth',
    imagery,
    values,
    tensions,
  };
}

function detectThemes(text: string): string[] {
  return Object.entries(THEME_PATTERNS)
    .filter(([, rx]) => rx.test(text))
    .map(([k]) => k);
}

function detectDomains(text: string): string[] {
  return Object.entries(DOMAIN_PATTERNS)
    .filter(([, rx]) => rx.test(text))
    .map(([k]) => k);
}

/* ─── Step 2-4: Deep Connection Finding with Bridge Mechanisms ─── */

const BRIDGE_MECHANISMS: { type: BridgeMechanism['type']; detect: (a: MotifBullet, b: MotifBullet) => { match: boolean; label: string; strength: number } }[] = [
  {
    type: 'contrast_resolution',
    detect: (a, b) => {
      // Two different sides that eventually reconcile
      const aVals = new Set(a.analysis.values);
      const bVals = new Set(b.analysis.values);
      const contrasts: [string, string, string][] = [
        ['autonomy', 'connection', 'Independence vs. belonging — two needs that shape the same person'],
        ['excellence', 'empathy_val', 'The perfectionist who learned to be gentle — with others or with themselves'],
        ['justice', 'resilience_val', 'Witnessing unfairness and finding the strength to push back'],
        ['authenticity', 'responsibility', 'Being true to yourself while carrying obligations to others'],
        ['curiosity', 'responsibility', 'The explorer pulled between wonder and duty'],
        ['creativity_val', 'excellence', 'The tension between creative freedom and the pursuit of mastery'],
      ];
      for (const [v1, v2, desc] of contrasts) {
        if ((aVals.has(v1) && bVals.has(v2)) || (aVals.has(v2) && bVals.has(v1))) {
          return { match: true, label: desc, strength: 0.85 };
        }
      }
      // Generic value contrast
      const aTensions = a.analysis.tensions;
      const bTensions = b.analysis.tensions;
      if (aTensions.length > 0 && bTensions.length > 0) {
        return { match: true, label: 'Both experiences contain internal tensions that mirror each other', strength: 0.7 };
      }
      if (aVals.size > 0 && bVals.size > 0) {
        const diff = [...aVals].filter(v => !bVals.has(v));
        const shared = [...aVals].filter(v => bVals.has(v));
        if (diff.length > 0 && shared.length > 0) {
          return { match: true, label: `Different expressions of shared values (${shared.slice(0, 2).join(', ')})`, strength: 0.65 };
        }
      }
      return { match: false, label: '', strength: 0 };
    },
  },
  {
    type: 'cause_effect',
    detect: (a, b) => {
      // One experience changed how the student approached another
      const aHasShift = a.analysis.shift !== 'implicit growth';
      const bHasShift = b.analysis.shift !== 'implicit growth';
      if (aHasShift || bHasShift) {
        const source = aHasShift ? a : b;
        const target = aHasShift ? b : a;
        // Check if the shift in one could inform the other
        const sourceValues = new Set(source.analysis.values);
        const targetValues = new Set(target.analysis.values);
        const overlap = [...sourceValues].filter(v => targetValues.has(v));
        if (overlap.length > 0) {
          return { match: true, label: `The shift in one experience directly shaped the approach to the other`, strength: 0.8 };
        }
        // Check domain crossover
        const sDomains = new Set(source.domains);
        const tDomains = new Set(target.domains);
        if ([...sDomains].some(d => tDomains.has(d))) {
          return { match: true, label: 'A realization from one context carried over into the other', strength: 0.7 };
        }
      }
      return { match: false, label: '', strength: 0 };
    },
  },
  {
    type: 'shared_craft',
    detect: (a, b) => {
      // Same skill or mindset used in different domains
      const aD = new Set(a.domains);
      const bD = new Set(b.domains);
      const differentDomains = ![...aD].some(d => bD.has(d)) && aD.size > 0 && bD.size > 0;

      if (differentDomains) {
        const aT = new Set(a.themes);
        const bT = new Set(b.themes);
        const sharedThemes = [...aT].filter(t => bT.has(t));
        if (sharedThemes.length > 0) {
          const craft = sharedThemes[0].replace(/_/g, ' ');
          return { match: true, label: `The same ${craft} mindset applied across completely different worlds`, strength: 0.85 };
        }
        // Check shared values across different domains
        const aV = new Set(a.analysis.values);
        const bV = new Set(b.analysis.values);
        const sharedVals = [...aV].filter(v => bV.has(v));
        if (sharedVals.length > 0) {
          return { match: true, label: `Different arenas, same underlying approach — ${sharedVals[0].replace(/_val/, '')}`, strength: 0.75 };
        }
      }
      return { match: false, label: '', strength: 0 };
    },
  },
  {
    type: 'recurring_constraint',
    detect: (a, b) => {
      // Same obstacle appears in different contexts
      const aTensions = new Set(a.analysis.tensions);
      const bTensions = new Set(b.analysis.tensions);
      const shared = [...aTensions].filter(t => bTensions.has(t));
      if (shared.length > 0) {
        const tensionLabels: Record<string, string> = {
          internal_conflict: 'inner conflict that keeps surfacing in different forms',
          expectation_vs_reality: 'gap between expectations and reality',
          aspiration_vs_constraint: 'tension between what you want and what holds you back',
          tradition_vs_self: 'push and pull between heritage and personal identity',
          individual_vs_group: 'struggle between standing out and fitting in',
          success_vs_cost: 'recurring question of what success really costs',
        };
        return { match: true, label: `A ${tensionLabels[shared[0]] || 'recurring challenge'} that appears across these experiences`, strength: 0.8 };
      }
      return { match: false, label: '', strength: 0 };
    },
  },
  {
    type: 'concrete_metaphor',
    detect: (a, b) => {
      // Shared physical objects, places, or imagery
      const aImg = new Set(a.analysis.imagery);
      const bImg = new Set(b.analysis.imagery);
      const shared = [...aImg].filter(i => bImg.has(i));
      if (shared.length > 0) {
        const imgLabels: Record<string, string> = {
          kitchen: 'the kitchen as a recurring space of transformation',
          athletic_space: 'the athletic arena as a crucible for growth',
          performance_space: 'the stage/spotlight as a space where you become yourself',
          lab_space: 'the lab as a place of discovery and uncertainty',
          home_space: 'home as both anchor and launchpad',
          body: 'physical, embodied experience connecting these moments',
          light_dark: 'imagery of light and dark threading through both',
          sound: 'sound and silence as a connecting thread',
          natural_space: 'nature as a recurring backdrop for change',
          digital_space: 'the digital world as a space of creation',
        };
        return { match: true, label: imgLabels[shared[0]] || `Shared imagery (${shared[0].replace('_', ' ')}) that could become a powerful motif`, strength: 0.9 };
      }
      // Check keyword-level imagery overlap
      const aKw = a.keywords;
      const bKw = b.keywords;
      const concreteWords = aKw.filter(k => bKw.includes(k) && /^[a-z]+$/.test(k));
      if (concreteWords.length >= 1) {
        const isConcreteNoun = concreteWords.some(w => /(?:hand|door|light|table|window|room|road|water|fire|book|phone|mirror|clock|letter|wall|bridge|path|tree|stone|key|glass)s?/.test(w));
        if (isConcreteNoun) {
          return { match: true, label: `"${concreteWords[0]}" appears in both — it could become the essay's central image`, strength: 0.85 };
        }
      }
      return { match: false, label: '', strength: 0 };
    },
  },
  {
    type: 'evolving_question',
    detect: (a, b) => {
      // Same fundamental question evolving across experiences
      const questionPairs: [string[], string[], string][] = [
        [['identity', 'authenticity'], ['growth', 'community'], 'Who am I? — a question that evolves as your world expands'],
        [['curiosity', 'intellectual'], ['ambition', 'passion'], 'What matters to me? — a question deepened by each experience'],
        [['justice', 'empathy_val'], ['leadership', 'community'], 'What should I do about it? — from witnessing to acting'],
        [['autonomy', 'resilience_val'], ['connection', 'responsibility'], 'Can I do this alone? — learning when to lean in and when to let go'],
        [['excellence', 'ambition'], ['empathy_val', 'connection'], 'What does success mean? — a definition that keeps changing'],
      ];

      const aAll = new Set([...a.themes, ...a.analysis.values]);
      const bAll = new Set([...b.themes, ...b.analysis.values]);

      for (const [set1, set2, question] of questionPairs) {
        const aHas1 = set1.some(s => aAll.has(s));
        const bHas2 = set2.some(s => bAll.has(s));
        const aHas2 = set2.some(s => aAll.has(s));
        const bHas1 = set1.some(s => bAll.has(s));
        if ((aHas1 && bHas2) || (aHas2 && bHas1)) {
          return { match: true, label: question, strength: 0.85 };
        }
      }
      return { match: false, label: '', strength: 0 };
    },
  },
];

function findMotifConnections(bullets: MotifBullet[]): MotifConnection[] {
  const connections: MotifConnection[] = [];

  for (let i = 0; i < bullets.length; i++) {
    for (let j = i + 1; j < bullets.length; j++) {
      const a = bullets[i], b = bullets[j];
      const allConnections: { strength: number; label: string; type: MotifConnection['type']; bridge?: BridgeMechanism }[] = [];

      // Layer 1: Theme-level connections
      const sharedThemes = a.themes.filter(t => b.themes.includes(t));
      if (sharedThemes.length > 0) {
        const s = Math.min(1, sharedThemes.length * 0.25 + 0.35);
        const names = sharedThemes.slice(0, 2).map(t => t.replace(/_/g, ' '));
        allConnections.push({ strength: s, label: `Both reflect ${names.join(' and ')}`, type: 'shared_theme' });
      }

      // Layer 2: Domain connections
      const sharedDomains = a.domains.filter(d => b.domains.includes(d));
      if (sharedDomains.length > 0) {
        const s = 0.4 + sharedDomains.length * 0.15;
        allConnections.push({ strength: s, label: `Connected through ${sharedDomains[0].replace('_', ' ')}`, type: 'shared_domain' });
      }

      // Layer 3: Deep bridge mechanisms (the most powerful connections)
      for (const mechanism of BRIDGE_MECHANISMS) {
        const result = mechanism.detect(a, b);
        if (result.match) {
          allConnections.push({
            strength: result.strength,
            label: result.label,
            type: 'deep_bridge',
            bridge: { type: mechanism.type, label: result.label },
          });
        }
      }

      // Layer 4: Keyword/semantic overlap (fallback)
      const sharedKw = a.keywords.filter(k => b.keywords.includes(k));
      if (sharedKw.length >= 2) {
        const s = 0.25 + Math.min(sharedKw.length * 0.08, 0.35);
        allConnections.push({ strength: s, label: `Shared language: ${sharedKw.slice(0, 3).join(', ')}`, type: 'keyword' });
      }

      // Layer 5: Value-based connections (catch "unrelated" experiences with shared underlying values)
      const aVals = new Set(a.analysis.values);
      const bVals = new Set(b.analysis.values);
      const sharedValues = [...aVals].filter(v => bVals.has(v));
      if (sharedValues.length > 0 && allConnections.length === 0) {
        // This is the key fallback — even "unrelated" topics share values
        const valName = sharedValues[0].replace(/_val$/, '');
        allConnections.push({
          strength: 0.55 + sharedValues.length * 0.1,
          label: `Both driven by ${valName} — different contexts, same core value`,
          type: 'deep_bridge',
          bridge: { type: 'shared_craft', label: `Shared value: ${valName}` },
        });
      }

      // Layer 6: Imagery overlap as metaphor bridge
      if (allConnections.length === 0) {
        const aImg = new Set(a.analysis.imagery);
        const bImg = new Set(b.analysis.imagery);
        const sharedImg = [...aImg].filter(i => bImg.has(i));
        if (sharedImg.length > 0) {
          allConnections.push({
            strength: 0.6,
            label: `Shared sensory world (${sharedImg[0].replace('_', ' ')}) could become a unifying image`,
            type: 'deep_bridge',
            bridge: { type: 'concrete_metaphor', label: `Imagery: ${sharedImg[0]}` },
          });
        }
      }

      // Pick the strongest connection
      if (allConnections.length > 0) {
        allConnections.sort((a, b) => b.strength - a.strength);
        const best = allConnections[0];
        connections.push({
          fromId: a.id,
          toId: b.id,
          strength: best.strength,
          label: best.label,
          type: best.type,
          bridge: best.bridge,
        });
      }
    }
  }

  return connections.sort((a, b) => b.strength - a.strength);
}

/* ─── Step 2: Generate 6–10 Candidate Motifs ─── */

// Motif templates: specific, original lenses (NOT generic words)
const MOTIF_LENSES: {
  id: string;
  name: string;
  description: string;
  symbolImage: string;
  matchThemes: string[];
  matchValues: string[];
  matchTensions: string[];
  matchImagery: string[];
  insightTemplate: (bullets: MotifBullet[]) => string;
}[] = [
  {
    id: 'translation',
    name: 'The Translator',
    description: 'Moving between worlds, languages, codes, or contexts — carrying meaning across borders.',
    symbolImage: 'A dictionary open to a page where two languages share the same word but mean different things.',
    matchThemes: ['translation', 'identity', 'balancing_contradictions'],
    matchValues: ['authenticity', 'empathy_val', 'connection'],
    matchTensions: ['tradition_vs_self', 'individual_vs_group'],
    matchImagery: [],
    insightTemplate: (bs) => `This student exists at the intersection of multiple worlds. Their ability to translate — not just language, but meaning, expectation, and identity — reveals a sophistication that goes far beyond "being bilingual." The tension of carrying two (or more) contexts at once IS the insight.`,
  },
  {
    id: 'calibration',
    name: 'The Calibrator',
    description: 'Fine-tuning, adjusting, seeking the right balance — precision as a way of engaging with the world.',
    symbolImage: 'A hand turning a dial, searching for the exact frequency where static becomes music.',
    matchThemes: ['calibration', 'attention', 'building_systems'],
    matchValues: ['excellence', 'curiosity'],
    matchTensions: ['expectation_vs_reality'],
    matchImagery: ['lab_space', 'digital_space'],
    insightTemplate: (bs) => `This student approaches life like an instrument that needs tuning. They don't accept defaults — they adjust, refine, and recalibrate until things feel right. This reveals a rare combination of patience and perfectionism that drives everything they do.`,
  },
  {
    id: 'repair',
    name: 'The Restorer',
    description: 'Fixing what\'s broken — in systems, relationships, communities, or themselves.',
    symbolImage: 'Kintsugi — a cracked bowl mended with gold, more beautiful for having been broken.',
    matchThemes: ['repair', 'resilience', 'community'],
    matchValues: ['resilience_val', 'responsibility', 'empathy_val'],
    matchTensions: ['internal_conflict'],
    matchImagery: ['home_space', 'body'],
    insightTemplate: (bs) => `This student has a restorer's instinct — they see broken things not as failures but as opportunities for care. Whether fixing code, mending relationships, or healing from setbacks, the impulse is the same: take what's damaged and make it whole again. The gold in the cracks is the story.`,
  },
  {
    id: 'threshold',
    name: 'At the Threshold',
    description: 'Standing at doorways, boundaries, and turning points — the liminal space between who you were and who you\'re becoming.',
    symbolImage: 'A doorframe with one foot on each side — neither fully in nor fully out.',
    matchThemes: ['threshold', 'growth', 'navigating_uncertainty'],
    matchValues: ['autonomy', 'curiosity'],
    matchTensions: ['aspiration_vs_constraint', 'expectation_vs_reality'],
    matchImagery: ['home_space', 'academic_space'],
    insightTemplate: (bs) => `These experiences all involve moments of transition — not the arrival, but the standing-at-the-door. This student is most alive in the in-between, which suggests a comfort with uncertainty and change that most applicants can't demonstrate.`,
  },
  {
    id: 'mapping',
    name: 'The Cartographer',
    description: 'Charting unknown territory, finding paths where none existed, making the invisible visible.',
    symbolImage: 'A hand-drawn map with blank edges and a compass pointing somewhere unnamed.',
    matchThemes: ['mapping', 'intellectual', 'creativity'],
    matchValues: ['curiosity', 'creativity_val'],
    matchTensions: [],
    matchImagery: ['natural_space', 'digital_space'],
    insightTemplate: (bs) => `This student is a mapmaker — they navigate uncharted territory and create frameworks for understanding. Whether exploring a subject, a community, or their own identity, they don't follow existing paths. They draw new ones.`,
  },
  {
    id: 'signal_noise',
    name: 'Signal Through Noise',
    description: 'Finding what matters amid chaos, distraction, or overwhelming information.',
    symbolImage: 'A radio dial mid-turn, the static fading into a single clear voice.',
    matchThemes: ['signal_noise', 'attention', 'intellectual'],
    matchValues: ['curiosity', 'excellence'],
    matchTensions: ['individual_vs_group'],
    matchImagery: ['digital_space', 'sound'],
    insightTemplate: (bs) => `In a world of noise, this student has the rare ability to find the signal. They cut through complexity, distraction, and surface-level thinking to get to what actually matters. This is a mind built for depth, not volume.`,
  },
  {
    id: 'building',
    name: 'The Architect',
    description: 'Constructing systems, structures, processes — creating order from chaos.',
    symbolImage: 'Blueprints unrolled on a table, with pencil marks showing revision after revision.',
    matchThemes: ['building_systems', 'leadership', 'creativity'],
    matchValues: ['creativity_val', 'responsibility', 'excellence'],
    matchTensions: [],
    matchImagery: ['digital_space', 'academic_space'],
    insightTemplate: (bs) => `This student doesn't just participate in systems — they build them. Whether it's founding a club, writing code, or reorganizing how their family does things, the instinct is the same: see a need, design a solution, iterate until it works.`,
  },
  {
    id: 'uncertainty',
    name: 'Into the Fog',
    description: 'Navigating when the path is unclear — embracing not-knowing as a form of courage.',
    symbolImage: 'Headlights illuminating only the next ten feet of a fog-covered road.',
    matchThemes: ['navigating_uncertainty', 'resilience', 'growth'],
    matchValues: ['resilience_val', 'autonomy'],
    matchTensions: ['aspiration_vs_constraint', 'expectation_vs_reality'],
    matchImagery: ['light_dark'],
    insightTemplate: (bs) => `These experiences share a common thread: the student didn't know where they were going. But instead of freezing, they moved forward anyway. This reveals a kind of courage that's rarer than it sounds — the willingness to act without a guarantee.`,
  },
  {
    id: 'contradictions',
    name: 'Both/And',
    description: 'Holding two opposing truths simultaneously — being the scientist who dances, the leader who listens.',
    symbolImage: 'Two hands holding different objects, both equally real, neither letting go.',
    matchThemes: ['balancing_contradictions', 'identity'],
    matchValues: ['authenticity', 'connection'],
    matchTensions: ['tradition_vs_self', 'individual_vs_group', 'internal_conflict'],
    matchImagery: [],
    insightTemplate: (bs) => `This student resists being one thing. They hold contradictions — not as conflicts to resolve, but as dimensions to embrace. The essay's power would come from showing how these opposing sides don't cancel each other out; they multiply.`,
  },
  {
    id: 'attention',
    name: 'The Quiet Eye',
    description: 'Noticing what others miss — details, people, patterns, silences.',
    symbolImage: 'A magnifying glass held over an ordinary surface, revealing hidden texture.',
    matchThemes: ['attention', 'empathy'],
    matchValues: ['empathy_val', 'curiosity'],
    matchTensions: [],
    matchImagery: ['body', 'light_dark', 'sound'],
    insightTemplate: (bs) => `This student pays attention differently. They catch what others overlook — a detail in a room, a shift in someone's tone, a pattern in data. This quality of attention is what makes their writing (and their thinking) distinctive.`,
  },
  {
    id: 'craft',
    name: 'The Craftsperson',
    description: 'The same careful, practiced skill applied across different materials and domains.',
    symbolImage: 'Hands shaping clay, then later shaping code, then later shaping an argument — the same motion.',
    matchThemes: ['creativity', 'passion', 'calibration'],
    matchValues: ['excellence', 'creativity_val'],
    matchTensions: ['success_vs_cost'],
    matchImagery: ['kitchen', 'lab_space', 'performance_space', 'digital_space'],
    insightTemplate: (bs) => `This student has a craftsperson's approach to everything they touch. The same precision, care, and iterative refinement shows up in completely different domains. That transferable craft IS the motif — it's not about what they do, but how they do it.`,
  },
  {
    id: 'roots_wings',
    name: 'Roots & Wings',
    description: 'The tension between where you come from and where you\'re going.',
    symbolImage: 'A tree with deep roots and branches reaching beyond the frame.',
    matchThemes: ['identity', 'community', 'growth', 'ambition'],
    matchValues: ['connection', 'autonomy', 'responsibility'],
    matchTensions: ['tradition_vs_self', 'aspiration_vs_constraint'],
    matchImagery: ['home_space', 'natural_space'],
    insightTemplate: (bs) => `This student is navigating the universal but deeply personal tension between origin and aspiration. They're rooted in family, culture, or community — but they're also reaching toward something new. The most powerful version of this essay doesn't resolve the tension; it inhabits it.`,
  },
];

function generateCandidateMotifs(bullets: MotifBullet[], connections: MotifConnection[]): CandidateMotif[] {
  const candidates: CandidateMotif[] = [];

  // Score each lens against the bullet set
  for (const lens of MOTIF_LENSES) {
    let score = 0;
    const matchedBulletIds: string[] = [];

    for (const b of bullets) {
      let bulletScore = 0;

      // Theme matches
      const themeMatch = b.themes.filter(t => lens.matchThemes.includes(t)).length;
      bulletScore += themeMatch * 2;

      // Value matches
      const valMatch = b.analysis.values.filter(v => lens.matchValues.includes(v)).length;
      bulletScore += valMatch * 1.5;

      // Tension matches
      const tensionMatch = b.analysis.tensions.filter(t => lens.matchTensions.includes(t)).length;
      bulletScore += tensionMatch * 2;

      // Imagery matches
      if (lens.matchImagery.length > 0) {
        const imgMatch = b.analysis.imagery.filter(i => lens.matchImagery.includes(i)).length;
        bulletScore += imgMatch * 1;
      }

      if (bulletScore > 0) {
        matchedBulletIds.push(b.id);
        score += bulletScore;
      }
    }

    // Need at least 2 bullet connections to be a valid candidate
    if (matchedBulletIds.length >= 2) {
      // Bonus for connecting bullets that are in different domains
      const matchedBullets = matchedBulletIds.map(id => bullets.find(b => b.id === id)!);
      const domainSet = new Set(matchedBullets.flatMap(b => b.domains));
      if (domainSet.size >= 2) score += 3; // Cross-domain bonus

      candidates.push({
        name: lens.name,
        description: lens.description,
        bulletIds: matchedBulletIds,
        insight: lens.insightTemplate(matchedBullets),
        symbolImage: lens.symbolImage,
      });
    }
  }

  // Also generate dynamic candidates from strong bridge connections
  const strongBridges = connections.filter(c => c.bridge && c.strength >= 0.7);
  for (const bridge of strongBridges) {
    const fromB = bullets.find(b => b.id === bridge.fromId);
    const toB = bullets.find(b => b.id === bridge.toId);
    if (!fromB || !toB) continue;

    // Check if any existing candidate already covers both bullets
    const alreadyCovered = candidates.some(c => c.bulletIds.includes(bridge.fromId) && c.bulletIds.includes(bridge.toId));
    if (alreadyCovered) continue;

    const bridgeTypeNames: Record<string, string> = {
      contrast_resolution: 'The Paradox',
      cause_effect: 'Chain Reaction',
      shared_craft: 'The Common Thread',
      recurring_constraint: 'The Recurring Challenge',
      concrete_metaphor: 'The Recurring Image',
      evolving_question: 'The Evolving Question',
    };

    const bridgeTypeDescs: Record<string, string> = {
      contrast_resolution: 'Two contrasting experiences that reveal depth when held together.',
      cause_effect: 'One experience directly shaped how you approached another.',
      shared_craft: 'The same underlying skill or mindset applied in different worlds.',
      recurring_constraint: 'The same obstacle keeps appearing across different contexts.',
      concrete_metaphor: 'A physical image or object that connects different experiences.',
      evolving_question: 'A question that started simple and became more complex.',
    };

    candidates.push({
      name: bridgeTypeNames[bridge.bridge!.type] || 'Dynamic Thread',
      description: bridgeTypeDescs[bridge.bridge!.type] || bridge.label,
      bulletIds: [bridge.fromId, bridge.toId],
      insight: bridge.label,
      symbolImage: `The connection between "${fromB.text.slice(0, 30)}..." and "${toB.text.slice(0, 30)}..."`,
    });
  }

  // Sort by number of bullets connected (more = stronger), then by specificity
  return candidates
    .sort((a, b) => b.bulletIds.length - a.bulletIds.length || a.name.localeCompare(b.name))
    .slice(0, 10); // Cap at 10
}

/* ─── Step 3: Select Strongest 2-4 Motifs ─── */

function selectStrongestMotifs(
  candidates: CandidateMotif[],
  bullets: MotifBullet[],
  connections: MotifConnection[]
): { selected: MotifGroup[]; reasoning: string[] } {
  if (candidates.length === 0) return { selected: [], reasoning: [] };

  // Score each candidate
  const scored = candidates.map((c, idx) => {
    let score = 0;
    const reasons: string[] = [];

    // Coverage: how many bullets does it connect?
    const coverage = c.bulletIds.length / bullets.length;
    score += coverage * 10;
    if (coverage >= 0.5) reasons.push(`Connects ${Math.round(coverage * 100)}% of your ideas`);

    // Cross-domain: does it connect different worlds?
    const cBullets = c.bulletIds.map(id => bullets.find(b => b.id === id)!).filter(Boolean);
    const domainSet = new Set(cBullets.flatMap(b => b.domains));
    if (domainSet.size >= 2) {
      score += domainSet.size * 2;
      reasons.push(`Bridges ${domainSet.size} different worlds (${[...domainSet].slice(0, 3).join(', ')})`);
    }

    // Specificity: prefer non-cliché motifs
    const clicheNames = ['leadership', 'growth', 'passion', 'perseverance', 'resilience', 'ambition', 'hard work', 'making an impact'];
    const isSpecific = !clicheNames.some(cl => c.name.toLowerCase().includes(cl) || c.description.toLowerCase().includes(cl));
    if (isSpecific) {
      score += 3;
      reasons.push('Feels original and specific');
    }

    // Connection strength between covered bullets
    const internalConns = connections.filter(conn =>
      c.bulletIds.includes(conn.fromId) && c.bulletIds.includes(conn.toId)
    );
    const avgStrength = internalConns.length > 0
      ? internalConns.reduce((s, conn) => s + conn.strength, 0) / internalConns.length
      : 0;
    score += avgStrength * 5;
    if (avgStrength >= 0.7) reasons.push('Strong internal connections');

    // Bridge quality: does it have deep bridge mechanisms?
    const hasBridge = internalConns.some(conn => conn.bridge);
    if (hasBridge) {
      score += 4;
      reasons.push('Has creative narrative bridge');
    }

    return { candidate: c, score, reasons, idx };
  });

  scored.sort((a, b) => b.score - a.score);

  // Select 2-4 non-overlapping motifs
  const selected: typeof scored = [];
  const usedBullets = new Set<string>();

  for (const item of scored) {
    if (selected.length >= 4) break;

    // Check overlap with already selected
    const overlapCount = item.candidate.bulletIds.filter(id => usedBullets.has(id)).length;
    const overlapRatio = overlapCount / item.candidate.bulletIds.length;

    if (overlapRatio < 0.5) { // Allow some overlap but not too much
      selected.push(item);
      for (const id of item.candidate.bulletIds) usedBullets.add(id);
    }
  }

  // Convert to MotifGroup format
  const reasoning: string[] = [];
  const motifs: MotifGroup[] = selected.map((item, mi) => {
    const c = item.candidate;
    const cBullets = c.bulletIds.map(id => bullets.find(b => b.id === id)!).filter(Boolean);
    const internalConns = connections.filter(conn =>
      c.bulletIds.includes(conn.fromId) && c.bulletIds.includes(conn.toId)
    );

    // Collect themes from covered bullets
    const themeCount: Record<string, number> = {};
    for (const b of cBullets) {
      for (const t of b.themes) themeCount[t] = (themeCount[t] || 0) + 1;
    }
    const sortedThemes = Object.entries(themeCount).sort((a, b) => b[1] - a[1]).map(([t]) => t);

    // Generate narrative
    const narrative = generateMotifNarrative(cBullets, sortedThemes.slice(0, 2), internalConns);

    // Generate structure
    const structure = generateEssayStructure(cBullets, internalConns, sortedThemes.slice(0, 2));

    // Flag clichés (Step 6)
    const weakConnections = flagWeakConnections(c, cBullets, internalConns, sortedThemes);

    // Find central tension
    const tensions = cBullets.flatMap(b => b.analysis.tensions);
    const tensionCount: Record<string, number> = {};
    for (const t of tensions) tensionCount[t] = (tensionCount[t] || 0) + 1;
    const topTension = Object.entries(tensionCount).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Build reasoning
    const reasonText = `**${c.name}** — ${item.reasons.join('. ')}.`;
    reasoning.push(reasonText);

    return {
      id: `motif_${mi}`,
      name: c.name,
      narrative,
      bulletIds: c.bulletIds,
      dominantThemes: sortedThemes.slice(0, 2),
      colorIdx: mi,
      centralTension: topTension,
      suggestedStructure: structure,
      weakConnections,
    };
  });

  return { selected: motifs, reasoning };
}

/* ─── Step 6: Flag Weak and Cliché Connections ─── */

const CLICHE_PATTERNS: { pattern: RegExp; warning: string; fix: string }[] = [
  {
    pattern: /\b(?:taught\s+me|learned\s+(?:that|to)|showed\s+me)\b/i,
    warning: '"Taught me" / "Showed me" is a cliché essay framing',
    fix: 'Instead of saying what you learned, show the moment of change through action and detail. Let the reader infer the lesson.',
  },
  {
    pattern: /\b(?:leader(?:ship)?|passion|perseveran|growth\s+(?:journey|mindset)|making?\s+(?:a|an)\s+(?:impact|difference)|hard\s*work|work\s+(?:ethic|hard))\b/i,
    warning: 'This theme appears in thousands of admissions essays',
    fix: 'These words are red flags for admissions officers. Replace the label with a specific scene that embodies it. Show the reader a leader — don\'t use the word "leader."',
  },
  {
    pattern: /\b(?:changed?\s+(?:my\s+)?(?:life|perspective|world)|eye[\s-]open|transformative?\s+experience|changed?\s+(?:who\s+i\s+am|everything|me\s+as\s+a\s+person))\b/i,
    warning: '"Changed my life/perspective" is vague and overused',
    fix: 'Instead of claiming transformation, show two concrete moments — one before and one after — and let the contrast speak for itself.',
  },
  {
    pattern: /\b(?:i\s+(?:am\s+)?passion(?:ate)?\s+about|my\s+passion\s+(?:for|is)|i\s+love\s+(?:to\s+)?(?:help|make|create))\b/i,
    warning: 'Declaring passion directly weakens the essay',
    fix: 'If you have to say you\'re passionate, the writing isn\'t showing it. Describe the 3am obsession, the thing you do when nobody\'s watching, the problem that won\'t leave your mind.',
  },
  {
    pattern: /\b(?:since\s+(?:i\s+was\s+)?(?:a\s+)?(?:young|little|child|kid)|ever\s+since\s+i\s+(?:was|can\s+remember)|from\s+a\s+young\s+age|growing\s+up)\b/i,
    warning: '"Ever since I was young" is one of the most common essay openings',
    fix: 'Start in a specific moment instead. "I was seven when..." is more powerful than "Ever since I was young..." because it grounds the reader in a real scene.',
  },
];

function flagWeakConnections(
  candidate: CandidateMotif,
  bullets: MotifBullet[],
  connections: MotifConnection[],
  themes: string[]
): string[] {
  const warnings: string[] = [];

  // Check for cliché themes
  const clicheThemes = ['leadership', 'growth', 'passion', 'resilience', 'ambition'];
  const dominantCliche = themes.filter(t => clicheThemes.includes(t));
  if (dominantCliche.length > 0 && !connections.some(c => c.bridge)) {
    warnings.push(
      `Your dominant theme "${dominantCliche[0]}" is one of the most common in admissions essays. To stand out: don't name the theme. Instead, show a specific moment that embodies it so clearly that the reader discovers it themselves. Replace the abstract word with a concrete image.`
    );
  }

  // Check bullet texts for cliché patterns
  for (const b of bullets) {
    for (const { pattern, warning, fix } of CLICHE_PATTERNS) {
      if (pattern.test(b.text)) {
        warnings.push(`In "${b.text.slice(0, 40)}...": ${warning}. ${fix}`);
        break; // One warning per bullet
      }
    }
  }

  // Check for weak connections (generic labels)
  for (const conn of connections) {
    if (conn.strength < 0.4 && conn.type !== 'deep_bridge') {
      const fromB = bullets.find(x => x.id === conn.fromId);
      const toB = bullets.find(x => x.id === conn.toId);
      if (fromB && toB) {
        warnings.push(
          `The connection between "${fromB.text.slice(0, 30)}..." and "${toB.text.slice(0, 30)}..." feels thin. Try adding more specific detail to both ideas — physical details, dialogue, or sensory descriptions — to strengthen the bridge.`
        );
      }
    }
  }

  return warnings.slice(0, 4); // Cap at 4 warnings to not overwhelm
}

/* ─── Step 5: Narrative Direction & Structure ─── */

function generateEssayStructure(bullets: MotifBullet[], connections: MotifConnection[], themes: string[]): string {
  const n = bullets.length;
  if (n === 0) return '';

  const hasContrast = connections.some(c => c.bridge?.type === 'contrast_resolution');
  const hasCauseEffect = connections.some(c => c.bridge?.type === 'cause_effect');
  const hasMetaphor = connections.some(c => c.bridge?.type === 'concrete_metaphor');
  const hasQuestion = connections.some(c => c.bridge?.type === 'evolving_question');
  const hasBridge = connections.some(c => c.bridge);

  if (hasMetaphor) {
    return `Act 1 — Setup: Open with the concrete image. Describe it in sensory detail — what it looks like, feels like, sounds like. Place the reader inside the first experience.\n\nAct 2 — Expansion: Show your other experiences, but let the image reappear naturally. Each time it shows up, it should carry new meaning because of what you've just revealed.\n\nAct 3 — Integration: Return to the image one final time. Now it has been transformed by everything the reader has learned about you. The image hasn't changed — you have.`;
  }

  if (hasContrast) {
    return `Act 1 — Setup: Introduce one side of the tension — the experience that established a particular worldview, habit, or expectation. Immerse the reader.\n\nAct 2 — Expansion: Show the contrasting experience that complicated or challenged that view. Don't rush the resolution. Let the reader sit in the discomfort.\n\nAct 3 — Integration: Don't resolve the tension neatly. Show how you hold both truths simultaneously. The sophistication of embracing contradiction IS the essay's insight.`;
  }

  if (hasCauseEffect) {
    return `Act 1 — Setup: Open in the middle of the later experience — the one shaped by the first. Show the reader how you operate, but don't explain why yet.\n\nAct 2 — Expansion: Flash back to the formative experience. Now the reader understands the origin of the instinct or approach they just witnessed.\n\nAct 3 — Integration: Return to the present. The "aha" moment isn't when you learned the lesson — it's when the reader connects the dots.`;
  }

  if (hasQuestion) {
    return `Act 1 — Setup: Introduce the question through your first experience. It should feel simple, maybe even naive, at this stage.\n\nAct 2 — Expansion: Show how subsequent experiences deepened, complicated, or transformed the question. It should evolve — not get answered.\n\nAct 3 — Integration: End with the question in its most evolved form. The best essays don't answer their central question — they show how the student's relationship with it has deepened.`;
  }

  if (hasBridge) {
    const bestBridge = connections.find(c => c.bridge)!;
    return `Act 1 — Setup: Open with the most vivid scene. Ground the reader in sensory detail.\n\nAct 2 — Expansion: Introduce the bridge: "${bestBridge.label}." Each paragraph should deepen the reader's understanding of this connection.\n\nAct 3 — Integration: End with a forward-looking moment that shows how these connected experiences will continue to shape who you're becoming.`;
  }

  return `Act 1 — Setup: Open with your most specific, visual moment. Use sensory detail to put the reader in the scene.\n\nAct 2 — Expansion: Layer in your other experiences. Each one should build on the previous, like layers of paint on a canvas — adding depth and dimension.\n\nAct 3 — Integration: Step back to reveal the full picture. What do these moments, taken together, reveal about who you are? Let the reader discover it rather than stating it.`;
}

/* ─── Narrative Generation (with bridge-aware specificity) ─── */

function generateMotifNarrative(bullets: MotifBullet[], themes: string[], connections: MotifConnection[]): string {
  const n = bullets.length;
  const texts = bullets.map(b => `"${b.text.length > 60 ? b.text.slice(0, 57) + '...' : b.text}"`);
  if (n === 0) return '';

  // Find the strongest bridge mechanism
  const bridgeConn = connections.filter(c => c.bridge).sort((a, b) => b.strength - a.strength)[0];

  if (bridgeConn?.bridge) {
    const bridgeType = bridgeConn.bridge.type;

    if (bridgeType === 'contrast_resolution') {
      return `These experiences create a powerful contrast. Start inside ${texts[0]} — immerse the reader in that world. Then pivot to ${texts[n > 1 ? 1 : 0]}, which reveals a completely different side of you. The essay's power comes from showing how these seemingly contradictory experiences coexist in one person. Don't explain the connection — let the reader feel it through the juxtaposition.`;
    }
    if (bridgeType === 'cause_effect') {
      return `One experience directly shaped the other. Open mid-action in the later experience (${texts[n > 1 ? 1 : 0]}), showing the reader how you operate. Then rewind to ${texts[0]} to reveal what forged this approach. The "before" and "after" versions of you ARE the narrative arc — don't state the change, embody it.`;
    }
    if (bridgeType === 'shared_craft') {
      return `You bring the same mindset to completely different worlds — that's your superpower. Open with ${texts[0]}, showing your approach in action through specific detail. Then jump to ${texts[n > 1 ? 1 : 0]}, and let the reader discover that the same instinct drives you in a totally different context. This reveals a depth of character that a single-topic essay can't match.`;
    }
    if (bridgeType === 'recurring_constraint') {
      return `The same challenge keeps finding you in different forms. Start with ${texts[0]} where you first encountered it. Then show it again in ${texts[n > 1 ? 1 : 0]}, but this time you recognize it — and your response is different. The essay isn't about overcoming the obstacle; it's about your evolving relationship with it.`;
    }
    if (bridgeType === 'concrete_metaphor') {
      return `You have a powerful recurring image connecting these experiences. Open with a vivid, sensory description in the context of ${texts[0]}. When it reappears in ${texts[n > 1 ? 1 : 0]}, it should carry new weight. This image IS your motif — let it do the narrative work so you never have to state the theme directly.`;
    }
    if (bridgeType === 'evolving_question') {
      return `There's a fundamental question running through these experiences. In ${texts[0]}, the question first emerges — maybe without you even realizing it. By ${texts[n > 1 ? 1 : 0]}, it has evolved but not resolved. The best essays don't answer their central question — they show how the student's relationship with the question has deepened and become more nuanced.`;
    }
  }

  // Theme-based narrative
  if (themes.length > 0) {
    const themeName = themes[0].replace(/_/g, ' ');
    return `The thread connecting these ideas is ${themeName} — but don't name it. Open with the most vivid, specific moment from ${texts[0]}. Each subsequent experience (${texts.slice(1).join(', ')}) becomes a new facet of the same core theme. Let the reader discover it through the accumulated weight of your concrete details. Show, never tell.`;
  }

  return `These experiences connect in ways that aren't obvious at first — and that's exactly what makes them powerful for an essay. Open with your most specific, sensory moment. Let each idea build on the previous one, creating a layered narrative. The reader should finish thinking: "I know this person." The unexpected connections between your experiences are what make your story uniquely yours.`;
}

/* ─── Full Analysis Pipeline (follows the 7-step model) ─── */

function analyzeMotifs(rawBullets: string[]): MotifAnalysis {
  // Step 1: Deep analysis of each bullet
  const bullets: MotifBullet[] = rawBullets
    .filter(t => t.trim().length > 0)
    .map((text, i) => {
      const trimmed = text.trim();
      return {
        id: `b_${i}`,
        text: trimmed,
        themes: detectThemes(trimmed),
        domains: detectDomains(trimmed),
        keywords: extractMotifKeywords(trimmed),
        analysis: analyzeBulletDeeply(trimmed),
      };
    });

  // Find all connections with bridge mechanisms
  const connections = findMotifConnections(bullets);

  // Step 2: Generate 6-10 candidate motifs
  const candidateMotifs = generateCandidateMotifs(bullets, connections);

  // Step 3: Select strongest 2-4 non-overlapping motifs
  const { selected: motifs, reasoning } = selectStrongestMotifs(candidateMotifs, bullets, connections);

  // Determine orphans (bullets not in any selected motif)
  const assignedIds = new Set(motifs.flatMap(m => m.bulletIds));
  const orphanIds = bullets.filter(b => !assignedIds.has(b.id)).map(b => b.id);

  return {
    bullets,
    connections,
    motifs,
    orphanIds,
    candidateMotifs,
    bridges: connections.filter(c => c.bridge),
  };
}

/* ─── Visual Board: Color palette ─── */

const MOTIF_PALETTE = [
  { bg: '#EEF2FF', border: '#6366F1', text: '#3730A3', accent: '#818CF8', light: '#C7D2FE', gradient: 'from-indigo-500 to-violet-500' },
  { bg: '#FEF3C7', border: '#D97706', text: '#78350F', accent: '#FBBF24', light: '#FDE68A', gradient: 'from-amber-500 to-orange-500' },
  { bg: '#D1FAE5', border: '#059669', text: '#064E3B', accent: '#34D399', light: '#A7F3D0', gradient: 'from-emerald-500 to-teal-500' },
  { bg: '#FFE4E6', border: '#E11D48', text: '#881337', accent: '#FB7185', light: '#FECDD3', gradient: 'from-rose-500 to-pink-500' },
  { bg: '#E0F2FE', border: '#0284C7', text: '#0C4A6E', accent: '#38BDF8', light: '#BAE6FD', gradient: 'from-sky-500 to-blue-500' },
  { bg: '#F3E8FF', border: '#9333EA', text: '#581C87', accent: '#C084FC', light: '#DDD6FE', gradient: 'from-purple-500 to-fuchsia-500' },
];

/* ─── Interactive Storyboard Component (HTML-based, draggable) ─── */

function MotifStoryboard({ analysis, expandedCard, setExpandedCard }: {
  analysis: MotifAnalysis;
  expandedCard: string | null;
  setExpandedCard: (id: string | null) => void;
}) {
  const { bullets, connections, motifs, orphanIds } = analysis;
  if (bullets.length === 0) return null;

  const orphanBullets = orphanIds.map(id => bullets.find(b => b.id === id)!).filter(Boolean);

  // Build connection lookup for highlighting
  const connectionMap: Record<string, { targetId: string; label: string; strength: number }[]> = {};
  for (const c of connections) {
    if (c.strength >= 0.3) {
      if (!connectionMap[c.fromId]) connectionMap[c.fromId] = [];
      if (!connectionMap[c.toId]) connectionMap[c.toId] = [];
      connectionMap[c.fromId].push({ targetId: c.toId, label: c.label, strength: c.strength });
      connectionMap[c.toId].push({ targetId: c.fromId, label: c.label, strength: c.strength });
    }
  }

  const connectedTo = expandedCard ? new Set((connectionMap[expandedCard] || []).map(c => c.targetId)) : new Set<string>();

  return (
    <div className="space-y-6">
      {/* Motif Groups */}
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(motifs.length + (orphanBullets.length > 0 ? 1 : 0), 3)}, 1fr)` }}>
        {motifs.map((motif, gi) => {
          const pal = MOTIF_PALETTE[gi % MOTIF_PALETTE.length];
          const mBullets = motif.bulletIds.map(id => bullets.find(b => b.id === id)!).filter(Boolean);

          return (
            <div key={motif.id} className="rounded-2xl border-2 overflow-hidden transition-all" style={{ borderColor: pal.border + '40', backgroundColor: pal.bg + 'cc' }}>
              {/* Motif header */}
              <div className="px-5 py-4 border-b" style={{ borderColor: pal.border + '20', background: `linear-gradient(135deg, ${pal.bg}, white)` }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: pal.border }}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: pal.text }}>{motif.name}</h4>
                    <p className="text-[10px] font-medium" style={{ color: pal.accent }}>
                      {motif.dominantThemes.map(t => t.replace(/_/g, ' ')).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' + ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bullet cards */}
              <div className="p-3 space-y-2">
                {mBullets.map(b => {
                  const isExpanded = expandedCard === b.id;
                  const isConnected = connectedTo.has(b.id);
                  const conns = connectionMap[b.id] || [];

                  return (
                    <div
                      key={b.id}
                      onClick={() => setExpandedCard(isExpanded ? null : b.id)}
                      className={`rounded-xl border-2 bg-white p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        isExpanded ? 'shadow-lg ring-2 scale-[1.02]' : isConnected && expandedCard ? 'ring-2 shadow-md scale-[1.01]' : 'hover:scale-[1.01]'
                      }`}
                      style={{
                        borderColor: isExpanded ? pal.border : isConnected && expandedCard ? pal.accent + '80' : pal.border + '30',
                        ringColor: isExpanded ? pal.border + '40' : pal.accent + '30',
                      }}
                    >
                      <p className="text-sm font-medium text-slate-800 leading-relaxed">{b.text}</p>

                      {/* Theme + value pills */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {b.themes.slice(0, 3).map(theme => (
                          <span key={theme} className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: pal.light, color: pal.text }}>
                            {theme.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {b.analysis.values.slice(0, 2).map(val => (
                          <span key={val} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                            {val.replace(/_val$/, '')}
                          </span>
                        ))}
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t space-y-3" style={{ borderColor: pal.border + '20' }}>
                          {/* Deep analysis */}
                          <div className="grid grid-cols-2 gap-2">
                            {b.analysis.stakes && (
                              <div className="p-2 rounded-lg bg-slate-50">
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Stakes</p>
                                <p className="text-[11px] text-slate-600 mt-0.5">{b.analysis.stakes}</p>
                              </div>
                            )}
                            {b.analysis.shift && (
                              <div className="p-2 rounded-lg bg-slate-50">
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Shift</p>
                                <p className="text-[11px] text-slate-600 mt-0.5">{b.analysis.shift}</p>
                              </div>
                            )}
                          </div>
                          {b.analysis.imagery.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">Imagery:</span>
                              {b.analysis.imagery.map(img => (
                                <span key={img} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-700">{img.replace('_', ' ')}</span>
                              ))}
                            </div>
                          )}

                          {/* Connections from this bullet */}
                          {conns.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: pal.border }}>Connections</p>
                              {conns.slice(0, 4).map((conn, ci) => {
                                const target = bullets.find(x => x.id === conn.targetId);
                                if (!target) return null;
                                return (
                                  <div key={ci} className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: pal.bg }}>
                                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: pal.border }} />
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-semibold text-slate-700 truncate">{target.text.slice(0, 50)}{target.text.length > 50 ? '...' : ''}</p>
                                      <p className="text-[10px] mt-0.5" style={{ color: pal.accent }}>{conn.label}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Orphan island */}
        {orphanBullets.length > 0 && (
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-300 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-500">Standalone Ideas</h4>
                  <p className="text-[10px] text-slate-400">Add more detail to find connections</p>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {orphanBullets.map(b => (
                <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.01]" onClick={() => setExpandedCard(expandedCard === b.id ? null : b.id)}>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed">{b.text}</p>
                  {b.themes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {b.themes.slice(0, 2).map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 text-slate-500">{t.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  )}
                  {expandedCard === b.id && b.analysis.values.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Underlying values</p>
                      <p className="text-[10px] text-slate-500">{b.analysis.values.map(v => v.replace(/_val$/, '')).join(', ')}</p>
                      <p className="text-[10px] text-slate-400 mt-1 italic">Try adding more experiences related to {b.analysis.values[0]?.replace(/_val$/, '') || 'this theme'} to find connections.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MOTIF WORKBENCH — drag-and-drop idea cards + activity import
   ══════════════════════════════════════════════════════════════════════ */

const MOTIF_TONE_CLASSES = [
  { dot: 'bg-indigo-500',  chip: 'bg-indigo-50 text-indigo-700 border-indigo-100',  ring: 'ring-indigo-200',  border: 'border-indigo-200',  bgSoft: 'bg-indigo-50/60',  text: 'text-indigo-700',  iconBg: 'bg-indigo-500' },
  { dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700 border-amber-100',     ring: 'ring-amber-200',   border: 'border-amber-200',   bgSoft: 'bg-amber-50/60',   text: 'text-amber-700',   iconBg: 'bg-amber-500' },
  { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-100', ring: 'ring-emerald-200', border: 'border-emerald-200', bgSoft: 'bg-emerald-50/60', text: 'text-emerald-700', iconBg: 'bg-emerald-500' },
  { dot: 'bg-rose-500',    chip: 'bg-rose-50 text-rose-700 border-rose-100',         ring: 'ring-rose-200',    border: 'border-rose-200',    bgSoft: 'bg-rose-50/60',    text: 'text-rose-700',    iconBg: 'bg-rose-500' },
  { dot: 'bg-sky-500',     chip: 'bg-sky-50 text-sky-700 border-sky-100',            ring: 'ring-sky-200',     border: 'border-sky-200',     bgSoft: 'bg-sky-50/60',     text: 'text-sky-700',     iconBg: 'bg-sky-500' },
  { dot: 'bg-purple-500',  chip: 'bg-purple-50 text-purple-700 border-purple-100',   ring: 'ring-purple-200',  border: 'border-purple-200',  bgSoft: 'bg-purple-50/60',  text: 'text-purple-700',  iconBg: 'bg-purple-500' },
];

interface MotifIdea { id: string; text: string; sourceId?: string; }

function MotifWorkbench({
  ideas, ecs, ecsLoading,
  draggingIdeaId, setDraggingIdeaId,
  addIdea, removeIdea, updateIdea, reorderIdeas,
  newIdeaDraft, setNewIdeaDraft,
  runMotifAnalysis, hasAnalysis,
  savedBoards, loadBoard, activeBoardId,
  boardTitle, setBoardTitle, saveMotifBoard, savingBoard, newBoard,
}: {
  ideas: MotifIdea[];
  ecs: Extracurricular[];
  ecsLoading: boolean;
  draggingIdeaId: string | null;
  setDraggingIdeaId: (id: string | null) => void;
  addIdea: (text: string, sourceId?: string) => void;
  removeIdea: (id: string) => void;
  updateIdea: (id: string, text: string) => void;
  reorderIdeas: (fromId: string, toId: string) => void;
  newIdeaDraft: string;
  setNewIdeaDraft: (s: string) => void;
  runMotifAnalysis: () => void;
  hasAnalysis: boolean;
  savedBoards: SavedBoard[];
  loadBoard: (b: SavedBoard) => void;
  activeBoardId: string | null;
  boardTitle: string;
  setBoardTitle: (s: string) => void;
  saveMotifBoard: () => void;
  savingBoard: boolean;
  newBoard: () => void;
}) {
  const usedSourceIds = new Set(ideas.map(i => i.sourceId).filter(Boolean));
  const availableEcs = ecs.filter(e => !usedSourceIds.has(e.id));
  const canAnalyze = ideas.length >= 2;

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDropOn = (targetId: string) => {
    if (draggingIdeaId && draggingIdeaId !== targetId) reorderIdeas(draggingIdeaId, targetId);
    setDraggingIdeaId(null);
  };

  const ecToIdeaText = (ec: Extracurricular) => {
    const role = ec.role ? `${ec.role} of ` : '';
    const time = ec.years ? ` (${ec.years} yr${ec.years !== 1 ? 's' : ''})` : '';
    const desc = ec.description ? ` — ${ec.description}` : '';
    return `${role}${ec.name}${time}${desc}`.trim();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* LEFT: Idea board (2/3) */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">Idea Board</h3>
              <p className="text-[11px] text-slate-400">Drag to reorder · click to edit</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">{ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'}</span>
            <button
              onClick={runMotifAnalysis}
              disabled={!canAnalyze}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {hasAnalysis ? 'Re-analyze' : 'Find Motifs'}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2 min-h-[200px]">
          {ideas.length === 0 && (
            <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-xl">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <p className="text-sm font-semibold text-slate-600">Start adding ideas</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">Drop in your experiences below or pull straight from your activities on the right.</p>
            </div>
          )}

          {ideas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              isDragging={draggingIdeaId === idea.id}
              onDragStart={() => setDraggingIdeaId(idea.id)}
              onDragEnd={() => setDraggingIdeaId(null)}
              onDragOver={handleDragOver}
              onDrop={() => handleDropOn(idea.id)}
              onUpdate={text => updateIdea(idea.id, text)}
              onRemove={() => removeIdea(idea.id)}
            />
          ))}

          {/* Inline new-idea row */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newIdeaDraft}
              onChange={e => setNewIdeaDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newIdeaDraft.trim()) { addIdea(newIdeaDraft); setNewIdeaDraft(''); } }}
              placeholder="Add a new idea and press Enter…"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            />
            <button
              onClick={() => { if (newIdeaDraft.trim()) { addIdea(newIdeaDraft); setNewIdeaDraft(''); } }}
              disabled={!newIdeaDraft.trim()}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>

        {/* Footer: save board controls */}
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={boardTitle}
            onChange={e => setBoardTitle(e.target.value)}
            placeholder="Board name…"
            className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button onClick={saveMotifBoard} disabled={savingBoard || ideas.length === 0} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 disabled:opacity-40">
            {savingBoard ? 'Saving…' : activeBoardId ? 'Update board' : 'Save board'}
          </button>
          {activeBoardId && (
            <button onClick={newBoard} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50">+ New</button>
          )}
          {savedBoards.length > 0 && (
            <select
              onChange={e => { const board = savedBoards.find(b => b.id === e.target.value); if (board) loadBoard(board); }}
              value={activeBoardId || ''}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="" disabled>Load board…</option>
              {savedBoards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* RIGHT: Activity Library (1/3) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">Your Activities</h3>
              <p className="text-[11px] text-slate-400">One click to import</p>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-1.5 max-h-[420px] overflow-y-auto">
          {ecsLoading && <p className="text-xs text-slate-400 text-center py-6">Loading activities…</p>}
          {!ecsLoading && ecs.length === 0 && (
            <div className="text-center py-8 px-3">
              <p className="text-xs text-slate-500 leading-relaxed">No activities yet. Add some in your{' '}
                <a href="/dashboard/profile" className="text-indigo-600 font-semibold underline">Profile</a>
                {' '}to use them here.
              </p>
            </div>
          )}
          {!ecsLoading && availableEcs.length === 0 && ecs.length > 0 && (
            <p className="text-xs text-slate-400 text-center py-4 italic">All activities imported.</p>
          )}
          {availableEcs.map(ec => (
            <button
              key={ec.id}
              onClick={() => addIdea(ecToIdeaText(ec), ec.id)}
              className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-700 truncate">{ec.name}</p>
                  {ec.role && <p className="text-[10px] text-slate-500 truncate">{ec.role}</p>}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{ec.category}</span>
                    {ec.years > 0 && <span className="text-[9px] text-slate-400">{ec.years} yr</span>}
                  </div>
                </div>
                <span className="flex-shrink-0 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none">+</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function IdeaCard({
  idea, isDragging, onDragStart, onDragEnd, onDragOver, onDrop, onUpdate, onRemove,
}: {
  idea: MotifIdea;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onUpdate: (text: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(idea.text);

  const commit = () => {
    if (draft.trim() && draft.trim() !== idea.text) onUpdate(draft.trim());
    setEditing(false);
  };

  return (
    <div
      draggable={!editing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group flex items-start gap-3 px-3.5 py-3 rounded-xl border bg-white hover:border-indigo-200 hover:shadow-sm transition-all ${
        isDragging ? 'opacity-50 border-indigo-300' : 'border-slate-200'
      }`}
    >
      {/* Drag handle */}
      <div className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-500 transition-colors" title="Drag to reorder">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); } if (e.key === 'Escape') { setDraft(idea.text); setEditing(false); } }}
            rows={2}
            className="w-full px-2 py-1 text-sm rounded-md border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
          />
        ) : (
          <p
            onClick={() => { setDraft(idea.text); setEditing(true); }}
            className="text-sm text-slate-700 leading-relaxed cursor-text"
          >
            {idea.text}
          </p>
        )}
        {idea.sourceId && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            From activity
          </span>
        )}
      </div>

      <button
        onClick={onRemove}
        className="flex-shrink-0 mt-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
        title="Remove"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MOTIF BOARD — Tailwind-first storyboard (replacement for MotifStoryboard)
   ══════════════════════════════════════════════════════════════════════ */

function MotifBoard({ analysis, expandedCard, setExpandedCard }: {
  analysis: MotifAnalysis;
  expandedCard: string | null;
  setExpandedCard: (id: string | null) => void;
}) {
  const { bullets, connections, motifs, orphanIds } = analysis;
  if (bullets.length === 0) return null;

  const orphanBullets = orphanIds.map(id => bullets.find(b => b.id === id)!).filter(Boolean);

  // Build connection lookup for highlighting
  const connectionMap: Record<string, { targetId: string; label: string; strength: number }[]> = {};
  for (const c of connections) {
    if (c.strength >= 0.3) {
      if (!connectionMap[c.fromId]) connectionMap[c.fromId] = [];
      if (!connectionMap[c.toId]) connectionMap[c.toId] = [];
      connectionMap[c.fromId].push({ targetId: c.toId, label: c.label, strength: c.strength });
      connectionMap[c.toId].push({ targetId: c.fromId, label: c.label, strength: c.strength });
    }
  }
  const connectedTo = expandedCard ? new Set((connectionMap[expandedCard] || []).map(c => c.targetId)) : new Set<string>();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {motifs.map((motif, gi) => {
        const tone = MOTIF_TONE_CLASSES[gi % MOTIF_TONE_CLASSES.length];
        const mBullets = motif.bulletIds.map(id => bullets.find(b => b.id === id)!).filter(Boolean);

        return (
          <div key={motif.id} className={`rounded-2xl border ${tone.border} bg-white overflow-hidden shadow-sm flex flex-col`}>
            {/* Header */}
            <div className={`px-4 py-3 border-b border-slate-100 ${tone.bgSoft} flex items-center gap-3`}>
              <div className={`w-8 h-8 rounded-lg ${tone.iconBg} flex items-center justify-center flex-shrink-0`}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`text-sm font-bold ${tone.text} truncate`}>{motif.name}</h4>
                <p className="text-[10px] font-medium text-slate-500 truncate">
                  {motif.dominantThemes.map(t => t.replace(/_/g, ' ')).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' · ')}
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tone.chip} border`}>
                {mBullets.length}
              </span>
            </div>

            {/* Bullet cards */}
            <div className="p-3 space-y-2 flex-1">
              {mBullets.map(b => {
                const isExpanded = expandedCard === b.id;
                const isConnected = connectedTo.has(b.id);
                const conns = connectionMap[b.id] || [];

                return (
                  <div
                    key={b.id}
                    onClick={() => setExpandedCard(isExpanded ? null : b.id)}
                    className={`rounded-xl border bg-white p-3 cursor-pointer transition-all hover:shadow-sm ${
                      isExpanded ? `${tone.border} ring-2 ${tone.ring}` :
                      isConnected && expandedCard ? `${tone.border}` :
                      'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-[13px] font-medium text-slate-800 leading-relaxed">{b.text}</p>

                    {/* Theme + value pills */}
                    {(b.themes.length > 0 || b.analysis.values.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {b.themes.slice(0, 3).map(theme => (
                          <span key={theme} className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${tone.chip} border`}>
                            {theme.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {b.analysis.values.slice(0, 2).map(val => (
                          <span key={val} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-500">
                            {val.replace(/_val$/, '')}
                          </span>
                        ))}
                      </div>
                    )}

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                        {(b.analysis.stakes || b.analysis.shift) && (
                          <div className="grid grid-cols-2 gap-2">
                            {b.analysis.stakes && (
                              <div className="p-2 rounded-md bg-slate-50">
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Stakes</p>
                                <p className="text-[11px] text-slate-600 mt-0.5">{b.analysis.stakes}</p>
                              </div>
                            )}
                            {b.analysis.shift && (
                              <div className="p-2 rounded-md bg-slate-50">
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Shift</p>
                                <p className="text-[11px] text-slate-600 mt-0.5">{b.analysis.shift}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {conns.length > 0 && (
                          <div className="space-y-1">
                            <p className={`text-[9px] font-bold uppercase tracking-wider ${tone.text}`}>Connections</p>
                            {conns.slice(0, 3).map((conn, ci) => {
                              const target = bullets.find(x => x.id === conn.targetId);
                              if (!target) return null;
                              return (
                                <div key={ci} className={`flex items-start gap-2 p-1.5 rounded-md ${tone.bgSoft}`}>
                                  <span className={`w-1 h-1 rounded-full mt-1.5 flex-shrink-0 ${tone.dot}`} />
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-semibold text-slate-700 truncate">{target.text.slice(0, 60)}{target.text.length > 60 ? '…' : ''}</p>
                                    <p className={`text-[9px] mt-0.5 ${tone.text}`}>{conn.label}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Orphans */}
      {orphanBullets.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-600">Standalone</h4>
              <p className="text-[10px] text-slate-400">Add more detail to find connections</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {orphanBullets.map(b => (
              <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[13px] font-medium text-slate-700 leading-relaxed">{b.text}</p>
                {b.analysis.values.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1.5 italic">
                    Try adding experiences related to {b.analysis.values[0]?.replace(/_val$/, '') || 'this theme'}.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   GRAMMAR EDITOR COMPONENT
   Renders essay text with numbered highlights for grammar issues and a
   side panel listing the matching suggestions. Errors are listed first,
   then optimizations. One click accepts a fix.
   ══════════════════════════════════════════════════════════════════════ */

function GrammarEditor({
  content,
  issues,
  activeIssueId,
  onSelectIssue,
  onAccept,
  onDismiss,
  onClose,
  errorCount,
  optCount,
}: {
  content: string;
  issues: GrammarIssue[];
  activeIssueId: string | null;
  onSelectIssue: (id: string | null) => void;
  onAccept: (issue: GrammarIssue) => void;
  onDismiss: (issue: GrammarIssue) => void;
  onClose: () => void;
  errorCount: number;
  optCount: number;
}) {
  // Number issues by display order (errors first then optimizations)
  const numbered = issues.map((iss, i) => ({ ...iss, num: i + 1 }));

  // Build a render plan: walk through text and for each position emit either
  // plain text or a highlight span based on the issues' ranges. Issues are
  // already deduped (no overlapping) so we can render in order.
  const sortedByPos = [...numbered].sort((a, b) => a.start - b.start);
  const segments: Array<{ type: 'text' | 'mark'; text: string; issue?: GrammarIssue & { num: number } }> = [];
  let cursor = 0;
  for (const iss of sortedByPos) {
    if (iss.start > cursor) {
      segments.push({ type: 'text', text: content.slice(cursor, iss.start) });
    }
    segments.push({ type: 'mark', text: content.slice(iss.start, iss.end), issue: iss });
    cursor = iss.end;
  }
  if (cursor < content.length) {
    segments.push({ type: 'text', text: content.slice(cursor) });
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
      {/* Highlighted text */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-6 py-4 lg:py-5">
        <div className="text-[14px] lg:text-[15px] leading-[1.85] font-sans text-slate-800 whitespace-pre-wrap break-words">
          {segments.map((seg, i) => {
            if (seg.type === 'text') return <span key={i}>{seg.text}</span>;
            const iss = seg.issue!;
            const isError = iss.severity === 'error';
            const isActive = activeIssueId === iss.id;
            return (
              <span
                key={i}
                onClick={() => onSelectIssue(isActive ? null : iss.id)}
                className={`relative cursor-pointer rounded-[3px] px-[1px] transition-colors ${
                  isError
                    ? isActive ? 'bg-rose-200/80' : 'bg-rose-100/70 hover:bg-rose-200/70'
                    : isActive ? 'bg-amber-200/80' : 'bg-amber-100/70 hover:bg-amber-200/70'
                }`}
                title={`${iss.title}: ${iss.message}`}
              >
                {seg.text}
                <sup className={`ml-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] text-[9px] font-bold rounded-full px-1 align-super ${
                  isError ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {iss.num}
                </sup>
              </span>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="mt-4 text-[10px] text-slate-400 hover:text-slate-600 italic"
        >
          Close grammar mode to return to editing
        </button>
      </div>

      {/* Suggestions sidebar */}
      <aside className="lg:w-80 xl:w-96 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50/70 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <div>
            <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">Grammar Suggestions</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {optCount} optimization{optCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            title="Close grammar mode"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {numbered.length === 0 && (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-xs font-semibold text-emerald-700">No issues found</p>
              <p className="text-[10px] text-slate-400 mt-1">Your writing reads cleanly.</p>
            </div>
          )}

          {numbered.map(iss => {
            const isError = iss.severity === 'error';
            const isActive = activeIssueId === iss.id;
            const canApply = iss.replacement !== iss.original;
            return (
              <div
                key={iss.id}
                onClick={() => onSelectIssue(isActive ? null : iss.id)}
                className={`rounded-xl border bg-white p-3 cursor-pointer transition-all ${
                  isActive
                    ? isError ? 'border-rose-400 ring-2 ring-rose-100 shadow-sm' : 'border-amber-400 ring-2 ring-amber-100 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isError ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {iss.num}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${isError ? 'text-rose-600' : 'text-amber-600'}`}>
                        {isError ? 'Error' : 'Optimization'}
                      </span>
                      <span className="text-[9px] text-slate-400">• {iss.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug mb-2">{iss.message}</p>

                    {canApply && (
                      <div className="text-[11px] font-mono bg-slate-50 rounded-md border border-slate-100 p-2 mb-2">
                        <div className="flex items-start gap-1.5">
                          <span className="text-rose-500 line-through break-all">{iss.original}</span>
                        </div>
                        {iss.replacement && (
                          <div className="flex items-start gap-1.5 mt-1">
                            <span className="text-emerald-600 break-all">{iss.replacement}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      {canApply && (
                        <button
                          onClick={e => { e.stopPropagation(); onAccept(iss); }}
                          className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white transition-all ${
                            isError
                              ? 'bg-rose-500 hover:bg-rose-600'
                              : 'bg-amber-500 hover:bg-amber-600'
                          }`}
                        >
                          {iss.replacement ? 'Apply fix' : 'Remove'}
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); onDismiss(iss); }}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SCORE BAR COMPONENT (compact for sidebar)
   ══════════════════════════════════════════════════════════════════════ */

function ScoreBar({ label, value, color, sublabel, invert }: {
  label: string; value: number | null; color: string; sublabel: string; invert?: boolean;
}) {
  const pct = value != null ? (invert ? 100 - value : value) : 0;
  let barColor = color;
  let grade = '';
  if (value != null) {
    if (invert) {
      barColor = value <= 20 ? '#10b981' : value <= 45 ? '#f59e0b' : '#ef4444';
      grade = value <= 20 ? 'A' : value <= 35 ? 'B' : value <= 50 ? 'C' : 'D';
    } else {
      barColor = value >= 70 ? '#10b981' : value >= 45 ? '#f59e0b' : '#ef4444';
      grade = value >= 80 ? 'A' : value >= 65 ? 'B' : value >= 45 ? 'C' : 'D';
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        <div className="flex items-center gap-1.5">
          {value != null && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${barColor}15`, color: barColor }}>
              {grade}
            </span>
          )}
          <span className="text-[11px] font-bold" style={{ color: barColor }}>
            {value != null ? (invert ? `${value}%` : `${value}`) : '\u2014'}
          </span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: barColor, boxShadow: value != null ? `0 0 8px ${barColor}40` : 'none' }}
        />
      </div>
      <p className="text-[9px] text-slate-400 mt-0.5">{value != null ? sublabel : 'Write 50+ words'}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */

export default function Essays() {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === 'unauthenticated') router.push('/auth/login'); }, [status, router]);

  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [creating, setCreating] = useState(false);

  const [activeEssay, setActiveEssay] = useState<Essay | null>(null);
  const [mobileEssayView, setMobileEssayView] = useState<'list' | 'editor'>('list');
  const [mobileEditorTab, setMobileEditorTab] = useState<'write' | 'scores'>('write');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ecs, setEcs] = useState<Extracurricular[]>([]);
  const [ecsLoading, setEcsLoading] = useState(true);

  const [essayReviews, setEssayReviews] = useState<Record<string, any>>({});
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

  // ─── Motifs state ───
  const [mode, setMode] = useState<'essays' | 'motifs' | 'supplementals'>('essays');
  const [motifInput, setMotifInput] = useState('');
  // Idea cards (canonical) — drag-and-droppable representation of motifInput
  const [motifIdeas, setMotifIdeas] = useState<{ id: string; text: string; sourceId?: string }[]>([]);
  const [motifAnalysis, setMotifAnalysis] = useState<MotifAnalysis | null>(null);
  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [boardTitle, setBoardTitle] = useState('');
  const [savingBoard, setSavingBoard] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [motifView, setMotifView] = useState<'board' | 'narrative'>('board');
  const [draggingIdeaId, setDraggingIdeaId] = useState<string | null>(null);
  const [newIdeaDraft, setNewIdeaDraft] = useState('');

  // Keep motifInput in sync with motifIdeas (for save / re-analyze)
  useEffect(() => {
    setMotifInput(motifIdeas.map(i => i.text).join('\n'));
  }, [motifIdeas]);

  const addIdea = useCallback((text: string, sourceId?: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMotifIdeas(prev => {
      // Avoid dupes when importing the same activity twice
      if (sourceId && prev.some(p => p.sourceId === sourceId)) return prev;
      return [...prev, { id: `idea_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text: trimmed, sourceId }];
    });
  }, []);

  const removeIdea = useCallback((id: string) => {
    setMotifIdeas(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateIdea = useCallback((id: string, text: string) => {
    setMotifIdeas(prev => prev.map(i => i.id === id ? { ...i, text } : i));
  }, []);

  const reorderIdeas = useCallback((fromId: string, toId: string) => {
    setMotifIdeas(prev => {
      const fromIdx = prev.findIndex(i => i.id === fromId);
      const toIdx = prev.findIndex(i => i.id === toId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  // ─── Supplementals state ───
  const [suppSchoolFilter, setSuppSchoolFilter] = useState<string>('all');
  const [suppTypeFilter, setSuppTypeFilter] = useState<SuppPromptType | 'all'>('all');
  const [suppExpandedPrompt, setSuppExpandedPrompt] = useState<string | null>(null);

  const trackerSchools = useMemo(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('admitsonly_applications') : null;
      if (stored) {
        const apps = JSON.parse(stored) as { name: string }[];
        return apps.map(a => a.name);
      }
    } catch {}
    return [];
  }, [mode]); // re-check when switching to supplementals mode

  const reuseMatches = useMemo(() => {
    if (mode !== 'supplementals' || essays.length === 0) return [];
    const schoolNames = trackerSchools.length > 0
      ? trackerSchools
      : SCHOOLS.map(s => s.name);
    return findReuseOpportunities(
      essays.map(e => ({ id: e.id, title: e.title, prompt: e.prompt, content: e.content })),
      schoolNames
    );
  }, [mode, essays, trackerSchools]);

  // Load essays + ECs
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/essays').then(r => r.json()).then(d => { setEssays(d.essays || []); setLoading(false); }).catch(() => setLoading(false));
    fetch('/api/profile').then(r => r.json()).then(d => { if (d.profile?.extracurriculars) setEcs(d.profile.extracurriculars as Extracurricular[]); setEcsLoading(false); }).catch(() => setEcsLoading(false));
    fetch('/api/motifs').then(r => r.json()).then(d => setSavedBoards(d.boards || [])).catch(() => {});
    fetch('/api/essays/submit-for-review').then(r => r.json()).then(d => {
      var map: Record<string, any> = {};
      var revs = d.reviews || [];
      for (var i = 0; i < revs.length; i++) { map[revs[i].essayId] = revs[i]; }
      setEssayReviews(map);
    }).catch(() => {});
  }, [status]);

  // EC insights (debounced via content)
  const ecInsights = useMemo(() => {
    if (!activeEssay) return [];
    return analyzeEssayECConnections(editContent, activeEssay.prompt || '', ecs);
  }, [editContent, activeEssay, ecs]);

  // Live writing tips
  const liveTips = useMemo(() => {
    if (!activeEssay) return [];
    return generateLiveTips(editContent, activeEssay.prompt || '', ecs);
  }, [editContent, activeEssay, ecs]);

  // Prompt classification
  const promptAnalysis = useMemo(() => {
    if (!activeEssay?.prompt) return null;
    const { primary } = classifyPrompt(activeEssay.prompt);
    return primary;
  }, [activeEssay]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/essays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle.trim(), prompt: newPrompt.trim() }) });
      const data = await res.json();
      if (data.essay) { setEssays(prev => [data.essay, ...prev]); setActiveEssay(data.essay); setEditContent(data.essay.content || ''); }
    } catch (e) {}
    setCreating(false); setShowNewForm(false); setNewTitle(''); setNewPrompt('');
  };

  const handleContentChange = useCallback((content: string) => {
    setEditContent(content);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!activeEssay) return;
      setSaving(true);
      try {
        const res = await fetch('/api/essays', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: activeEssay.id, content, status: content.trim().length > 50 ? 'Draft' : 'Not Started' }) });
        const data = await res.json();
        if (data.essay) { setActiveEssay(data.essay); setEssays(prev => prev.map(e => e.id === data.essay.id ? data.essay : e)); }
      } catch (e) {}
      setSaving(false);
    }, 1200);
  }, [activeEssay]);

  const openEssay = (essay: Essay) => { setActiveEssay(essay); setEditContent(essay.content || ''); setMobileEssayView('editor'); setMobileEditorTab('write'); };

  const deleteEssay = async (id: string) => {
    try { await fetch('/api/essays', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); setEssays(prev => prev.filter(e => e.id !== id)); if (activeEssay?.id === id) { setActiveEssay(null); setEditContent(''); } } catch (e) {}
  };

  const markComplete = async () => {
    if (!activeEssay) return;
    setSaving(true);
    try { const res = await fetch('/api/essays', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: activeEssay.id, status: 'Complete' }) }); const data = await res.json(); if (data.essay) { setActiveEssay(data.essay); setEssays(prev => prev.map(e => e.id === data.essay.id ? data.essay : e)); } } catch (e) {}
    setSaving(false);
  };

  const submitForReview = async () => {
    if (!activeEssay) return;
    setSubmittingReview(true);
    try {
      var res = await fetch('/api/essays/submit-for-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ essayId: activeEssay.id, note: reviewNote }),
      });
      var data = await res.json();
      if (data.review) {
        setEssayReviews(function(prev) { var next = Object.assign({}, prev); next[activeEssay.id] = data.review; return next; });
        setShowReviewModal(false);
        setReviewNote('');
      }
    } catch (e) {}
    setSubmittingReview(false);
  };

  // ─── Motif actions ───
  const runMotifAnalysis = useCallback(() => {
    const lines = motifIdeas.map(i => i.text.replace(/^[\s\-\u2022\*]+/, '').trim()).filter(l => l.length > 0);
    if (lines.length < 2) return;
    const result = analyzeMotifs(lines);
    setMotifAnalysis(result);
  }, [motifIdeas]);

  const saveMotifBoard = useCallback(async () => {
    if (!motifAnalysis || motifAnalysis.bullets.length === 0) return;
    setSavingBoard(true);
    try {
      const body: Record<string, unknown> = {
        title: boardTitle.trim() || 'Untitled Board',
        bullets: motifAnalysis.bullets.map(b => b.text),
        analysis: motifAnalysis,
      };
      if (activeBoardId) body.id = activeBoardId;
      const r = await fetch('/api/motifs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json();
      if (data.board) {
        if (activeBoardId) {
          setSavedBoards(prev => prev.map(b => b.id === data.board.id ? data.board : b));
        } else {
          setSavedBoards(prev => [data.board, ...prev]);
          setActiveBoardId(data.board.id);
        }
      }
    } catch { /* ignore */ }
    setSavingBoard(false);
  }, [motifAnalysis, boardTitle, activeBoardId]);

  const loadBoard = useCallback((board: SavedBoard) => {
    setActiveBoardId(board.id);
    setBoardTitle(board.title);
    const bulletTexts = Array.isArray(board.bullets) ? (board.bullets as string[]) : [];
    setMotifIdeas(bulletTexts.map((t, i) => ({ id: `idea_load_${i}_${Math.random().toString(36).slice(2, 6)}`, text: t })));
    if (board.analysis && typeof board.analysis === 'object' && 'bullets' in (board.analysis as Record<string, unknown>)) {
      setMotifAnalysis(board.analysis as MotifAnalysis);
    } else if (bulletTexts.length >= 2) {
      setMotifAnalysis(analyzeMotifs(bulletTexts));
    }
  }, []);

  const deleteBoard = useCallback(async (id: string) => {
    try {
      await fetch('/api/motifs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      setSavedBoards(prev => prev.filter(b => b.id !== id));
      if (activeBoardId === id) { setActiveBoardId(null); setMotifAnalysis(null); setMotifIdeas([]); setBoardTitle(''); }
    } catch { /* ignore */ }
  }, [activeBoardId]);

  const newBoard = useCallback(() => {
    setActiveBoardId(null);
    setMotifAnalysis(null);
    setMotifIdeas([]);
    setBoardTitle('');
  }, []);

  // ─── Sentence Analysis state ───
  const [showSentenceAnalysis, setShowSentenceAnalysis] = useState(false);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sentenceAnalysis = useMemo(() => {
    if (!showSentenceAnalysis || !editContent || editContent.trim().length < 30) return null;
    const analyzed = analyzeSentences(editContent);
    const stats = computeStats(analyzed);
    return { sentences: analyzed, stats };
  }, [editContent, showSentenceAnalysis]);

  // ─── Grammar check state ───
  const [showGrammar, setShowGrammar] = useState(false);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [dismissedIssueIds, setDismissedIssueIds] = useState<Set<string>>(new Set());

  const grammarIssues = useMemo<GrammarIssue[]>(() => {
    if (!showGrammar || !editContent || editContent.trim().length < 4) return [];
    return checkGrammar(editContent).filter(i => !dismissedIssueIds.has(i.id));
  }, [editContent, showGrammar, dismissedIssueIds]);

  const grammarErrorCount = grammarIssues.filter(i => i.severity === 'error').length;
  const grammarOptCount = grammarIssues.filter(i => i.severity === 'optimization').length;

  const acceptGrammarFix = useCallback((issue: GrammarIssue) => {
    const next = applyFix(editContent, issue);
    handleContentChange(next);
    setActiveIssueId(null);
  }, [editContent, handleContentChange]);

  const dismissGrammarIssue = useCallback((issue: GrammarIssue) => {
    setDismissedIssueIds(prev => {
      const next = new Set(prev);
      next.add(issue.id);
      return next;
    });
    if (activeIssueId === issue.id) setActiveIssueId(null);
  }, [activeIssueId]);

  // Reset dismissed list when switching essays
  useEffect(() => { setDismissedIssueIds(new Set()); setActiveIssueId(null); }, [activeEssay?.id]);

  if (status !== 'authenticated') return null;

  const wordCount = editContent.trim() ? editContent.trim().split(/\s+/).length : 0;
  const mentionedECs = ecInsights.filter(i => i.mentioned);
  const suggestedECs = ecInsights.filter(i => !i.mentioned && i.relevanceScore >= 1.5).slice(0, 3);

  return (
    <DashboardLayout>
      <Head><title>Essays | AdmitsOnly Dashboard</title></Head>

      {/* height: on mobile subtract extra 4rem for bottom tab bar; lg uses original calc */}
      <div className="flex flex-col h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)]">
        {/* Header with mode tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 lg:mb-5 flex-shrink-0 gap-3">
          <div className="flex items-center gap-3 lg:gap-5">
            {/* Mobile back to list button */}
            {mode === 'essays' && mobileEssayView === 'editor' && activeEssay && (
              <button
                onClick={() => setMobileEssayView('list')}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-50 transition-all flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            <div>
              <h1 className="text-xl lg:text-2xl font-bold font-display text-primary tracking-tight">Essay Workspace</h1>
              <p className="mt-0.5 text-xs lg:text-sm text-slate-400 hidden sm:block">{mode === 'essays' ? 'Write, analyze, and get real-time admissions-grade feedback.' : mode === 'motifs' ? 'Discover hidden connections between your ideas and stitch them into compelling stories.' : 'Browse school-specific prompts and find reuse opportunities across your essays.'}</p>
            </div>
            <div className="flex bg-slate-100/80 rounded-xl p-1 gap-0.5 backdrop-blur-sm border border-slate-200/50">
              <button
                onClick={() => setMode('essays')}
                className={`px-3 lg:px-5 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'essays' ? 'bg-white text-accent shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-primary'}`}
              >
                My Essays
              </button>
              <button
                onClick={() => setMode('motifs')}
                className={`px-3 lg:px-5 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'motifs' ? 'bg-white text-accent shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-primary'}`}
              >
                Motifs
              </button>
              <button
                onClick={() => setMode('supplementals')}
                className={`px-3 lg:px-5 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'supplementals' ? 'bg-white text-accent shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-primary'}`}
              >
                Prompts
              </button>
            </div>
          </div>
          {mode === 'essays' && <button onClick={() => setShowNewForm(true)} className="px-4 lg:px-5 py-2 lg:py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-accent to-purple-600 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5 flex-shrink-0">+ New Essay</button>}
        </div>

        {/* ═══════════════ MOTIFS MODE ═══════════════ */}
        {mode === 'motifs' && (
          <div className="flex-1 min-h-0 flex flex-col gap-5 overflow-y-auto">

            {/* ─── Idea Workbench: storyboard-style draggable cards + activity import ─── */}
            <MotifWorkbench
              ideas={motifIdeas}
              ecs={ecs}
              ecsLoading={ecsLoading}
              draggingIdeaId={draggingIdeaId}
              setDraggingIdeaId={setDraggingIdeaId}
              addIdea={addIdea}
              removeIdea={removeIdea}
              updateIdea={updateIdea}
              reorderIdeas={reorderIdeas}
              newIdeaDraft={newIdeaDraft}
              setNewIdeaDraft={setNewIdeaDraft}
              runMotifAnalysis={runMotifAnalysis}
              hasAnalysis={!!motifAnalysis}
              savedBoards={savedBoards}
              loadBoard={loadBoard}
              activeBoardId={activeBoardId}
              boardTitle={boardTitle}
              setBoardTitle={setBoardTitle}
              saveMotifBoard={saveMotifBoard}
              savingBoard={savingBoard}
              newBoard={newBoard}
            />

            {motifAnalysis && (
              <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    {motifAnalysis.bullets.length} ideas
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-[11px] font-semibold text-indigo-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    {motifAnalysis.motifs.length} motifs
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 border border-purple-100 text-[11px] font-semibold text-purple-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    {motifAnalysis.connections.filter(c => c.strength >= 0.3).length} bridges
                  </span>
                  {motifAnalysis.orphanIds.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-100 text-[11px] font-semibold text-amber-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {motifAnalysis.orphanIds.length} unconnected
                    </span>
                  )}
                </div>
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  <button onClick={() => setMotifView('board')} className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${motifView === 'board' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-primary'}`}>
                    Board
                  </button>
                  <button onClick={() => setMotifView('narrative')} className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${motifView === 'narrative' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-primary'}`}>
                    Narrative
                  </button>
                </div>
              </div>
            )}

            {/* ─── Results Area (full-width) ─── */}
            {motifAnalysis && (
              <>
                {motifView === 'board' ? (
                  <MotifBoard analysis={motifAnalysis} expandedCard={expandedCard} setExpandedCard={setExpandedCard} />
                ) : (
                  /* ── Narrative view ── */
                  <div className="space-y-6">

                    {/* Candidate motifs explored (collapsible) */}
                    {motifAnalysis.candidateMotifs && motifAnalysis.candidateMotifs.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-white">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            <h3 className="text-sm font-bold text-primary">Candidate Motifs Explored</h3>
                            <span className="text-[10px] text-purple-500 font-medium ml-1">({motifAnalysis.candidateMotifs.length} lenses tested)</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">We explored these potential narrative lenses against your ideas. The strongest {motifAnalysis.motifs.length} were selected below.</p>
                        </div>
                        <div className="p-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
                          {motifAnalysis.candidateMotifs.map((cm, ci) => {
                            const isSelected = motifAnalysis.motifs.some(m => m.name === cm.name);
                            return (
                              <div key={ci} className={`p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-accent/40 bg-accent/5' : 'border-slate-100 bg-slate-50/50'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  {isSelected && <span className="text-[9px] font-bold text-white bg-accent px-1.5 py-0.5 rounded-md uppercase">Selected</span>}
                                  <h4 className="text-xs font-bold text-primary">{cm.name}</h4>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed mb-2">{cm.description}</p>
                                <p className="text-[10px] text-slate-400 italic">{cm.symbolImage}</p>
                                <div className="mt-2 flex items-center gap-1">
                                  <span className="text-[9px] text-slate-400">Connects:</span>
                                  <span className="text-[10px] font-semibold text-accent">{cm.bulletIds.length} ideas</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Selected motifs (the main output) */}
                    {motifAnalysis.motifs.map((motif, mi) => {
                      const pal = MOTIF_PALETTE[motif.colorIdx % MOTIF_PALETTE.length];
                      const mBullets = motif.bulletIds.map(id => motifAnalysis.bullets.find(b => b.id === id)).filter(Boolean);
                      const candidateInfo = motifAnalysis.candidateMotifs?.find(cm => cm.name === motif.name);

                      return (
                        <div key={motif.id} className="bg-white rounded-2xl border-2 overflow-hidden shadow-sm" style={{ borderColor: pal.border + '30' }}>
                          {/* Header */}
                          <div className="px-6 py-5 border-b" style={{ borderColor: pal.border + '15', background: `linear-gradient(135deg, ${pal.bg}80, white)` }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: pal.border }}>
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                </div>
                                <div>
                                  <h3 className="text-base font-bold" style={{ color: pal.text }}>{motif.name}</h3>
                                  <p className="text-xs font-medium" style={{ color: pal.accent }}>
                                    {motif.dominantThemes.map(t => t.replace(/_/g, ' ')).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' + ')}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: pal.light, color: pal.text }}>
                                {mBullets.length} idea{mBullets.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          <div className="p-6 space-y-5">
                            {/* Candidate insight (what this motif reveals about the student) */}
                            {candidateInfo && (
                              <div className="p-4 rounded-xl border" style={{ borderColor: pal.border + '15', backgroundColor: pal.bg + '30' }}>
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: pal.border }}>What this motif reveals</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{candidateInfo.insight}</p>
                                <p className="text-xs text-slate-400 italic mt-2">Visual: {candidateInfo.symbolImage}</p>
                              </div>
                            )}

                            {/* Ideas in this motif */}
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Connected experiences</p>
                              <div className="flex flex-wrap gap-2">
                                {mBullets.map(b => b && (
                                  <div key={b.id} className="px-3 py-2 rounded-xl border text-sm" style={{ backgroundColor: pal.bg + '60', borderColor: pal.border + '25', color: pal.text }}>
                                    {b.text}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Narrative advice */}
                            <div className="p-5 rounded-xl border" style={{ backgroundColor: pal.bg + '40', borderColor: pal.border + '20' }}>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: pal.border }}>How to write this essay</p>
                              <p className="text-sm text-slate-700 leading-relaxed">{motif.narrative}</p>
                            </div>

                            {/* Structure suggestion (formatted with acts) */}
                            {motif.suggestedStructure && (
                              <div className="p-5 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-3 text-slate-500">Suggested essay structure</p>
                                <div className="space-y-3">
                                  {motif.suggestedStructure.split('\n\n').map((para, pi) => {
                                    const isAct = para.startsWith('Act');
                                    return (
                                      <div key={pi} className={isAct ? 'pl-4 border-l-2 border-accent/30' : ''}>
                                        <p className="text-sm text-slate-600 leading-relaxed">{para}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Weak connection / cliché warnings (Step 6) */}
                            {motif.weakConnections && motif.weakConnections.length > 0 && (
                              <div className="p-5 rounded-xl bg-amber-50 border border-amber-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                  <p className="text-xs font-bold text-amber-700">Cliché & Weakness Alerts</p>
                                </div>
                                <div className="space-y-2.5">
                                  {motif.weakConnections.map((w, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                      <p className="text-xs text-amber-800 leading-relaxed">{w}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Orphan ideas in narrative view */}
                    {motifAnalysis.orphanIds.length > 0 && (
                      <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                          <h3 className="text-sm font-bold text-slate-500">Standalone Ideas</h3>
                          <p className="text-xs text-slate-400 mt-0.5">These didn&apos;t connect strongly to the selected motifs. Try adding more specific detail — physical descriptions, dialogue, or sensory information — to strengthen connections.</p>
                        </div>
                        <div className="p-5 space-y-2">
                          {motifAnalysis.orphanIds.map(id => {
                            const b = motifAnalysis.bullets.find(x => x.id === id);
                            if (!b) return null;
                            return (
                              <div key={id} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                                <p className="text-sm text-slate-600">{b.text}</p>
                                {b.analysis.values.length > 0 && (
                                  <p className="text-[10px] text-slate-400 mt-1.5">
                                    Underlying values: {b.analysis.values.map(v => v.replace(/_val$/, '')).join(', ')} — try adding related experiences about {b.analysis.values[0]?.replace(/_val$/, '') || 'this value'}.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════════════ SUPPLEMENTALS MODE ═══════════════ */}
        {mode === 'supplementals' && (
          <div className="flex-1 min-h-0 flex flex-col gap-5 overflow-y-auto pb-6 lg:pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>

            {/* Prompt Detail Modal */}
            {suppExpandedPrompt && (() => {
              let modalSchool: SchoolData | undefined;
              let modalPrompt: SupplementalPrompt | undefined;
              for (const s of SCHOOLS) {
                const p = s.prompts.find(pr => pr.id === suppExpandedPrompt);
                if (p) { modalSchool = s; modalPrompt = p; break; }
              }
              if (!modalSchool || !modalPrompt) return null;
              const typeInfo = getPromptTypeInfo(modalPrompt.type);
              const matchesForThis = reuseMatches.filter(m => m.targetPrompt.id === modalPrompt!.id);
              const getWritingGuide = (type: string, schoolName: string) => {
                switch (type) {
                  case 'why_us': return `Research ${schoolName}'s specific programs, courses, professors, and traditions. Name at least 2-3 concrete details only found at this school. Avoid generic praise — admissions officers can tell when you haven't done your homework.`;
                  case 'community': return 'Focus on a specific community, not a generic one. Show what you gave, not just what you got. The best community essays show both belonging and contribution.';
                  case 'intellectual': return 'Go deep on one idea rather than listing many. Show how your thinking evolved. Admissions wants to see genuine curiosity and the ability to sit with complex questions.';
                  case 'activity': return 'Don\'t just describe the activity — show your unique approach and what it revealed about you. Focus on specific moments of learning or growth, not just accomplishments.';
                  case 'identity': return 'Be specific about moments and details. Avoid broad generalizations about your background. The best identity essays zoom into a single scene and expand outward.';
                  case 'challenge': return 'Focus more on growth than on the challenge itself. Admissions wants to see maturity, self-awareness, and the ability to learn from difficulty.';
                  case 'creative': return 'This is where you can take risks. Show personality and intellectual play. Don\'t try to be conventional — the prompt is giving you permission to be creative.';
                  case 'future': return 'Connect your past experiences to future goals. Show the throughline, not just the destination. Why this field? What specific experiences led you here?';
                  case 'diversity': return 'Be authentic. Don\'t perform diversity — show genuine perspective. The best diversity essays are specific and personal, not political or abstract.';
                  case 'roommate': return 'Be fun and genuine. This is about personality, not accomplishments. Show the human side that doesn\'t come through in transcripts.';
                  default: return 'Approach this prompt authentically and with specificity. Use concrete details and personal stories.';
                }
              };

              return (
                <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSuppExpandedPrompt(null)} />
                  <div className="relative bg-white sm:rounded-2xl shadow-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[85vh] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {/* Modal header */}
                    <div className="sticky top-0 bg-white border-b border-slate-100 p-3 sm:p-5 sm:rounded-t-2xl z-10">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold border flex-shrink-0 ${typeInfo.color}`}>
                            {typeInfo.icon} {typeInfo.label}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-primary truncate">{modalSchool.name}</span>
                        </div>
                        <button onClick={() => setSuppExpandedPrompt(null)} className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-slate-50 transition-all flex-shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>

                    <div className="p-3 sm:p-5 space-y-4 sm:space-y-5 pb-20 sm:pb-5">
                      {/* The prompt itself */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-sm text-primary leading-relaxed font-medium">&ldquo;{modalPrompt.text}&rdquo;</p>
                        <div className="flex items-center gap-3 mt-3">
                          {modalPrompt.wordLimit > 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-500">{modalPrompt.wordLimit} word limit</span>
                          )}
                          {modalPrompt.required && (
                            <span className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 text-[11px] font-semibold text-red-500">Required</span>
                          )}
                        </div>
                      </div>

                      {/* School context */}
                      <div className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-xs text-slate-400 flex-wrap">
                        <span>{modalSchool.location}</span>
                        <span>{modalSchool.acceptanceRate} acceptance</span>
                        <span className="hidden sm:inline">SAT {modalSchool.avgSAT}</span>
                        <span className="hidden sm:inline">GPA {modalSchool.avgGPA}</span>
                      </div>

                      {/* Essay tip */}
                      {modalSchool.essayTip && (
                        <div className="px-4 py-3 bg-amber-50 rounded-xl border border-amber-100">
                          <p className="text-xs text-amber-700"><span className="font-bold">Insider Tip:</span> {modalSchool.essayTip}</p>
                        </div>
                      )}

                      {/* Writing guide */}
                      <div className="bg-accent/5 rounded-xl p-4 border border-accent/10">
                        <p className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Writing Guide: {typeInfo.label} Essays</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{getWritingGuide(modalPrompt.type, modalSchool.name)}</p>
                      </div>

                      {/* Reuse matches */}
                      {matchesForThis.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-primary mb-3">Your Essays That Could Be Adapted ({matchesForThis.length})</p>
                          <div className="space-y-2">
                            {matchesForThis.map((match, mi) => (
                              <div key={mi} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-accent/30 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <p className="text-sm font-bold text-primary">&ldquo;{match.sourceEssayTitle}&rdquo;</p>
                                  <div className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                    match.matchScore >= 70 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                    match.matchScore >= 50 ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                    'bg-slate-50 text-slate-500 border border-slate-200'
                                  }`}>{match.matchScore}% match</div>
                                </div>
                                <div className="space-y-1 mb-3">
                                  {match.matchReasons.map((r, ri) => (
                                    <p key={ri} className="text-[11px] text-slate-500 flex items-start gap-1.5"><span className="text-accent mt-0.5">•</span> {r}</p>
                                  ))}
                                </div>
                                {match.adaptationNotes.length > 0 && (
                                  <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">What To Change</p>
                                    {match.adaptationNotes.map((n, ni) => (
                                      <p key={ni} className="text-[11px] text-amber-700 flex items-start gap-1.5"><span>→</span> {n}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Useful school details for "Why Us" prompts */}
                      {modalPrompt.type === 'why_us' && (
                        <div>
                          <p className="text-xs font-bold text-primary mb-3">Research for Your Essay</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                              <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1.5">Unique Programs</p>
                              {modalSchool.research.uniquePrograms.slice(0, 5).map((p, i) => (
                                <p key={i} className="text-[11px] text-slate-600 mb-0.5">• {p}</p>
                              ))}
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1.5">Notable Features</p>
                              {modalSchool.research.notableFeatures.slice(0, 5).map((f, i) => (
                                <p key={i} className="text-[11px] text-slate-600 mb-0.5">• {f}</p>
                              ))}
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5">Campus Culture</p>
                              {modalSchool.research.campusCulture.slice(0, 4).map((c, i) => (
                                <p key={i} className="text-[11px] text-slate-600 mb-0.5">• {c}</p>
                              ))}
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Student Life</p>
                              {modalSchool.research.studentLife.slice(0, 4).map((sl, i) => (
                                <p key={i} className="text-[11px] text-slate-600 mb-0.5">• {sl}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action buttons — sticky on mobile */}
                      <div className="flex gap-2 sm:gap-3 pt-2 sticky bottom-0 bg-white pb-1 sm:relative sm:pb-0">
                        <button
                          onClick={() => {
                            setNewTitle(`${modalSchool!.name} — ${typeInfo.label}`);
                            setNewPrompt(modalPrompt!.text.slice(0, 200));
                            setShowNewForm(true);
                            setMode('essays');
                            setSuppExpandedPrompt(null);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-5 py-3 bg-gradient-to-r from-accent to-purple-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          Start Writing
                        </button>
                        <button
                          onClick={() => setSuppExpandedPrompt(null)}
                          className="px-4 sm:px-5 py-3 border border-slate-200 text-slate-500 rounded-xl text-xs sm:text-sm font-medium hover:bg-slate-50 transition-all"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Filters + Live Stats */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 flex-shrink-0 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">School</label>
                  <select
                    value={suppSchoolFilter}
                    onChange={e => { setSuppSchoolFilter(e.target.value); }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all ${suppSchoolFilter !== 'all' ? 'border-accent/50 ring-1 ring-accent/20 text-accent font-semibold' : 'border-slate-200'}`}
                  >
                    <option value="all">All Schools ({SCHOOLS.length})</option>
                    {trackerSchools.length > 0 && <option disabled>── Your Schools ──</option>}
                    {trackerSchools.map(name => {
                      const school = findSchoolByName(name);
                      return school ? <option key={`tracker-${school.id}`} value={school.id}>{school.name}</option> : null;
                    })}
                    {trackerSchools.length > 0 && <option disabled>── All Schools ──</option>}
                    {(() => {
                      const trackerIds = new Set(trackerSchools.map(name => findSchoolByName(name)?.id).filter(Boolean));
                      return SCHOOLS.filter(s => !trackerIds.has(s.id)).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ));
                    })()}
                  </select>
                </div>
                <div className="flex-1 sm:flex-initial sm:min-w-[200px]">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Prompt Type</label>
                  <select
                    value={suppTypeFilter}
                    onChange={e => { setSuppTypeFilter(e.target.value as SuppPromptType | 'all'); }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all ${suppTypeFilter !== 'all' ? 'border-purple-400/50 ring-1 ring-purple-300/20 text-purple-600 font-semibold' : 'border-slate-200'}`}
                  >
                    <option value="all">All Prompt Types</option>
                    {SUPP_PROMPT_TYPES.filter(pt => pt.type !== 'other').map(pt => (
                      <option key={pt.type} value={pt.type}>{pt.icon} {pt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active filter badges + results count */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {suppSchoolFilter !== 'all' && (() => {
                    const school = SCHOOLS.find(s => s.id === suppSchoolFilter);
                    return school ? (
                      <button
                        onClick={() => setSuppSchoolFilter('all')}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent/10 text-accent text-xs font-semibold border border-accent/20 hover:bg-accent/20 transition-all"
                      >
                        {school.name}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    ) : null;
                  })()}
                  {suppTypeFilter !== 'all' && (() => {
                    const typeInfo = getPromptTypeInfo(suppTypeFilter);
                    return (
                      <button
                        onClick={() => setSuppTypeFilter('all')}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 text-purple-600 text-xs font-semibold border border-purple-200 hover:bg-purple-100 transition-all"
                      >
                        {typeInfo.icon} {typeInfo.label}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    );
                  })()}
                  {(suppSchoolFilter !== 'all' || suppTypeFilter !== 'all') && (
                    <button
                      onClick={() => { setSuppSchoolFilter('all'); setSuppTypeFilter('all'); }}
                      className="text-[11px] text-slate-400 hover:text-slate-600 font-medium underline underline-offset-2 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Live results counter */}
                {(() => {
                  const fs = suppSchoolFilter === 'all' ? SCHOOLS : SCHOOLS.filter(s => s.id === suppSchoolFilter);
                  let schoolCount = 0;
                  let promptCount = 0;
                  fs.forEach(school => {
                    const fp = suppTypeFilter === 'all' ? school.prompts : school.prompts.filter(p => p.type === suppTypeFilter);
                    if (fp.length > 0) { schoolCount++; promptCount += fp.length; }
                  });
                  return (
                    <p className="text-xs text-slate-400">
                      Showing <span className="font-bold text-primary">{promptCount}</span> prompt{promptCount !== 1 ? 's' : ''} across <span className="font-bold text-primary">{schoolCount}</span> school{schoolCount !== 1 ? 's' : ''}
                      {reuseMatches.length > 0 && <> &middot; <span className="font-bold text-emerald-600">{reuseMatches.length}</span> reuse matches</>}
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* Reuse Opportunities Banner */}
            {reuseMatches.length > 0 && (
              <div className="bg-gradient-to-r from-accent/5 to-purple-50 rounded-2xl border border-accent/20 p-4 lg:p-5 flex-shrink-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary">Essay Reuse Opportunities</h3>
                    <p className="text-xs text-slate-400">
                      {reuseMatches.length} match{reuseMatches.length !== 1 ? 'es' : ''} found
                      <span className="hidden sm:inline"> — click any card for details</span>
                    </p>
                  </div>
                </div>
                {/* Mobile: horizontal scroll strip; Desktop: grid */}
                <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-x-visible sm:pb-0 sm:snap-none" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {reuseMatches.map((match, i) => (
                    <button
                      key={i}
                      onClick={() => setSuppExpandedPrompt(match.targetPrompt.id)}
                      className="bg-white rounded-xl p-3 border border-slate-100 hover:border-accent/30 hover:shadow-md transition-all text-left group min-w-[240px] sm:min-w-0 snap-start flex-shrink-0 sm:flex-shrink"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${getPromptTypeInfo(match.targetPrompt.type).color}`}>
                          {getPromptTypeInfo(match.targetPrompt.type).icon} {getPromptTypeInfo(match.targetPrompt.type).label}
                        </span>
                        <span className={`text-[10px] font-bold ${
                          match.matchScore >= 70 ? 'text-emerald-600' : match.matchScore >= 50 ? 'text-amber-600' : 'text-slate-400'
                        }`}>{match.matchScore}%</span>
                      </div>
                      <p className="text-xs font-semibold text-primary truncate group-hover:text-accent transition-colors">&ldquo;{match.sourceEssayTitle}&rdquo;</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">→ {match.targetSchool.name}</p>
                      <p className="text-[10px] text-slate-300 mt-1 truncate italic">{match.targetPrompt.text.slice(0, 60)}...</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* School Prompt Cards — Interactive Grid */}
            {(() => {
              const filteredSchools = suppSchoolFilter === 'all'
                ? SCHOOLS
                : SCHOOLS.filter(s => s.id === suppSchoolFilter);

              const results = filteredSchools.map(school => {
                const filteredPrompts = suppTypeFilter === 'all'
                  ? school.prompts
                  : school.prompts.filter(p => p.type === suppTypeFilter);

                if (filteredPrompts.length === 0) return null;

                const inTracker = trackerSchools.some(name =>
                  findSchoolByName(name)?.id === school.id
                );

                return (
                  <div key={school.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-slate-200 transition-all flex-shrink-0">
                    {/* School header */}
                    <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-bold font-display text-primary truncate">{school.name}</h3>
                            {inTracker && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent/10 text-accent border border-accent/20 flex-shrink-0">On Your List</span>
                            )}
                            <span className="text-[10px] text-slate-400 flex-shrink-0">{filteredPrompts.length} prompt{filteredPrompts.length > 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 mt-1 text-[11px] sm:text-xs text-slate-400 flex-wrap">
                            <span>{school.location}</span>
                            <span>{school.acceptanceRate}</span>
                            <span className="hidden sm:inline">SAT {school.avgSAT}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 hidden sm:block">
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            {school.deadlines.ea && <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">EA {school.deadlines.ea}</span>}
                            {school.deadlines.ed && <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-600">ED {school.deadlines.ed}</span>}
                            {school.deadlines.rd && <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">RD {school.deadlines.rd}</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Prompt cards as clickable tiles */}
                    <div className="p-2 sm:p-3 lg:p-4 grid gap-2 sm:grid-cols-2">
                      {filteredPrompts.map(prompt => {
                        const typeInfo = getPromptTypeInfo(prompt.type);
                        const matchesForThis = reuseMatches.filter(m => m.targetPrompt.id === prompt.id);

                        return (
                          <button
                            key={prompt.id}
                            onClick={() => setSuppExpandedPrompt(prompt.id)}
                            className="text-left p-3 sm:p-4 rounded-xl border border-slate-100 hover:border-accent/30 hover:shadow-md hover:bg-accent/[0.02] transition-all group"
                          >
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeInfo.color}`}>
                                {typeInfo.icon} {typeInfo.label}
                              </span>
                              {prompt.wordLimit > 0 && (
                                <span className="text-[10px] text-slate-400">{prompt.wordLimit}w</span>
                              )}
                              {prompt.required && (
                                <span className="text-[9px] font-bold text-red-400">REQ</span>
                              )}
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed line-clamp-3 group-hover:text-primary transition-colors">{prompt.text}</p>
                            <div className="flex items-center justify-between mt-2 sm:mt-3">
                              {matchesForThis.length > 0 ? (
                                <span className="text-[10px] font-bold text-accent">{matchesForThis.length} reuse match{matchesForThis.length > 1 ? 'es' : ''}</span>
                              ) : (
                                <span className="text-[10px] text-slate-300">Tap to explore</span>
                              )}
                              <svg className="w-4 h-4 text-slate-300 group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Essay tip footer */}
                    {school.essayTip && (
                      <div className="mx-2 sm:mx-3 lg:mx-4 mb-2 sm:mb-3 lg:mb-4 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-[11px] text-amber-700"><span className="font-bold">Tip:</span> {school.essayTip}</p>
                      </div>
                    )}
                  </div>
                );
              });

              const hasResults = results.some(r => r !== null);
              if (!hasResults) {
                return (
                  <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                      <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">No prompts match your filters</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting the school or prompt type filter above</p>
                    <button
                      onClick={() => { setSuppSchoolFilter('all'); setSuppTypeFilter('all'); }}
                      className="mt-3 px-4 py-2 text-xs font-semibold text-accent bg-accent/10 rounded-lg hover:bg-accent/20 transition-all"
                    >
                      Clear All Filters
                    </button>
                  </div>
                );
              }

              return results;
            })()}
          </div>
        )}

        {/* ═══════════════ ESSAYS MODE ═══════════════ */}

        {/* New Essay Form */}
        {mode === 'essays' && showNewForm && (
          <div className="bg-white rounded-2xl border border-accent/20 p-5 shadow-lg mb-4 flex-shrink-0">
            <h3 className="text-base font-bold font-display text-primary mb-3">Create New Essay</h3>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Essay title (e.g. Personal Statement)" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" autoFocus />
              <input type="text" value={newPrompt} onChange={e => setNewPrompt(e.target.value)} placeholder="Prompt (e.g. Describe a creative solution...)" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
            </div>
            <div className="flex gap-2 justify-end mt-3">
              <button onClick={() => { setShowNewForm(false); setNewTitle(''); setNewPrompt(''); }} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
              <button onClick={handleCreate} disabled={!newTitle.trim() || creating} className="px-5 py-2 text-sm font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40">{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        )}

        {/* ═══ 3-COLUMN LAYOUT ═══ */}
        {mode === 'essays' && <div className="flex-1 min-h-0 grid lg:grid-cols-[240px_1fr_340px] gap-4 lg:gap-5">

          {/* ─── LEFT: Essay List ─── */}
          <div className={`overflow-y-auto space-y-2 pr-1 ${mobileEssayView === 'editor' && activeEssay ? 'hidden lg:block' : ''}`}>
            {loading ? (
              <div className="text-center py-12"><div className="animate-pulse text-sm text-slate-400">Loading...</div></div>
            ) : essays.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <p className="text-sm font-medium text-slate-400">No essays yet</p>
                <p className="text-xs text-slate-300 mt-1">Create your first essay to begin</p>
              </div>
            ) : (
              essays.map(essay => {
                const essayWords = essay.content ? essay.content.trim().split(/\s+/).length : 0;
                return (
                  <div
                    key={essay.id}
                    onClick={() => openEssay(essay)}
                    className={`p-4 rounded-xl border-2 cursor-pointer group transition-all duration-200 ${
                      activeEssay?.id === essay.id ? 'bg-accent/5 border-accent/30 shadow-md' : 'bg-white border-transparent hover:border-slate-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-primary truncate flex-1">{essay.title}</h3>
                      <button onClick={e => { e.stopPropagation(); deleteEssay(essay.id); }} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    {essay.prompt && <p className="text-[10px] text-slate-400 italic mt-1 truncate">{essay.prompt}</p>}
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusColors[essay.status] || statusColors['Draft']}`}>{essay.status}</span>
                      {essay.overallScore != null && (
                        <span className={`text-[10px] font-bold ${essay.overallScore >= 70 ? 'text-emerald-600' : essay.overallScore >= 45 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {essay.overallScore}%
                        </span>
                      )}
                      <span className="text-[10px] text-slate-300">{essayWords}w</span>
                      {essayReviews[essay.id] && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          essayReviews[essay.id].status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          essayReviews[essay.id].status === 'in_review' ? 'bg-blue-100 text-blue-700' :
                          essayReviews[essay.id].status === 'returned' ? 'bg-purple-100 text-purple-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {essayReviews[essay.id].status === 'completed' ? 'Reviewed' :
                           essayReviews[essay.id].status === 'in_review' ? 'In Review' :
                           essayReviews[essay.id].status === 'returned' ? 'Returned' : 'Pending'}
                        </span>
                      )}
                    </div>
                    {/* Mini score indicators on essay cards */}
                    {essay.overallScore != null && (
                      <div className="flex items-center gap-1.5 mt-2">
                        {[
                          { val: essay.aiScore, label: 'V', inv: true },
                          { val: essay.vocabScore, label: 'L', inv: false },
                          { val: essay.grammarScore, label: 'S', inv: false },
                          { val: essay.originalityScore, label: 'T', inv: false },
                          { val: essay.overallScore, label: 'I', inv: false },
                        ].map((s, si) => {
                          const c = s.val != null ? (s.inv ? (s.val <= 20 ? '#10b981' : s.val <= 45 ? '#f59e0b' : '#ef4444') : (s.val >= 70 ? '#10b981' : s.val >= 45 ? '#f59e0b' : '#ef4444')) : '#cbd5e1';
                          return (
                            <div key={si} className="flex-1 h-1 rounded-full overflow-hidden bg-slate-100" title={s.label}>
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.val != null ? (s.inv ? 100 - s.val : s.val) : 0}%`, backgroundColor: c }} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ─── CENTER: Editor ─── */}
          <div className={`flex flex-col min-h-0 ${mobileEssayView === 'list' ? 'hidden lg:flex' : ''}`}>
            {activeEssay ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Editor header */}
                <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm lg:text-base font-bold font-display text-primary truncate">{activeEssay.title}</h3>
                    {activeEssay.prompt && <p className="text-[10px] lg:text-xs text-slate-400 italic truncate mt-0.5">&ldquo;{activeEssay.prompt}&rdquo;</p>}
                  </div>
                  <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0 ml-3 lg:ml-4">
                    {saving && <span className="text-[10px] text-accent animate-pulse font-medium">Saving...</span>}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 lg:px-2.5 py-1">
                      <span className="text-[11px] lg:text-xs font-bold text-primary">{wordCount}</span>
                      <span className="text-[10px] text-slate-400">w</span>
                    </div>
                    <div className="hidden sm:flex gap-1">
                      {[500, 650, 700].map(t => (
                        <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${wordCount >= t ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{t}</span>
                      ))}
                    </div>
                    <button
                      onClick={() => { setShowGrammar(prev => !prev); if (!showGrammar) { setShowSentenceAnalysis(false); tracker.feature('essays', 'grammar_check', { wordCount }); } }}
                      disabled={wordCount < 4}
                      title="Grammar check: errors first, then stylistic optimizations"
                      className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${showGrammar ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                      Grammar
                      {showGrammar && grammarIssues.length > 0 && (
                        <span className="ml-0.5 text-[10px] font-bold bg-white/25 rounded-full px-1.5 py-0.5">{grammarIssues.length}</span>
                      )}
                    </button>
                    <button
                      onClick={() => { setShowSentenceAnalysis(prev => !prev); if (!showSentenceAnalysis) { setShowGrammar(false); tracker.feature('essays', 'sentence_analysis', { wordCount }); } }}
                      disabled={wordCount < 10}
                      title="Sentence Analysis: highlights internalized (thoughts/feelings) vs externalized (actions/events) sentences"
                      className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${showSentenceAnalysis ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md shadow-purple-200' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                      {showSentenceAnalysis ? 'Analysis On' : 'Analyze'}
                    </button>
                    <button onClick={markComplete} disabled={wordCount < 50} className="hidden sm:block px-3 py-1.5 text-xs font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Mark Complete</button>
                    {activeEssay && !essayReviews[activeEssay.id] ? (
                      <button onClick={() => setShowReviewModal(true)} disabled={wordCount < 50} className="hidden sm:block px-3 py-1.5 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Submit for Review</button>
                    ) : activeEssay && essayReviews[activeEssay.id] ? (
                      <span className={`hidden sm:block px-3 py-1.5 text-[10px] font-bold rounded-lg ${
                        essayReviews[activeEssay.id].status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        essayReviews[activeEssay.id].status === 'in_review' ? 'bg-blue-100 text-blue-700' :
                        essayReviews[activeEssay.id].status === 'returned' ? 'bg-purple-100 text-purple-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {essayReviews[activeEssay.id].status === 'completed' ? 'Review Complete' :
                         essayReviews[activeEssay.id].status === 'in_review' ? 'Under Review' :
                         essayReviews[activeEssay.id].status === 'returned' ? 'Returned' :
                         'Pending Review'}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Mobile tab bar: Write / Scores */}
                <div className="lg:hidden flex border-b border-slate-100 flex-shrink-0">
                  <button
                    onClick={() => setMobileEditorTab('write')}
                    className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-all ${mobileEditorTab === 'write' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Write
                    </span>
                  </button>
                  <button
                    onClick={() => setMobileEditorTab('scores')}
                    className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-all relative ${mobileEditorTab === 'scores' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      Live Scores
                      {activeEssay.overallScore != null && (
                        <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeEssay.overallScore >= 70 ? 'bg-emerald-100 text-emerald-700' : activeEssay.overallScore >= 45 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          {activeEssay.overallScore}%
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    onClick={() => { setShowSentenceAnalysis(prev => !prev); setMobileEditorTab('write'); }}
                    disabled={wordCount < 10}
                    className={`px-4 py-2.5 text-xs font-semibold transition-all ${showSentenceAnalysis ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                      Analyze
                    </span>
                  </button>
                </div>

                {/* Textarea with optional sentence analysis overlay */}
                <div className={`flex-1 min-h-0 flex flex-col relative ${mobileEditorTab === 'scores' ? 'hidden lg:flex' : ''}`}>
                  {/* Grammar overlay */}
                  {showGrammar && editContent.trim().length > 0 ? (
                    <GrammarEditor
                      content={editContent}
                      issues={grammarIssues}
                      activeIssueId={activeIssueId}
                      onSelectIssue={setActiveIssueId}
                      onAccept={acceptGrammarFix}
                      onDismiss={dismissGrammarIssue}
                      onClose={() => setShowGrammar(false)}
                      errorCount={grammarErrorCount}
                      optCount={grammarOptCount}
                    />
                  ) : showSentenceAnalysis && sentenceAnalysis && editContent.trim().length > 0 ? (
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div
                        ref={editorScrollRef}
                        className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-6 py-4 lg:py-5 text-[14px] lg:text-[15px] leading-[1.8] font-sans"
                        onClick={() => {
                          setShowSentenceAnalysis(false);
                          setTimeout(() => textareaRef.current?.focus(), 50);
                        }}
                      >
                        <div className="whitespace-pre-wrap break-words cursor-text">
                          {sentenceAnalysis.sentences.map((s, i) => (
                            <span
                              key={i}
                              className={`${
                                s.type === 'internalized'
                                  ? 'bg-blue-100/70 text-blue-900 rounded-sm'
                                  : s.type === 'externalized'
                                  ? 'bg-amber-100/70 text-amber-900 rounded-sm'
                                  : 'text-slate-700'
                              } ${s.isPassive ? 'underline decoration-red-400 decoration-wavy decoration-2 underline-offset-4' : ''}`}
                              title={
                                `${s.type === 'internalized' ? 'Internalized: thoughts, feelings, reflection' : s.type === 'externalized' ? 'Externalized: actions, events, experiences' : 'Neutral'}${s.isPassive ? ' | Passive voice detected' : ''}`
                              }
                            >
                              {s.text}
                            </span>
                          )).reduce<React.ReactNode[]>((acc, el, i) => {
                            if (i > 0) acc.push(' ');
                            acc.push(el);
                            return acc;
                          }, [])}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-3 italic">Click anywhere to return to editing</p>
                      </div>

                      {/* ─── Sentence Analysis Legend & Stats ─── */}
                      <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 lg:px-6 py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-y-2">
                          {/* Legend */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block w-3 h-3 rounded-sm bg-blue-100 border border-blue-200" />
                              <span className="text-[10px] font-semibold text-blue-800">Internalized</span>
                              <span className="text-[9px] text-slate-400">(thoughts, feelings, reflection)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />
                              <span className="text-[10px] font-semibold text-amber-800">Externalized</span>
                              <span className="text-[9px] text-slate-400">(actions, events, experiences)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block w-8 border-b-2 border-wavy border-red-400" style={{ textDecorationStyle: 'wavy' }} />
                              <span className="text-[10px] font-semibold text-red-600">Passive Voice</span>
                              <span className="text-[9px] text-slate-400">(wavy underline)</span>
                            </div>
                          </div>

                          {/* Stats counters */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-md border border-blue-100">
                              <span className="text-[10px] font-bold text-blue-700">{sentenceAnalysis.stats.internalized}</span>
                              <span className="text-[9px] text-blue-500">int</span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-md border border-amber-100">
                              <span className="text-[10px] font-bold text-amber-700">{sentenceAnalysis.stats.externalized}</span>
                              <span className="text-[9px] text-amber-500">ext</span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-md border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-600">{sentenceAnalysis.stats.neutral}</span>
                              <span className="text-[9px] text-slate-400">neutral</span>
                            </div>
                            {sentenceAnalysis.stats.passive > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-md border border-red-100">
                                <span className="text-[10px] font-bold text-red-600">{sentenceAnalysis.stats.passive}</span>
                                <span className="text-[9px] text-red-400">passive</span>
                              </div>
                            )}
                            {/* Balance indicator */}
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-200" title={`Balance: ${Math.round(sentenceAnalysis.stats.balanceRatio * 100)}% internalized vs ${Math.round((1 - sentenceAnalysis.stats.balanceRatio) * 100)}% externalized`}>
                              <div className="w-16 h-1.5 rounded-full overflow-hidden bg-amber-100 flex">
                                <div className="h-full bg-blue-400 rounded-full transition-all duration-500" style={{ width: `${sentenceAnalysis.stats.balanceRatio * 100}%` }} />
                              </div>
                              <span className="text-[9px] font-semibold text-slate-500">
                                {sentenceAnalysis.stats.balanceRatio >= 0.4 && sentenceAnalysis.stats.balanceRatio <= 0.6
                                  ? 'Balanced'
                                  : sentenceAnalysis.stats.balanceRatio > 0.6
                                  ? 'More reflective'
                                  : 'More action-focused'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      ref={textareaRef}
                      value={editContent}
                      onChange={e => handleContentChange(e.target.value)}
                      placeholder="Start writing your essay here...&#10;&#10;Your writing will be analyzed in real-time as you type. Tap &quot;Live Scores&quot; above to see your scores, tips, and suggestions."
                      className="flex-1 min-h-0 w-full px-4 lg:px-6 py-4 lg:py-5 text-[14px] lg:text-[15px] leading-[1.8] focus:outline-none resize-none font-sans text-slate-800 placeholder:text-slate-300"
                    />
                  )}
                </div>

                {/* Mobile Scores Panel — shown only on mobile when scores tab is active */}
                <div className={`flex-1 min-h-0 overflow-y-auto ${mobileEditorTab === 'write' ? 'hidden' : 'lg:hidden'}`}>
                  <div className="p-4 space-y-3">
                    {/* Mobile Mark Complete button */}
                    <div className="flex items-center justify-between sm:hidden">
                      <div className="flex gap-1">
                        {[500, 650, 700].map(t => (
                          <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${wordCount >= t ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{t}</span>
                        ))}
                      </div>
                      <button onClick={markComplete} disabled={wordCount < 50} className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Mark Complete</button>
                    </div>

                    {/* Prompt type indicator */}
                    {promptAnalysis && (
                      <div className="bg-gradient-to-r from-accent/5 to-purple-50 rounded-xl border border-accent/10 px-4 py-3">
                        <p className="text-[10px] font-bold text-accent uppercase tracking-wider">Prompt detected</p>
                        <p className="text-xs font-semibold text-primary mt-0.5">{promptAnalysis.label}</p>
                        <p className="text-[10px] text-slate-500 mt-1">AOs look for: {promptAnalysis.aoLookingFor}</p>
                      </div>
                    )}

                    {/* Score cards */}
                    <div className="bg-white rounded-xl border border-slate-100 p-4">
                      <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider mb-3">Live Scores</h4>
                      <div className="space-y-2.5">
                        <ScoreBar label="Voice & Authenticity" value={activeEssay.aiScore} color="#3b82f6" invert
                          sublabel={activeEssay.aiScore != null ? (activeEssay.aiScore <= 15 ? 'Genuine, personal voice' : activeEssay.aiScore <= 35 ? 'Mostly authentic' : 'Sounds formulaic') : ''} />
                        <ScoreBar label="Language & Precision" value={activeEssay.vocabScore} color="#8b5cf6"
                          sublabel={activeEssay.vocabScore != null ? (activeEssay.vocabScore >= 70 ? 'Sophisticated word choice' : activeEssay.vocabScore >= 45 ? 'Adequate vocabulary' : 'Too basic') : ''} />
                        <ScoreBar label="Structure & Coherence" value={activeEssay.grammarScore} color="#6366f1"
                          sublabel={activeEssay.grammarScore != null ? (activeEssay.grammarScore >= 70 ? 'Well-organized flow' : activeEssay.grammarScore >= 45 ? 'Some drift detected' : 'Topic drift or grammar issues') : ''} />
                        <ScoreBar label="Storytelling" value={activeEssay.originalityScore} color="#ec4899"
                          sublabel={activeEssay.originalityScore != null ? (activeEssay.originalityScore >= 70 ? 'Vivid, show-don\'t-tell' : activeEssay.originalityScore >= 45 ? 'More details needed' : 'Too abstract, needs scenes') : ''} />
                        <ScoreBar label="Admissions Impact" value={activeEssay.overallScore} color="#10b981"
                          sublabel={activeEssay.overallScore != null ? (activeEssay.overallScore >= 70 ? 'Compelling read' : activeEssay.overallScore >= 45 ? 'Good with room to improve' : 'Needs significant revision') : ''} />
                      </div>
                    </div>

                    {/* Live Writing Tips */}
                    {liveTips.length > 0 && (
                      <div className="bg-white rounded-xl border border-amber-200 p-4">
                        <h4 className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-2">Writing Coach</h4>
                        <div className="space-y-2">
                          {liveTips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                              <p className="text-[11px] text-slate-600 leading-relaxed">{tip}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* EC Insights */}
                    {!ecsLoading && ecs.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <div className="flex items-center gap-1.5 mb-3">
                          <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                          <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">Activity Insights</h4>
                        </div>

                        {/* Referenced ECs */}
                        {mentionedECs.length > 0 && (
                          <div className="mb-3">
                            <p className="text-[9px] font-semibold text-green-600 uppercase tracking-wider mb-1.5">Referenced</p>
                            {mentionedECs.map(ins => (
                              <div key={ins.ec.id} className="mb-2">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                  <span className="text-[10px] font-bold text-green-800">{ins.ec.name}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 leading-relaxed ml-3">{ins.suggestion}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Suggested ECs */}
                        {suggestedECs.length > 0 && (
                          <div>
                            <p className="text-[9px] font-semibold text-indigo-600 uppercase tracking-wider mb-1.5">
                              {promptAnalysis ? `Best for "${promptAnalysis.label}"` : 'Recommended'}
                            </p>
                            {suggestedECs.map(ins => (
                              <div key={ins.ec.id} className="mb-3 p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-[10px] font-bold text-indigo-700">{ins.ec.name}</span>
                                  <span className="text-[9px] text-indigo-500">{ins.ec.role}</span>
                                </div>
                                <p className="text-[10px] text-slate-600 leading-relaxed">{ins.suggestion}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {mentionedECs.length === 0 && suggestedECs.length === 0 && editContent.length > 50 && (
                          <p className="text-[10px] text-slate-400">
                            {promptAnalysis
                              ? `None of your activities strongly match this ${promptAnalysis.label.toLowerCase()} prompt. Consider if any EC has an unexpected connection.`
                              : 'Add a prompt to get activity-based suggestions.'}
                          </p>
                        )}
                      </div>
                    )}

                    {!ecsLoading && ecs.length === 0 && (
                      <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <p className="text-[10px] text-slate-500">
                          Add activities in your <a href="/dashboard/profile" className="text-accent font-semibold underline underline-offset-2">Profile</a> to get live essay suggestions based on your extracurriculars.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-10 text-center flex-1 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-primary">Select an Essay</h3>
                <p className="text-sm text-slate-400 mt-1.5 max-w-xs">Choose an essay from the left panel or create a new one to start writing with real-time feedback.</p>
              </div>
            )}
          </div>

          {/* ─── RIGHT: Live Sidebar ─── */}
          <div className="hidden lg:block overflow-y-auto space-y-3 pl-1">
            {activeEssay && (
              <>
                {/* Prompt type indicator */}
                {promptAnalysis && (
                  <div className="bg-gradient-to-r from-accent/5 to-purple-50 rounded-xl border border-accent/10 px-4 py-3">
                    <p className="text-[10px] font-bold text-accent uppercase tracking-wider">Prompt detected</p>
                    <p className="text-xs font-semibold text-primary mt-0.5">{promptAnalysis.label}</p>
                    <p className="text-[10px] text-slate-500 mt-1">AOs look for: {promptAnalysis.aoLookingFor}</p>
                  </div>
                )}

                {/* Score cards (compact) */}
                <div className="bg-white rounded-xl border border-slate-100 p-4">
                  <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider mb-3">Live Scores</h4>
                  <div className="space-y-2.5">
                    <ScoreBar label="Voice & Authenticity" value={activeEssay.aiScore} color="#3b82f6" invert
                      sublabel={activeEssay.aiScore != null ? (activeEssay.aiScore <= 15 ? 'Genuine, personal voice' : activeEssay.aiScore <= 35 ? 'Mostly authentic' : 'Sounds formulaic') : ''} />
                    <ScoreBar label="Language & Precision" value={activeEssay.vocabScore} color="#8b5cf6"
                      sublabel={activeEssay.vocabScore != null ? (activeEssay.vocabScore >= 70 ? 'Sophisticated word choice' : activeEssay.vocabScore >= 45 ? 'Adequate vocabulary' : 'Too basic') : ''} />
                    <ScoreBar label="Structure & Coherence" value={activeEssay.grammarScore} color="#6366f1"
                      sublabel={activeEssay.grammarScore != null ? (activeEssay.grammarScore >= 70 ? 'Well-organized flow' : activeEssay.grammarScore >= 45 ? 'Some drift detected' : 'Topic drift or grammar issues') : ''} />
                    <ScoreBar label="Storytelling" value={activeEssay.originalityScore} color="#ec4899"
                      sublabel={activeEssay.originalityScore != null ? (activeEssay.originalityScore >= 70 ? 'Vivid, show-don\'t-tell' : activeEssay.originalityScore >= 45 ? 'More details needed' : 'Too abstract, needs scenes') : ''} />
                    <ScoreBar label="Admissions Impact" value={activeEssay.overallScore} color="#10b981"
                      sublabel={activeEssay.overallScore != null ? (activeEssay.overallScore >= 70 ? 'Compelling read' : activeEssay.overallScore >= 45 ? 'Good with room to improve' : 'Needs significant revision') : ''} />
                  </div>
                </div>

                {/* Tutor Review Feedback */}
                {activeEssay && essayReviews[activeEssay.id] && essayReviews[activeEssay.id].status === 'completed' && (
                  <div className="bg-white rounded-xl border border-emerald-200 p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <h4 className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Tutor Feedback</h4>
                    </div>
                    {essayReviews[activeEssay.id].tutorFeedback && (
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">{essayReviews[activeEssay.id].tutorFeedback}</p>
                    )}
                    {essayReviews[activeEssay.id].scores && Object.keys(essayReviews[activeEssay.id].scores).length > 0 && (
                      <div className="space-y-1.5">
                        {[
                          { key: 'structure', label: 'Structure' },
                          { key: 'voice', label: 'Voice' },
                          { key: 'argument', label: 'Argument' },
                          { key: 'grammar', label: 'Grammar' },
                          { key: 'impact', label: 'Impact' },
                        ].map(function(dim) {
                          var val = essayReviews[activeEssay.id].scores[dim.key];
                          if (val == null) return null;
                          return (
                            <div key={dim.key} className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 w-16">{dim.label}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                                <div className="h-full rounded-full transition-all" style={{ width: (val * 10) + '%', backgroundColor: val >= 8 ? '#10b981' : val >= 5 ? '#f59e0b' : '#ef4444' }} />
                              </div>
                              <span className="text-[10px] font-bold text-primary w-4 text-right">{val}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {essayReviews[activeEssay.id].annotations && essayReviews[activeEssay.id].annotations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">{essayReviews[activeEssay.id].annotations.length} Annotation{essayReviews[activeEssay.id].annotations.length !== 1 ? 's' : ''}</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {essayReviews[activeEssay.id].annotations.map(function(ann: any) {
                            var colors: Record<string, string> = { strength: 'bg-emerald-100 text-emerald-700', suggestion: 'bg-blue-100 text-blue-700', issue: 'bg-rose-100 text-rose-700', question: 'bg-amber-100 text-amber-700' };
                            return (
                              <div key={ann.id} className="p-2 rounded-lg bg-slate-50">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className={'px-1.5 py-0.5 rounded text-[9px] font-bold ' + (colors[ann.type] || 'bg-slate-100 text-slate-500')}>{ann.type}</span>
                                  <span className="text-[9px] text-slate-400">P{(ann.paragraphIndex || 0) + 1}</span>
                                </div>
                                <p className="text-[10px] text-slate-600">{ann.comment}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeEssay && essayReviews[activeEssay.id] && essayReviews[activeEssay.id].status === 'returned' && (
                  <div className="bg-white rounded-xl border border-purple-200 p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                      <h4 className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Returned for Revision</h4>
                    </div>
                    {essayReviews[activeEssay.id].tutorFeedback && (
                      <p className="text-xs text-slate-600 leading-relaxed">{essayReviews[activeEssay.id].tutorFeedback}</p>
                    )}
                    <button
                      onClick={() => {
                        setEssayReviews(function(prev) { var next = Object.assign({}, prev); delete next[activeEssay.id]; return next; });
                      }}
                      className="mt-2 px-3 py-1.5 text-xs font-semibold text-accent bg-accent/10 rounded-lg hover:bg-accent/20 transition-colors"
                    >
                      Resubmit for Review
                    </button>
                  </div>
                )}

                {/* Live Writing Tips */}
                {liveTips.length > 0 && (
                  <div className="bg-white rounded-xl border border-amber-200 p-4">
                    <h4 className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-2">Writing Coach</h4>
                    <div className="space-y-2">
                      {liveTips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                          <p className="text-[11px] text-slate-600 leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* EC Insights */}
                {!ecsLoading && ecs.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                      <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">Activity Insights</h4>
                    </div>

                    {/* Referenced ECs */}
                    {mentionedECs.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[9px] font-semibold text-green-600 uppercase tracking-wider mb-1.5">Referenced</p>
                        {mentionedECs.map(ins => (
                          <div key={ins.ec.id} className="mb-2">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              <span className="text-[10px] font-bold text-green-800">{ins.ec.name}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed ml-3">{ins.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggested ECs */}
                    {suggestedECs.length > 0 && (
                      <div>
                        <p className="text-[9px] font-semibold text-indigo-600 uppercase tracking-wider mb-1.5">
                          {promptAnalysis ? `Best for "${promptAnalysis.label}"` : 'Recommended'}
                        </p>
                        {suggestedECs.map(ins => (
                          <div key={ins.ec.id} className="mb-3 p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-bold text-indigo-700">{ins.ec.name}</span>
                              <span className="text-[9px] text-indigo-500">{ins.ec.role}</span>
                            </div>
                            <p className="text-[10px] text-slate-600 leading-relaxed">{ins.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {mentionedECs.length === 0 && suggestedECs.length === 0 && editContent.length > 50 && (
                      <p className="text-[10px] text-slate-400">
                        {promptAnalysis
                          ? `None of your activities strongly match this ${promptAnalysis.label.toLowerCase()} prompt. Consider if any EC has an unexpected connection.`
                          : 'Add a prompt to get activity-based suggestions.'}
                      </p>
                    )}
                  </div>
                )}

                {!ecsLoading && ecs.length === 0 && (
                  <div className="bg-white rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] text-slate-500">
                      Add activities in your <a href="/dashboard/profile" className="text-accent font-semibold underline underline-offset-2">Profile</a> to get live essay suggestions based on your extracurriculars.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>}
      </div>
      {/* Submit for Review Modal */}
      {showReviewModal && activeEssay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowReviewModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold font-display text-primary mb-1">Submit for Tutor Review</h2>
            <p className="text-sm text-slate-500 mb-4">Your tutor will review &ldquo;{activeEssay.title}&rdquo; and provide detailed feedback.</p>
            <div className="mb-4">
              <label className="block mb-1.5 text-sm font-semibold text-primary">Note for your tutor (optional)</label>
              <textarea
                value={reviewNote}
                onChange={function(e) { setReviewNote(e.target.value); }}
                placeholder="Any specific areas you'd like feedback on?"
                rows={3}
                className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReviewModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
              <button onClick={submitForReview} disabled={submittingReview} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-60 transition-colors">{submittingReview ? 'Submitting...' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
