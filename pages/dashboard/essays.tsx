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

/* ─── Step 3: Generate Candidate Motifs ─── */

const MOTIF_NAME_BANK: Record<string, string[]> = {
  translation: ['The Translator', 'Between Two Worlds', 'Lost & Found in Translation', 'The Interpreter'],
  calibration: ['The Calibrator', 'Finding the Frequency', 'Tuning the Instrument', 'Precision & Grace'],
  repair: ['The Restorer', 'Mending What\'s Broken', 'Kintsugi', 'The Art of Repair'],
  threshold: ['At the Threshold', 'The In-Between', 'Crossing Over', 'Standing at the Door'],
  mapping: ['The Cartographer', 'Uncharted Territory', 'Drawing the Map', 'Finding the Way'],
  signal_noise: ['Signal Through Noise', 'Cutting Through', 'The Filter', 'Finding Clarity'],
  attention: ['The Observer', 'Paying Attention', 'Seeing What Others Miss', 'The Quiet Eye'],
  building_systems: ['The Architect', 'Building From Scratch', 'The Blueprint', 'Systems & Structures'],
  navigating_uncertainty: ['Into the Fog', 'Navigating Blind', 'The Uncertain Path', 'Embracing the Unknown'],
  balancing_contradictions: ['Both/And', 'The Paradox', 'Holding Contradictions', 'Two Truths'],
  resilience: ['Rising Phoenix', 'Against the Tide', 'Unbroken', 'Through the Storm'],
  leadership: ['The Catalyst', 'Quiet Authority', 'The Architect', 'Ripple Maker'],
  creativity: ['The Maker', 'Blank Canvas', 'Uncharted', 'Spark & Wire'],
  growth: ['Metamorphosis', 'New Lens', 'The Turning Point', 'Unfolding'],
  community: ['Common Ground', 'The Village', 'Woven Together', 'Shared Roots'],
  identity: ['True North', 'Roots & Wings', 'The Mosaic', 'Mirror & Window'],
  passion: ['The Fire Within', 'Magnetic Pull', 'Heart & Soul', 'The Calling'],
  intellectual: ['The Question', 'Deeper Dive', 'Mind Palace', 'The Puzzle'],
  empathy: ['Walking Alongside', 'Through Their Eyes', 'The Bridge', 'Tender Strength'],
  ambition: ['The Summit', 'Charting the Course', 'Beyond the Horizon', 'The Vision'],
};

const COMBO_MOTIF_NAMES: Record<string, string> = {
  'resilience+growth': 'The Phoenix Arc',
  'identity+community': 'Roots & Branches',
  'passion+creativity': 'The Maker\'s Fire',
  'empathy+leadership': 'The Servant Leader',
  'intellectual+ambition': 'The Driven Mind',
  'resilience+leadership': 'Forged in Fire',
  'identity+growth': 'Becoming',
  'community+empathy': 'The Ripple Effect',
  'passion+ambition': 'The Pursuit',
  'creativity+intellectual': 'The Innovator',
  'resilience+identity': 'Unshakable Core',
  'growth+leadership': 'The Evolving Leader',
  'creativity+community': 'Art as Impact',
  'empathy+growth': 'The Widening Lens',
  'passion+community': 'Passion in Service',
  'translation+identity': 'The Bridge Builder',
  'calibration+excellence': 'The Precision Artist',
  'repair+resilience': 'Kintsugi — Beauty in Breaking',
  'threshold+growth': 'Standing at the Door',
  'mapping+intellectual': 'The Explorer\'s Mind',
  'attention+empathy': 'The Quiet Witness',
  'navigating_uncertainty+resilience': 'Sailing Without a Map',
  'balancing_contradictions+identity': 'The Both/And Self',
};

/* ─── Motif Grouping with deeper clustering ─── */

