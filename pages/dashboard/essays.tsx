import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';

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
   SCORE BAR COMPONENT (compact for sidebar)
   ══════════════════════════════════════════════════════════════════════ */

function ScoreBar({ label, value, color, sublabel, invert }: {
  label: string; value: number | null; color: string; sublabel: string; invert?: boolean;
}) {
  const pct = value != null ? (invert ? 100 - value : value) : 0;
  let barColor = color;
  if (value != null) {
    if (invert) barColor = value <= 20 ? '#10b981' : value <= 45 ? '#f59e0b' : '#ef4444';
    else barColor = value >= 70 ? '#10b981' : value >= 45 ? '#f59e0b' : '#ef4444';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        <span className="text-[11px] font-bold" style={{ color: barColor }}>
          {value != null ? (invert ? `${value}%` : `${value}`) : '\u2014'}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
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
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ecs, setEcs] = useState<Extracurricular[]>([]);
  const [ecsLoading, setEcsLoading] = useState(true);

  // Load essays + ECs
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/essays').then(r => r.json()).then(d => { setEssays(d.essays || []); setLoading(false); }).catch(() => setLoading(false));
    fetch('/api/profile').then(r => r.json()).then(d => { if (d.profile?.extracurriculars) setEcs(d.profile.extracurriculars as Extracurricular[]); setEcsLoading(false); }).catch(() => setEcsLoading(false));
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

  const openEssay = (essay: Essay) => { setActiveEssay(essay); setEditContent(essay.content || ''); };

  const deleteEssay = async (id: string) => {
    try { await fetch('/api/essays', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); setEssays(prev => prev.filter(e => e.id !== id)); if (activeEssay?.id === id) { setActiveEssay(null); setEditContent(''); } } catch (e) {}
  };

  const markComplete = async () => {
    if (!activeEssay) return;
    setSaving(true);
    try { const res = await fetch('/api/essays', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: activeEssay.id, status: 'Complete' }) }); const data = await res.json(); if (data.essay) { setActiveEssay(data.essay); setEssays(prev => prev.map(e => e.id === data.essay.id ? data.essay : e)); } } catch (e) {}
    setSaving(false);
  };

  if (status !== 'authenticated') return null;

  const wordCount = editContent.trim() ? editContent.trim().split(/\s+/).length : 0;
  const mentionedECs = ecInsights.filter(i => i.mentioned);
  const suggestedECs = ecInsights.filter(i => !i.mentioned && i.relevanceScore >= 1.5).slice(0, 3);

  return (
    <DashboardLayout>
      <Head><title>Essays | AdmitsOnly Dashboard</title></Head>

      <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Essay Workspace</h1>
            <p className="mt-0.5 text-sm text-slate-500">Write, analyze, and get real-time admissions-grade feedback.</p>
          </div>
          <button onClick={() => setShowNewForm(true)} className="btn-primary text-sm">+ New Essay</button>
        </div>

        {/* New Essay Form */}
        {showNewForm && (
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
        <div className="flex-1 min-h-0 grid lg:grid-cols-[220px_1fr_320px] gap-4">

          {/* ─── LEFT: Essay List ─── */}
          <div className="overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="text-center py-8"><div className="animate-pulse text-sm text-slate-400">Loading...</div></div>
            ) : essays.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-xs text-slate-400">No essays yet</p>
              </div>
            ) : (
              essays.map(essay => (
                <div
                  key={essay.id}
                  onClick={() => openEssay(essay)}
                  className={`p-3 rounded-xl border cursor-pointer group transition-all ${
                    activeEssay?.id === essay.id ? 'bg-accent/5 border-accent/30 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="text-xs font-bold text-primary truncate flex-1">{essay.title}</h3>
                    <button onClick={e => { e.stopPropagation(); deleteEssay(essay.id); }} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${statusColors[essay.status] || statusColors['Draft']}`}>{essay.status}</span>
                    {essay.overallScore != null && <span className="text-[9px] font-bold text-accent">{essay.overallScore}%</span>}
                    <span className="text-[9px] text-slate-400">{essay.content ? `${essay.content.trim().split(/\s+/).length}w` : '0w'}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ─── CENTER: Editor ─── */}
          <div className="flex flex-col min-h-0">
            {activeEssay ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col flex-1 min-h-0">
                {/* Editor header */}
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold font-display text-primary truncate">{activeEssay.title}</h3>
                    {activeEssay.prompt && <p className="text-[11px] text-slate-400 italic truncate mt-0.5">&ldquo;{activeEssay.prompt}&rdquo;</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {saving && <span className="text-[10px] text-slate-400 animate-pulse">Saving...</span>}
                    <span className="text-[10px] text-slate-400">{wordCount}w</span>
                    <div className="flex gap-0.5">
                      {[500, 650, 700].map(t => (
                        <span key={t} className={`text-[8px] px-1 py-0.5 rounded ${wordCount >= t ? 'bg-green-100 text-green-700' : 'bg-slate-50 text-slate-400'}`}>{t}</span>
                      ))}
                    </div>
                    <button onClick={markComplete} disabled={wordCount < 50} className="px-2.5 py-1 text-[10px] font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed">Done</button>
                  </div>
                </div>

                {/* Textarea — fills remaining height */}
                <textarea
                  value={editContent}
                  onChange={e => handleContentChange(e.target.value)}
                  placeholder="Start writing your essay here... Your writing will be analyzed in real-time as you type."
                  className="flex-1 min-h-0 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none font-sans"
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center flex-1 flex flex-col items-center justify-center">
                <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                <h3 className="text-base font-bold text-primary">Select an Essay</h3>
                <p className="text-xs text-slate-400 mt-1">Choose an essay or create a new one to start writing.</p>
              </div>
            )}
          </div>

          {/* ─── RIGHT: Live Sidebar ─── */}
          <div className="overflow-y-auto space-y-3 pl-1">
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
        </div>
      </div>
    </DashboardLayout>
  );
}