function groupMotifs(bullets: MotifBullet[], connections: MotifConnection[]): { motifs: MotifGroup[]; orphanIds: string[] } {
  const assigned = new Set<string>();
  const motifs: MotifGroup[] = [];

  // Build weighted adjacency
  const adj: Record<string, { id: string; strength: number; label: string }[]> = {};
  for (const b of bullets) adj[b.id] = [];

  // Use lower threshold to catch more connections
  for (const c of connections) {
    if (c.strength >= 0.3) {
      adj[c.fromId]?.push({ id: c.toId, strength: c.strength, label: c.label });
      adj[c.toId]?.push({ id: c.fromId, strength: c.strength, label: c.label });
    }
  }

  // Sort bullets by total connection weight (not just count)
  const bulletsByWeight = bullets
    .map(b => ({
      bullet: b,
      totalWeight: (adj[b.id] || []).reduce((sum, n) => sum + n.strength, 0),
      connCount: (adj[b.id] || []).length,
    }))
    .sort((a, b) => b.totalWeight - a.totalWeight);

  let motifIdx = 0;

  for (const { bullet } of bulletsByWeight) {
    if (assigned.has(bullet.id)) continue;
    if ((adj[bullet.id]?.length || 0) === 0) continue;

    // BFS with lower threshold
    const cluster: string[] = [bullet.id];
    assigned.add(bullet.id);
    const queue = [bullet.id];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const neighbor of adj[curr] || []) {
        if (!assigned.has(neighbor.id) && neighbor.strength >= 0.3) {
          assigned.add(neighbor.id);
          cluster.push(neighbor.id);
          queue.push(neighbor.id);
        }
      }
    }

    if (cluster.length < 2) {
      assigned.delete(bullet.id);
      continue;
    }

    const clusterBullets = cluster.map(cid => bullets.find(x => x.id === cid)!).filter(Boolean);
    const clusterConns = connections.filter(c => cluster.includes(c.fromId) && cluster.includes(c.toId));

    // Determine dominant themes + values
    const themeCount: Record<string, number> = {};
    const valueCount: Record<string, number> = {};
    for (const b of clusterBullets) {
      for (const t of b.themes) themeCount[t] = (themeCount[t] || 0) + 1;
      for (const v of b.analysis.values) valueCount[v] = (valueCount[v] || 0) + 1;
    }
    const sortedThemes = Object.entries(themeCount).sort((a, b) => b[1] - a[1]).map(([t]) => t);
    const top2 = sortedThemes.slice(0, 2);

    // Name the motif (prefer specific names over generic)
    let name = 'Thread ' + (motifIdx + 1);
    if (top2.length >= 2) {
      const key = [top2[0], top2[1]].sort().join('+');
      name = COMBO_MOTIF_NAMES[key] || MOTIF_NAME_BANK[top2[0]]?.[motifIdx % 4] || name;
    } else if (top2.length === 1) {
      name = MOTIF_NAME_BANK[top2[0]]?.[motifIdx % 4] || name;
    }

    // Find the best bridge mechanism in this cluster
    const bestBridge = clusterConns.find(c => c.bridge)?.bridge;

    // Generate narrative
    const narrative = generateMotifNarrative(clusterBullets, top2, clusterConns);

    // Identify central tension
    const tensions = clusterBullets.flatMap(b => b.analysis.tensions);
    const tensionCount: Record<string, number> = {};
    for (const t of tensions) tensionCount[t] = (tensionCount[t] || 0) + 1;
    const topTension = Object.entries(tensionCount).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Suggested structure
    const structure = generateEssayStructure(clusterBullets, clusterConns, top2);

    // Flag weak/cliché connections
    const weakConnections: string[] = [];
    const clicheThemes = ['leadership', 'growth', 'passion', 'resilience', 'ambition'];
    if (top2.length > 0 && clicheThemes.includes(top2[0]) && !bestBridge) {
      weakConnections.push(`"${top2[0]}" is a common theme — make it specific. Instead of saying you showed ${top2[0]}, show a concrete moment that embodies it without naming it.`);
    }

    motifs.push({
      id: `motif_${motifIdx}`,
      name,
      narrative,
      bulletIds: cluster,
      dominantThemes: top2,
      colorIdx: motifIdx,
      centralTension: topTension,
      suggestedStructure: structure,
      weakConnections,
    });
    motifIdx++;
  }

  const orphanIds = bullets.filter(b => !assigned.has(b.id)).map(b => b.id);
  return { motifs, orphanIds };
}

/* ─── Step 5: Narrative Direction & Structure ─── */

function generateEssayStructure(bullets: MotifBullet[], connections: MotifConnection[], themes: string[]): string {
  const n = bullets.length;
  if (n === 0) return '';

  const hasBridge = connections.some(c => c.bridge);
  const hasContrast = connections.some(c => c.bridge?.type === 'contrast_resolution');
  const hasCauseEffect = connections.some(c => c.bridge?.type === 'cause_effect');
  const hasMetaphor = connections.some(c => c.bridge?.type === 'concrete_metaphor');

  if (hasMetaphor) {
    const metaphorConn = connections.find(c => c.bridge?.type === 'concrete_metaphor')!;
    return `Open with the concrete image — describe it in sensory detail. Return to this image throughout the essay, but each time it appears, it carries new meaning because of what you've revealed. End by showing how this image has transformed, just as you have.`;
  }

  if (hasContrast) {
    return `Act 1: Introduce one side of the tension — the experience that set up a particular worldview or expectation. Act 2: Show the contrasting experience that complicated or challenged that view. Don't rush the resolution. Act 3: Don't resolve the tension neatly — show how you hold both truths. The sophistication IS the essay.`;
  }

  if (hasCauseEffect) {
    return `Open in the middle of the second experience — the one that was shaped by the first. Let the reader wonder why you approach things this way. Then flash back to the formative experience. The "aha" moment isn't when you learned the lesson — it's when the reader connects the dots between the two experiences.`;
  }

  if (hasBridge) {
    const bestBridge = connections.find(c => c.bridge)!;
    return `Structure around the bridge: "${bestBridge.label}". Open with the most vivid scene. Each paragraph should deepen the reader's understanding of this connection. End with a forward-looking moment that shows how these experiences will continue to shape you.`;
  }

  return `Open with your most specific, visual moment. Each subsequent experience should build on the previous one like layers of paint on a canvas. End by stepping back to reveal the full picture — what these moments, taken together, reveal about who you are.`;
}

/* ─── Narrative Generation (much deeper) ─── */

function generateMotifNarrative(bullets: MotifBullet[], themes: string[], connections: MotifConnection[]): string {
  const n = bullets.length;
  const texts = bullets.map(b => `"${b.text.length > 60 ? b.text.slice(0, 57) + '...' : b.text}"`);
  if (n === 0) return '';

  // Find the strongest bridge mechanism
  const bridgeConn = connections.filter(c => c.bridge).sort((a, b) => b.strength - a.strength)[0];

  if (bridgeConn?.bridge) {
    const bridgeType = bridgeConn.bridge.type;

    if (bridgeType === 'contrast_resolution') {
      return `These experiences create a powerful contrast. Start inside ${texts[0]} — immerse the reader in that world. Then pivot to ${texts[n > 1 ? 1 : 0]}, which reveals a completely different side of you. The essay's power comes from showing how these seemingly contradictory experiences coexist in one person. Don't explain the connection — let the reader feel it.`;
    }
    if (bridgeType === 'cause_effect') {
      return `One experience directly shaped the other. Open mid-action in the later experience (${texts[n > 1 ? 1 : 0]}), showing the reader how you operate. Then rewind to ${texts[0]} to reveal what forged this approach. The "before" and "after" versions of you ARE the narrative arc.`;
    }
    if (bridgeType === 'shared_craft') {
      return `You bring the same mindset to completely different worlds — that's your superpower. Open with ${texts[0]}, showing your approach in action. Then jump to ${texts[n > 1 ? 1 : 0]}, and let the reader discover that the same instinct, the same way of thinking, drives you in a totally different context. This reveals depth of character that a single-topic essay can't match.`;
    }
    if (bridgeType === 'recurring_constraint') {
      return `The same challenge keeps finding you in different forms. Start with ${texts[0]} where you first encountered it. Then show it again in ${texts[n > 1 ? 1 : 0]}, but this time you recognize it. The essay isn't about overcoming the obstacle — it's about your evolving relationship with it.`;
    }
    if (bridgeType === 'concrete_metaphor') {
      return `You have a powerful recurring image connecting these experiences. Open with a vivid, sensory description of it in the context of ${texts[0]}. When it reappears in ${texts[n > 1 ? 1 : 0]}, it should carry new weight. This image IS your motif — let it do the narrative work so you don't have to state the theme directly.`;
    }
    if (bridgeType === 'evolving_question') {
      return `There's a fundamental question running through these experiences. In ${texts[0]}, the question first emerges. By ${texts[n > 1 ? 1 : 0]}, it has evolved but not resolved. The best essays don't answer their central question — they show how the student's relationship with the question has deepened.`;
    }
  }

  // Fallback: theme-based narrative (still good, just less specific)
  if (themes.length > 0) {
    const themeName = themes[0].replace(/_/g, ' ');
    return `The thread connecting these ideas is ${themeName}. Open with the most vivid, specific moment from ${texts[0]}. Each subsequent idea (${texts.slice(1).join(', ')}) becomes a new facet of the same core theme. The key: don't announce the theme — let the reader discover it through the accumulated weight of your details. Show, never tell.`;
  }

  return `These experiences connect in ways that aren't obvious at first — and that's what makes them powerful. Open with the most specific, visual moment. Let each idea build on the previous one, creating a layered narrative. The reader should finish thinking: "I know this person." The unexpected connections between your experiences are what make your essay uniquely yours.`;
}

/* ─── Full Analysis Pipeline ─── */

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

  // Step 2-4: Find connections using deep bridge mechanisms
  const connections = findMotifConnections(bullets);

  // Step 3 & 5: Group into motifs with narrative direction
  const { motifs, orphanIds } = groupMotifs(bullets, connections);

  return { bullets, connections, motifs, orphanIds, bridges: connections.filter(c => c.bridge) };
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

  // ─── Motifs state ───
  const [mode, setMode] = useState<'essays' | 'motifs'>('essays');
  const [motifInput, setMotifInput] = useState('');
  const [motifAnalysis, setMotifAnalysis] = useState<MotifAnalysis | null>(null);
  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [boardTitle, setBoardTitle] = useState('');
  const [savingBoard, setSavingBoard] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [motifView, setMotifView] = useState<'board' | 'narrative'>('board');

  // Load essays + ECs
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/essays').then(r => r.json()).then(d => { setEssays(d.essays || []); setLoading(false); }).catch(() => setLoading(false));
    fetch('/api/profile').then(r => r.json()).then(d => { if (d.profile?.extracurriculars) setEcs(d.profile.extracurriculars as Extracurricular[]); setEcsLoading(false); }).catch(() => setEcsLoading(false));
    fetch('/api/motifs').then(r => r.json()).then(d => setSavedBoards(d.boards || [])).catch(() => {});
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

  // ─── Motif actions ───
  const runMotifAnalysis = useCallback(() => {
    const lines = motifInput.split('\n').map(l => l.replace(/^[\s\-\u2022\*]+/, '').trim()).filter(l => l.length > 0);
    if (lines.length < 2) return;
    const result = analyzeMotifs(lines);
    setMotifAnalysis(result);
  }, [motifInput]);

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
    setMotifInput(bulletTexts.join('\n'));
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
      if (activeBoardId === id) { setActiveBoardId(null); setMotifAnalysis(null); setMotifInput(''); setBoardTitle(''); }
    } catch { /* ignore */ }
  }, [activeBoardId]);

  const newBoard = useCallback(() => {
    setActiveBoardId(null);
    setMotifAnalysis(null);
    setMotifInput('');
    setBoardTitle('');
  }, []);

  if (status !== 'authenticated') return null;

  const wordCount = editContent.trim() ? editContent.trim().split(/\s+/).length : 0;
  const mentionedECs = ecInsights.filter(i => i.mentioned);
  const suggestedECs = ecInsights.filter(i => !i.mentioned && i.relevanceScore >= 1.5).slice(0, 3);

  return (
    <DashboardLayout>
      <Head><title>Essays | AdmitsOnly Dashboard</title></Head>

      <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
        {/* Header with mode tabs */}
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div className="flex items-center gap-5">
            <div>
              <h1 className="text-2xl font-bold font-display text-primary tracking-tight">Essay Workspace</h1>
              <p className="mt-0.5 text-sm text-slate-400">{mode === 'essays' ? 'Write, analyze, and get real-time admissions-grade feedback.' : 'Discover hidden connections between your ideas and stitch them into compelling stories.'}</p>
            </div>
            <div className="flex bg-slate-100/80 rounded-xl p-1 gap-0.5 backdrop-blur-sm border border-slate-200/50">
              <button
                onClick={() => setMode('essays')}
                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'essays' ? 'bg-white text-accent shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-primary'}`}
              >
                My Essays
              </button>
              <button
                onClick={() => setMode('motifs')}
                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'motifs' ? 'bg-white text-accent shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-primary'}`}
              >
                Motifs
              </button>
            </div>
          </div>
          {mode === 'essays' && <button onClick={() => setShowNewForm(true)} className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-accent to-purple-600 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5">+ New Essay</button>}
        </div>

        {/* ═══════════════ MOTIFS MODE ═══════════════ */}
        {mode === 'motifs' && (
          <div className="flex-1 min-h-0 flex flex-col gap-5 overflow-y-auto">

            {/* ─── Top: Input Bar (full-width, compact) ─── */}
            <div className="flex-shrink-0">
              {!motifAnalysis ? (
                /* ── Full empty state ── */
                <div className="flex items-center justify-center py-12">
                  <div className="text-center max-w-2xl px-8">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent/10 to-purple-100 flex items-center justify-center mb-6">
                      <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold font-display text-primary mb-2">Motifs — Story Stitching</h3>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                      Your college essay doesn&apos;t have to be about one thing. Drop in your experiences, ideas, and moments below — and watch as Motifs discovers the hidden narrative threads that connect them into a multi-dimensional story.
                    </p>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-left shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your experiences & ideas</label>
                        {savedBoards.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">{savedBoards.length} saved board{savedBoards.length !== 1 ? 's' : ''}</span>
                            <select
                              onChange={e => { const board = savedBoards.find(b => b.id === e.target.value); if (board) loadBoard(board); }}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/30"
                              value=""
                            >
                              <option value="" disabled>Load board...</option>
                              {savedBoards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                      <textarea
                        value={motifInput}
                        onChange={e => setMotifInput(e.target.value)}
                        placeholder={"Write one idea per line. Be specific — the more detail, the better connections we can find:\n\n- The summer I spent cooking with my grandmother, learning her recipes from memory\n- Leading the debate team to nationals after we nearly lost our funding\n- When I failed my first AP Calculus exam and had to rethink how I study\n- Teaching coding workshops to kids at the public library every Saturday\n- My family's immigration story and how it shaped my relationship with language"}
                        rows={7}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none font-sans placeholder:text-slate-300"
                      />
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-[11px] text-slate-400">
                          {motifInput.split('\n').filter(l => l.trim().length > 0).length} ideas entered
                          {motifInput.split('\n').filter(l => l.trim().length > 0).length < 2 && ' — need at least 2'}
                        </p>
                        <button
                          onClick={runMotifAnalysis}
                          disabled={motifInput.split('\n').filter(l => l.trim().length > 0).length < 2}
                          className="px-8 py-3 text-sm font-bold text-white bg-gradient-to-r from-accent to-purple-600 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5"
                        >
                          Find Motifs
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-6 text-left">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <h4 className="text-xs font-bold text-primary mb-1">Deep Analysis</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">Analyzes each idea for hidden values, tensions, imagery, and shifts — not just surface keywords.</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center mb-2">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        </div>
                        <h4 className="text-xs font-bold text-primary mb-1">Creative Bridges</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">Discovers narrative bridges between seemingly unrelated experiences using contrast, metaphor, and craft.</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <h4 className="text-xs font-bold text-primary mb-1">Essay Architecture</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">Suggests essay structures with central tensions, narrative arcs, and specific writing advice.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Compact input bar when results showing ── */
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <textarea
                        value={motifInput}
                        onChange={e => setMotifInput(e.target.value)}
                        placeholder="Add or edit your ideas here, one per line..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={runMotifAnalysis}
                        disabled={motifInput.split('\n').filter(l => l.trim().length > 0).length < 2}
                        className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-accent to-purple-600 rounded-xl hover:opacity-90 transition-all disabled:opacity-40"
                      >
                        Re-analyze
                      </button>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={boardTitle}
                          onChange={e => setBoardTitle(e.target.value)}
                          placeholder="Board name..."
                          className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent/30 min-w-0"
                        />
                        <button onClick={saveMotifBoard} disabled={savingBoard} className="px-3 py-1.5 text-[11px] font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition-colors disabled:opacity-40 whitespace-nowrap">
                          {savingBoard ? '...' : activeBoardId ? 'Update' : 'Save'}
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        {activeBoardId && <button onClick={newBoard} className="text-[10px] text-slate-400 hover:text-accent font-medium">+ New</button>}
                        {savedBoards.length > 0 && (
                          <select
                            onChange={e => { const board = savedBoards.find(b => b.id === e.target.value); if (board) loadBoard(board); }}
                            className="text-[10px] border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 focus:outline-none min-w-0"
                            value={activeBoardId || ''}
                          >
                            <option value="" disabled>Load...</option>
                            {savedBoards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats + View toggle */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg">
                        <span className="text-[10px] text-slate-400">Ideas</span>
                        <span className="text-xs font-bold text-primary">{motifAnalysis.bullets.length}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/5 rounded-lg">
                        <span className="text-[10px] text-accent/70">Motifs</span>
                        <span className="text-xs font-bold text-accent">{motifAnalysis.motifs.length}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 rounded-lg">
                        <span className="text-[10px] text-purple-400">Bridges</span>
                        <span className="text-xs font-bold text-purple-600">{motifAnalysis.connections.filter(c => c.strength >= 0.3).length}</span>
                      </div>
                      {motifAnalysis.orphanIds.length > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg">
                          <span className="text-[10px] text-amber-500">Unconnected</span>
                          <span className="text-xs font-bold text-amber-600">{motifAnalysis.orphanIds.length}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex bg-slate-100 rounded-lg p-0.5">
                      <button onClick={() => setMotifView('board')} className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${motifView === 'board' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-primary'}`}>
                        Board
                      </button>
                      <button onClick={() => setMotifView('narrative')} className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${motifView === 'narrative' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-primary'}`}>
                        Narrative
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Results Area (full-width) ─── */}
            {motifAnalysis && (
              <>
                {motifView === 'board' ? (
                  <MotifStoryboard analysis={motifAnalysis} expandedCard={expandedCard} setExpandedCard={setExpandedCard} />
                ) : (
                  /* ── Narrative view ── */
                  <div className="space-y-5">
                    {motifAnalysis.motifs.map((motif, mi) => {
                      const pal = MOTIF_PALETTE[motif.colorIdx % MOTIF_PALETTE.length];
                      const mBullets = motif.bulletIds.map(id => motifAnalysis.bullets.find(b => b.id === id)).filter(Boolean);
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
                            {/* Ideas in this motif */}
                            <div className="flex flex-wrap gap-2">
                              {mBullets.map(b => b && (
                                <div key={b.id} className="px-3 py-2 rounded-xl border text-sm" style={{ backgroundColor: pal.bg + '60', borderColor: pal.border + '25', color: pal.text }}>
                                  {b.text}
                                </div>
                              ))}
                            </div>

                            {/* Narrative advice */}
                            <div className="p-5 rounded-xl border" style={{ backgroundColor: pal.bg + '40', borderColor: pal.border + '20' }}>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: pal.border }}>How to write this essay</p>
                              <p className="text-sm text-slate-700 leading-relaxed">{motif.narrative}</p>
                            </div>

                            {/* Structure suggestion */}
                            {motif.suggestedStructure && (
                              <div className="p-5 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-500">Suggested structure</p>
                                <p className="text-sm text-slate-600 leading-relaxed">{motif.suggestedStructure}</p>
                              </div>
                            )}

                            {/* Weak connection warnings */}
                            {motif.weakConnections && motif.weakConnections.length > 0 && (
                              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-amber-600">Watch out</p>
                                {motif.weakConnections.map((w, i) => (
                                  <p key={i} className="text-xs text-amber-700 leading-relaxed">{w}</p>
                                ))}
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
                          <p className="text-xs text-slate-400 mt-0.5">These didn&apos;t connect strongly yet. Try adding more detail or related experiences.</p>
                        </div>
                        <div className="p-5 flex flex-wrap gap-2">
                          {motifAnalysis.orphanIds.map(id => {
                            const b = motifAnalysis.bullets.find(x => x.id === id);
                            return b ? (
                              <div key={id} className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">{b.text}</div>
                            ) : null;
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
        {mode === 'essays' && <div className="flex-1 min-h-0 grid lg:grid-cols-[240px_1fr_340px] gap-5">

          {/* ─── LEFT: Essay List ─── */}
          <div className="overflow-y-auto space-y-2 pr-1">
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
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ─── CENTER: Editor ─── */}
          <div className="flex flex-col min-h-0">
            {activeEssay ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Editor header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold font-display text-primary truncate">{activeEssay.title}</h3>
                    {activeEssay.prompt && <p className="text-xs text-slate-400 italic truncate mt-0.5">&ldquo;{activeEssay.prompt}&rdquo;</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    {saving && <span className="text-[10px] text-accent animate-pulse font-medium">Saving...</span>}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2.5 py-1">
                      <span className="text-xs font-bold text-primary">{wordCount}</span>
                      <span className="text-[10px] text-slate-400">words</span>
                    </div>
                    <div className="flex gap-1">
                      {[500, 650, 700].map(t => (
                        <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${wordCount >= t ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{t}</span>
                      ))}
                    </div>
                    <button onClick={markComplete} disabled={wordCount < 50} className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Mark Complete</button>
                  </div>
                </div>

                {/* Textarea — fills remaining height */}
                <textarea
                  value={editContent}
                  onChange={e => handleContentChange(e.target.value)}
                  placeholder="Start writing your essay here...&#10;&#10;Your writing will be analyzed in real-time as you type. The sidebar will show live scores, tips, and suggestions based on your content."
                  className="flex-1 min-h-0 w-full px-6 py-5 text-[15px] leading-[1.8] focus:outline-none resize-none font-sans text-slate-800 placeholder:text-slate-300"
                />
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
        </div>}
      </div>
    </DashboardLayout>
  );
}
