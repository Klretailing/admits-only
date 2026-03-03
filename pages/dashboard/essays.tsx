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
   MOTIFS ENGINE — Story Stitching
   ══════════════════════════════════════════════════════════════════════

   Motifs helps students brainstorm essay ideas by finding hidden
   connections between their experiences. Students type bullet-point
   ideas, and the engine detects shared themes, complementary arcs,
   and narrative threads — then visualizes them on a storyboard.
   ══════════════════════════════════════════════════════════════════════ */

interface MotifBullet {
  id: string;
  text: string;
  themes: string[];
  domains: string[];
  keywords: string[];
}

interface MotifConnection {
  fromId: string;
  toId: string;
  strength: number;
  label: string;
  type: 'shared_theme' | 'complementary' | 'shared_domain' | 'keyword';
}

interface MotifGroup {
  id: string;
  name: string;
  narrative: string;
  bulletIds: string[];
  dominantThemes: string[];
  colorIdx: number;
}

interface MotifAnalysis {
  bullets: MotifBullet[];
  connections: MotifConnection[];
  motifs: MotifGroup[];
  orphanIds: string[];
}

interface SavedBoard {
  id: string;
  title: string;
  bullets: unknown;
  analysis: unknown;
  createdAt: string;
  updatedAt: string;
}

/* ─── Theme & Domain Detection ─── */

const MOTIF_THEMES: Record<string, RegExp> = {
  resilience: /\b(?:overcame?|struggle|challeng|difficult|tough|hardship|failure|setback|persever|persist|endur|bounce|recover|adapt|obstacle|fight|survive|broke|heal)\b/i,
  leadership: /\b(?:led|lead|leader|captain|president|found|organiz|manag|direct|coordinat|mentor|inspir|initiative|responsib|delegate|guide|mobiliz)\b/i,
  creativity: /\b(?:creat|design|invent|imagin|innovat|built|original|unique|artistic|compose|paint|draw|code|program|craft|experiment|improv)\b/i,
  growth: /\b(?:learn|grew|grow|change|transform|develop|improve|progress|evolve|mature|discover|realiz|understand|adapt|expand|open)\b/i,
  community: /\b(?:communit|volunteer|serve|help|impact|together|team|neighbor|family|friend|connect|belong|support|uplift|fundrais|donat)\b/i,
  identity: /\b(?:cultur|heritage|identity|tradition|value|belief|who\s*i\s*am|roots|background|immigra|religion|language|bilingual|diaspora|home)\b/i,
  passion: /\b(?:passion|love|fascin|obsess|dedicate|commit|drive|motivate|excit|inspir|eager|curious|wonder|thrill|devot)\b/i,
  intellectual: /\b(?:research|study|read|think|analyz|question|hypothesis|theory|philosophy|debate|academic|scholar|puzzle|logic|invest)\b/i,
  empathy: /\b(?:empathy|compassion|understand|listen|care|emotion|perspective|relate|human|kind|gentle|comfort|witness|feel\s+for)\b/i,
  ambition: /\b(?:goal|dream|aspir|ambition|future|career|achiev|success|strive|pursu|determin|driven|envision|someday)\b/i,
};

const MOTIF_DOMAINS: Record<string, RegExp> = {
  sports: /\b(?:sport|team|game|play|field|court|ball|race|swim|run|compet|athlet|train|coach|practice|win|tournament|track|gym|varsity)\b/i,
  science: /\b(?:science|lab|experiment|research|biology|chemistry|physics|math|equation|data|hypothesis|molecule|cell|gene|specimen|microscop)\b/i,
  arts: /\b(?:art|music|paint|draw|sing|dance|theater|perform|stage|gallery|exhibit|instrument|piano|guitar|violin|choir|orchestra|film|photograph)\b/i,
  technology: /\b(?:code|program|computer|tech|software|app|website|robot|AI|machine|digital|hack|engineer|algorithm|database|startup)\b/i,
  nature: /\b(?:nature|environment|outdoor|hike|camp|garden|animal|plant|climate|earth|ocean|mountain|forest|wildlife|sustain|ecolog)\b/i,
  family: /\b(?:family|parent|mother|father|mom|dad|sibling|brother|sister|grandparent|home|household|generation|relative|aunt|uncle)\b/i,
  school: /\b(?:school|class|teacher|student|grade|homework|college|university|campus|education|curriculum|exam|tutor|professor|lecture)\b/i,
  social_justice: /\b(?:justice|equality|rights|protest|advocat|awareness|policy|society|systemic|inequit|poverty|racism|privilege|margin|activis)\b/i,
  health: /\b(?:health|hospital|doctor|nurse|patient|medic|illness|diagnos|mental\s+health|therapy|disabilit|surgery|clinic|wellness)\b/i,
  food: /\b(?:cook|food|kitchen|recipe|bake|meal|restaurant|culinary|spice|flavor|dish|eat|taste|nourish|ingredient|chef)\b/i,
};

const MOTIF_STOP_WORDS = new Set([
  'the','a','an','is','was','were','are','been','be','have','has','had','do','does','did','will','would','could','should',
  'may','might','can','this','that','these','those','i','me','my','mine','you','your','we','our','he','she','it','they',
  'them','their','its','and','but','or','not','no','so','if','then','than','when','while','of','in','on','at','to','for',
  'with','by','from','as','into','about','between','through','during','before','after','above','below','up','down','out',
  'off','over','under','again','further','once','here','there','all','each','every','both','few','more','most','other',
  'some','such','only','own','same','just','also','very','really','because','until','where','how','what','which','who',
  'whom','why','being','having','doing','going','wanted','like','even','still','much','many',
]);

function extractMotifKeywords(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z'\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !MOTIF_STOP_WORDS.has(w));
}

function detectThemes(text: string): string[] {
  return Object.entries(MOTIF_THEMES)
    .filter(([, rx]) => rx.test(text))
    .map(([k]) => k);
}

function detectDomains(text: string): string[] {
  return Object.entries(MOTIF_DOMAINS)
    .filter(([, rx]) => rx.test(text))
    .map(([k]) => k);
}

/* ─── Complementary theme pairs that form narrative arcs ─── */

const COMPLEMENTARY_PAIRS: [string, string, string][] = [
  ['resilience', 'growth', 'Struggle led to transformation'],
  ['identity', 'community', 'Cultural roots shape how you serve others'],
  ['passion', 'ambition', 'Deep interest driving purposeful pursuit'],
  ['empathy', 'leadership', 'Understanding others makes you a stronger leader'],
  ['creativity', 'intellectual', 'Where imagination meets analytical rigor'],
  ['resilience', 'leadership', 'Adversity forged leadership capacity'],
  ['identity', 'growth', 'Exploring identity as a journey of becoming'],
  ['community', 'empathy', 'Service deepened understanding of others'],
  ['passion', 'creativity', 'Passion fueling creative expression'],
  ['intellectual', 'ambition', 'Curiosity driving ambitious goals'],
  ['resilience', 'identity', 'Challenges clarified who you really are'],
  ['growth', 'leadership', 'Personal evolution enabling you to lead others'],
  ['creativity', 'community', 'Creative skills applied to community impact'],
  ['empathy', 'growth', 'Seeing through others\' eyes changed your worldview'],
  ['passion', 'community', 'Your passion becoming a vehicle for collective good'],
];

/* ─── Evocative motif names ─── */

const MOTIF_NAMES: Record<string, string[]> = {
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

const COMBO_NAMES: Record<string, string> = {
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
};

/* ─── Connection Finding ─── */

function findMotifConnections(bullets: MotifBullet[]): MotifConnection[] {
  const connections: MotifConnection[] = [];

  for (let i = 0; i < bullets.length; i++) {
    for (let j = i + 1; j < bullets.length; j++) {
      const a = bullets[i], b = bullets[j];
      let bestStrength = 0;
      let bestLabel = '';
      let bestType: MotifConnection['type'] = 'keyword';

      // Shared themes
      const sharedThemes = a.themes.filter(t => b.themes.includes(t));
      if (sharedThemes.length > 0) {
        const s = Math.min(1, sharedThemes.length * 0.4 + 0.3);
        if (s > bestStrength) {
          bestStrength = s;
          const themeName = sharedThemes[0].charAt(0).toUpperCase() + sharedThemes[0].slice(1);
          bestLabel = `Both reflect ${themeName.toLowerCase()}`;
          bestType = 'shared_theme';
        }
      }

      // Complementary themes
      for (const [t1, t2, desc] of COMPLEMENTARY_PAIRS) {
        const hasArc = (a.themes.includes(t1) && b.themes.includes(t2)) ||
                       (a.themes.includes(t2) && b.themes.includes(t1));
        if (hasArc) {
          const s = 0.8;
          if (s > bestStrength) {
            bestStrength = s;
            bestLabel = desc;
            bestType = 'complementary';
          }
        }
      }

      // Shared domains
      const sharedDomains = a.domains.filter(d => b.domains.includes(d));
      if (sharedDomains.length > 0) {
        const s = 0.5 + sharedDomains.length * 0.15;
        if (s > bestStrength) {
          bestStrength = s;
          const domainName = sharedDomains[0].replace('_', ' ');
          bestLabel = `Connected through ${domainName}`;
          bestType = 'shared_domain';
        }
      }

      // Keyword overlap
      const sharedKw = a.keywords.filter(k => b.keywords.includes(k));
      if (sharedKw.length >= 2 && bestStrength < 0.3) {
        bestStrength = 0.3 + Math.min(sharedKw.length * 0.1, 0.3);
        bestLabel = `Shared: ${sharedKw.slice(0, 3).join(', ')}`;
        bestType = 'keyword';
      }

      if (bestStrength >= 0.25) {
        connections.push({
          fromId: a.id,
          toId: b.id,
          strength: bestStrength,
          label: bestLabel,
          type: bestType,
        });
      }
    }
  }

  return connections.sort((a, b) => b.strength - a.strength);
}

/* ─── Motif Grouping (greedy clustering, no overlap) ─── */

function groupMotifs(bullets: MotifBullet[], connections: MotifConnection[]): { motifs: MotifGroup[]; orphanIds: string[] } {
  const assigned = new Set<string>();
  const motifs: MotifGroup[] = [];

  // Build adjacency with strong connections only
  const adj: Record<string, { id: string; strength: number }[]> = {};
  for (const b of bullets) adj[b.id] = [];

  for (const c of connections) {
    if (c.strength >= 0.4) {
      adj[c.fromId]?.push({ id: c.toId, strength: c.strength });
      adj[c.toId]?.push({ id: c.fromId, strength: c.strength });
    }
  }

  // Greedy: pick the most-connected unassigned bullet, flood-fill
  const bulletsByConnections = bullets
    .map(b => ({ bullet: b, conns: adj[b.id]?.length || 0 }))
    .sort((a, b) => b.conns - a.conns);

  let motifIdx = 0;

  for (const { bullet } of bulletsByConnections) {
    if (assigned.has(bullet.id)) continue;
    if ((adj[bullet.id]?.length || 0) === 0) continue;

    // BFS to find cluster
    const cluster: string[] = [bullet.id];
    assigned.add(bullet.id);
    const queue = [bullet.id];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const neighbor of adj[curr] || []) {
        if (!assigned.has(neighbor.id) && neighbor.strength >= 0.35) {
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

    // Determine dominant themes
    const themeCount: Record<string, number> = {};
    for (const bid of cluster) {
      const b = bullets.find(x => x.id === bid);
      if (b) for (const t of b.themes) themeCount[t] = (themeCount[t] || 0) + 1;
    }
    const sortedThemes = Object.entries(themeCount).sort((a, b) => b[1] - a[1]).map(([t]) => t);
    const top2 = sortedThemes.slice(0, 2);

    // Name the motif
    let name = 'Thread ' + (motifIdx + 1);
    if (top2.length >= 2) {
      const key = [top2[0], top2[1]].sort().join('+');
      name = COMBO_NAMES[key] || MOTIF_NAMES[top2[0]]?.[motifIdx % 4] || name;
    } else if (top2.length === 1) {
      name = MOTIF_NAMES[top2[0]]?.[motifIdx % 4] || name;
    }

    // Generate narrative suggestion
    const clusterBullets = cluster.map(cid => bullets.find(x => x.id === cid)!).filter(Boolean);
    const narrative = generateMotifNarrative(clusterBullets, top2, connections.filter(c => cluster.includes(c.fromId) && cluster.includes(c.toId)));

    motifs.push({
      id: `motif_${motifIdx}`,
      name,
      narrative,
      bulletIds: cluster,
      dominantThemes: top2,
      colorIdx: motifIdx,
    });
    motifIdx++;
  }

  const orphanIds = bullets.filter(b => !assigned.has(b.id)).map(b => b.id);
  return { motifs, orphanIds };
}

/* ─── Narrative Generation ─── */

function generateMotifNarrative(bullets: MotifBullet[], themes: string[], connections: MotifConnection[]): string {
  const n = bullets.length;
  const texts = bullets.map(b => `"${b.text.length > 50 ? b.text.slice(0, 47) + '...' : b.text}"`);

  if (n === 0) return '';

  const arcConnection = connections.find(c => c.type === 'complementary');

  if (themes.includes('resilience') && themes.includes('growth')) {
    return `Start by placing the reader inside the struggle from ${texts[0]}. Use sensory details — what did the room look like, what were you thinking? Then shift to ${texts[n > 1 ? 1 : 0]}, showing how you emerged different. The gap between who you were and who you became IS the essay.`;
  }
  if (themes.includes('identity') && themes.includes('community')) {
    return `Open with a specific scene rooted in your cultural experience from ${texts[0]}. Let the reader feel what it's like to walk in your shoes. Then bridge to ${texts[n > 1 ? 1 : 0]} to show how those roots shape how you show up for others. The throughline: your background isn't just context, it's a compass.`;
  }
  if (themes.includes('passion') && themes.includes('creativity')) {
    return `Begin with the moment of creative obsession — ${texts[0]}. What does it feel like when you're in the zone? Then weave in ${texts[n > 1 ? 1 : 0]} to show that this isn't a hobby, it's how your mind works. AOs love seeing the internal creative process, not just the output.`;
  }
  if (themes.includes('empathy') && themes.includes('leadership')) {
    return `Start with a quiet moment of listening or observing from ${texts[0]}. Then show how that understanding informed a leadership decision in ${texts[n > 1 ? 1 : 0]}. The most compelling leaders in admissions essays don't command — they understand first, then act.`;
  }

  if (arcConnection) {
    return `These experiences create a natural narrative arc: ${arcConnection.label}. Start with ${texts[0]}, which sets up the tension or context. Then transition to ${texts[n > 1 ? 1 : 0]}, which reveals the resolution or growth. ${n > 2 ? `The other ideas (${texts.slice(2).join(', ')}) can serve as supporting details that enrich the central arc.` : ''} The connection between these moments is what makes your essay feel cohesive rather than a list of accomplishments.`;
  }

  if (themes.length > 0) {
    const themeName = themes[0].charAt(0).toUpperCase() + themes[0].slice(1);
    return `The thread connecting these ideas is ${themeName.toLowerCase()}. Open with the most vivid, specific moment from ${texts[0]}. Each subsequent idea (${texts.slice(1).join(', ')}) becomes a new facet of the same core theme. The key: don't announce the theme — let the reader discover it through the accumulated weight of your details.`;
  }

  return `These experiences share underlying connections. Open with the most specific, visual moment. Let each idea build on the previous one, creating a layered narrative that reveals different dimensions of who you are. The reader should finish thinking: "I know this person."`;
}

/* ─── Full Analysis Pipeline ─── */

function analyzeMotifs(rawBullets: string[]): MotifAnalysis {
  const bullets: MotifBullet[] = rawBullets
    .filter(t => t.trim().length > 0)
    .map((text, i) => ({
      id: `b_${i}`,
      text: text.trim(),
      themes: detectThemes(text),
      domains: detectDomains(text),
      keywords: extractMotifKeywords(text),
    }));

  const connections = findMotifConnections(bullets);
  const { motifs, orphanIds } = groupMotifs(bullets, connections);

  return { bullets, connections, motifs, orphanIds };
}

/* ─── Visual Board: Color palette ─── */

const MOTIF_PALETTE = [
  { bg: '#EEF2FF', border: '#6366F1', text: '#3730A3', accent: '#818CF8', light: '#C7D2FE' },
  { bg: '#FEF3C7', border: '#D97706', text: '#78350F', accent: '#FBBF24', light: '#FDE68A' },
  { bg: '#D1FAE5', border: '#059669', text: '#064E3B', accent: '#34D399', light: '#A7F3D0' },
  { bg: '#FFE4E6', border: '#E11D48', text: '#881337', accent: '#FB7185', light: '#FECDD3' },
  { bg: '#E0F2FE', border: '#0284C7', text: '#0C4A6E', accent: '#38BDF8', light: '#BAE6FD' },
  { bg: '#F3E8FF', border: '#9333EA', text: '#581C87', accent: '#C084FC', light: '#DDD6FE' },
];

/* ─── SVG Storyboard Component ─── */

function MotifStoryboard({ analysis }: { analysis: MotifAnalysis }) {
  const { bullets, connections, motifs, orphanIds } = analysis;
  if (bullets.length === 0) return null;

  const ISLAND_W = 240;
  const ISLAND_GAP = 100;
  const NODE_H = 70;
  const NODE_GAP = 14;
  const PAD = 24;
  const HEADER_H = 44;

  // Build layout
  const groups = [...motifs];
  const orphanBullets = orphanIds.map(id => bullets.find(b => b.id === id)!).filter(Boolean);
  const hasOrphans = orphanBullets.length > 0;

  type NodePos = { id: string; x: number; y: number; w: number; h: number; groupIdx: number };
  const nodePositions: Record<string, NodePos> = {};

  let totalX = PAD;
  const islandRects: { x: number; y: number; w: number; h: number; idx: number; name: string }[] = [];

  groups.forEach((motif, gi) => {
    const mBullets = motif.bulletIds.map(id => bullets.find(b => b.id === id)!).filter(Boolean);
    const islandH = HEADER_H + mBullets.length * (NODE_H + NODE_GAP) + PAD;

    islandRects.push({ x: totalX, y: PAD, w: ISLAND_W, h: islandH, idx: gi, name: motif.name });

    mBullets.forEach((b, bi) => {
      nodePositions[b.id] = {
        id: b.id,
        x: totalX + PAD,
        y: PAD + HEADER_H + bi * (NODE_H + NODE_GAP),
        w: ISLAND_W - PAD * 2,
        h: NODE_H,
        groupIdx: gi,
      };
    });

    totalX += ISLAND_W + ISLAND_GAP;
  });

  // Orphan island
  if (hasOrphans) {
    const islandH = HEADER_H + orphanBullets.length * (NODE_H + NODE_GAP) + PAD;
    islandRects.push({ x: totalX, y: PAD, w: ISLAND_W, h: islandH, idx: -1, name: 'Unconnected Ideas' });

    orphanBullets.forEach((b, bi) => {
      nodePositions[b.id] = {
        id: b.id,
        x: totalX + PAD,
        y: PAD + HEADER_H + bi * (NODE_H + NODE_GAP),
        w: ISLAND_W - PAD * 2,
        h: NODE_H,
        groupIdx: -1,
      };
    });
    totalX += ISLAND_W + PAD;
  } else {
    totalX += PAD - ISLAND_GAP; // Remove last gap
  }

  const maxIslandH = Math.max(...islandRects.map(r => r.h + PAD * 2), 300);
  const totalW = Math.max(totalX, 400);
  const totalH = maxIslandH + 60; // room for bottom narrative

  // Wrap text helper
  const wrapText = (text: string, maxChars: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      if ((current + ' ' + w).trim().length > maxChars) {
        if (current) lines.push(current.trim());
        current = w;
      } else {
        current = current ? current + ' ' + w : w;
      }
    }
    if (current) lines.push(current.trim());
    return lines.slice(0, 3); // Max 3 lines
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50">
      <svg viewBox={`0 0 ${totalW} ${totalH}`} style={{ minWidth: totalW, minHeight: totalH }} className="w-full">
        <defs>
          <filter id="node-shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.06" />
          </filter>
          <filter id="island-shadow" x="-2%" y="-2%" width="104%" height="104%">
            <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#000" floodOpacity="0.04" />
          </filter>
          <marker id="arrowhead" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Island backgrounds */}
        {islandRects.map((rect, i) => {
          const pal = rect.idx >= 0 ? MOTIF_PALETTE[rect.idx % MOTIF_PALETTE.length] : { bg: '#F8FAFC', border: '#CBD5E1', text: '#475569', accent: '#94A3B8', light: '#E2E8F0' };
          return (
            <g key={`island-${i}`}>
              <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={16} fill={pal.bg} stroke={pal.border} strokeWidth={1.5} filter="url(#island-shadow)" />
              <text x={rect.x + PAD} y={rect.y + 28} fill={pal.text} fontWeight="800" fontSize="13" fontFamily="system-ui, sans-serif">{rect.name}</text>
              <line x1={rect.x + PAD} y1={rect.y + HEADER_H - 4} x2={rect.x + rect.w - PAD} y2={rect.y + HEADER_H - 4} stroke={pal.border} strokeWidth={1} strokeOpacity={0.3} />
            </g>
          );
        })}

        {/* Connection lines (draw before nodes so they're behind) */}
        {connections.filter(c => c.strength >= 0.25).map((conn, i) => {
          const from = nodePositions[conn.fromId];
          const to = nodePositions[conn.toId];
          if (!from || !to) return null;

          const sameGroup = from.groupIdx === to.groupIdx && from.groupIdx >= 0;
          const x1 = from.x + from.w;
          const y1 = from.y + from.h / 2;
          const x2 = to.x;
          const y2 = to.y + to.h / 2;

          let path: string;
          if (sameGroup) {
            // Within-group: small arc to the right
            const midX = Math.max(x1, x2) + 30;
            path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2 + from.w} ${y2}`;
          } else {
            // Cross-group: bezier curve
            const midX = (x1 + x2) / 2;
            path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
          }

          const opacity = 0.15 + conn.strength * 0.5;
          const strokeWidth = 1 + conn.strength * 2;

          // Label position at midpoint
          const labelX = (x1 + x2) / 2;
          const labelY = (y1 + y2) / 2 - 8;

          return (
            <g key={`conn-${i}`}>
              <path d={path} fill="none" stroke="#94a3b8" strokeWidth={strokeWidth} strokeOpacity={opacity} strokeDasharray={conn.type === 'keyword' ? '4 4' : 'none'} />
              {conn.strength >= 0.4 && !sameGroup && (
                <>
                  <rect x={labelX - conn.label.length * 3} y={labelY - 8} width={Math.min(conn.label.length * 6, 160)} height={16} rx={8} fill="white" stroke="#e2e8f0" strokeWidth={1} />
                  <text x={labelX} y={labelY + 3} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="system-ui, sans-serif" fontWeight="600">{conn.label.length > 28 ? conn.label.slice(0, 25) + '...' : conn.label}</text>
                </>
              )}
            </g>
          );
        })}

        {/* Bullet nodes */}
        {bullets.map(b => {
          const pos = nodePositions[b.id];
          if (!pos) return null;
          const pal = pos.groupIdx >= 0 ? MOTIF_PALETTE[pos.groupIdx % MOTIF_PALETTE.length] : { bg: '#FFFFFF', border: '#CBD5E1', text: '#334155', accent: '#94A3B8', light: '#F1F5F9' };
          const lines = wrapText(b.text, 28);

          return (
            <g key={b.id}>
              <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx={10} fill="white" stroke={pal.border} strokeWidth={1} filter="url(#node-shadow)" />
              {lines.map((line, li) => (
                <text key={li} x={pos.x + 10} y={pos.y + 18 + li * 14} fill={pal.text} fontSize="10.5" fontFamily="system-ui, sans-serif" fontWeight={li === 0 ? '600' : '400'}>{line}</text>
              ))}
              {/* Theme pills */}
              {b.themes.slice(0, 2).map((theme, ti) => (
                <g key={ti}>
                  <rect x={pos.x + 10 + ti * 65} y={pos.y + pos.h - 20} width={58} height={14} rx={7} fill={pal.light} />
                  <text x={pos.x + 10 + ti * 65 + 29} y={pos.y + pos.h - 11} textAnchor="middle" fill={pal.text} fontSize="7.5" fontWeight="700" fontFamily="system-ui, sans-serif">{theme}</text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
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
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold font-display text-primary">Essay Workspace</h1>
              <p className="mt-0.5 text-sm text-slate-500">{mode === 'essays' ? 'Write, analyze, and get real-time admissions-grade feedback.' : 'Discover hidden connections between your ideas and stitch them into compelling stories.'}</p>
            </div>
            <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
              <button
                onClick={() => setMode('essays')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'essays' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-primary'}`}
              >
                My Essays
              </button>
              <button
                onClick={() => setMode('motifs')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'motifs' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-primary'}`}
              >
                Motifs
              </button>
            </div>
          </div>
          {mode === 'essays' && <button onClick={() => setShowNewForm(true)} className="btn-primary text-sm">+ New Essay</button>}
        </div>

        {/* ═══════════════ MOTIFS MODE ═══════════════ */}
        {mode === 'motifs' && (
          <div className="flex-1 min-h-0 grid lg:grid-cols-[280px_1fr] gap-4">

            {/* ─── Left: Input + Saved Boards ─── */}
            <div className="flex flex-col gap-3 overflow-y-auto pr-1">
              {/* Description card */}
              <div className="bg-gradient-to-br from-accent/5 to-purple-50 rounded-xl border border-accent/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary">Motifs</h3>
                    <p className="text-[10px] text-slate-400">Story Stitching Engine</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Type your ideas, experiences, and moments as bullet points. Motifs finds the hidden threads between them and shows you how to weave them into a multi-dimensional essay.
                </p>
              </div>

              {/* Input area */}
              <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Ideas</label>
                  {activeBoardId && <button onClick={newBoard} className="text-[10px] text-accent font-semibold hover:text-accent/80">+ New Board</button>}
                </div>
                <textarea
                  value={motifInput}
                  onChange={e => setMotifInput(e.target.value)}
                  placeholder={"Drop your ideas here, one per line:\n\n- The summer I spent cooking with my grandmother\n- Leading the debate team to nationals\n- When I failed my first AP exam\n- Teaching coding to kids at the library\n- My family's immigration story"}
                  rows={8}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none font-sans"
                />
                <button
                  onClick={runMotifAnalysis}
                  disabled={motifInput.split('\n').filter(l => l.trim().length > 0).length < 2}
                  className="w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-accent to-purple-600 rounded-lg hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Find Motifs
                </button>
              </div>

              {/* Save controls */}
              {motifAnalysis && motifAnalysis.bullets.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-2">
                  <input
                    type="text"
                    value={boardTitle}
                    onChange={e => setBoardTitle(e.target.value)}
                    placeholder="Board title (e.g. Personal Statement Ideas)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <button
                    onClick={saveMotifBoard}
                    disabled={savingBoard}
                    className="w-full py-2 text-xs font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition-colors disabled:opacity-40"
                  >
                    {savingBoard ? 'Saving...' : activeBoardId ? 'Update Board' : 'Save Board'}
                  </button>
                </div>
              )}

              {/* Saved boards list */}
              {savedBoards.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Saved Boards ({savedBoards.length})</p>
                  <div className="space-y-1.5">
                    {savedBoards.map(board => (
                      <div
                        key={board.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer group transition-all ${
                          activeBoardId === board.id ? 'bg-accent/5 border border-accent/20' : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <button onClick={() => loadBoard(board)} className="text-left flex-1 min-w-0">
                          <p className="text-xs font-semibold text-primary truncate">{board.title}</p>
                          <p className="text-[10px] text-slate-400">
                            {Array.isArray(board.bullets) ? (board.bullets as string[]).length : 0} ideas &middot; {new Date(board.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </button>
                        <button
                          onClick={() => deleteBoard(board.id)}
                          className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ─── Right: Visual Storyboard ─── */}
            <div className="flex flex-col gap-4 overflow-y-auto min-h-0">
              {motifAnalysis ? (
                <>
                  {/* Stats bar */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400">Ideas:</span>
                      <span className="text-xs font-bold text-primary">{motifAnalysis.bullets.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400">Motifs found:</span>
                      <span className="text-xs font-bold text-accent">{motifAnalysis.motifs.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400">Connections:</span>
                      <span className="text-xs font-bold text-purple-600">{motifAnalysis.connections.filter(c => c.strength >= 0.4).length}</span>
                    </div>
                    {motifAnalysis.orphanIds.length > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
                        <span className="text-[10px] text-amber-600">Unconnected:</span>
                        <span className="text-xs font-bold text-amber-700">{motifAnalysis.orphanIds.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Visual Board */}
                  <MotifStoryboard analysis={motifAnalysis} />

                  {/* Motif narratives */}
                  {motifAnalysis.motifs.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold font-display text-primary">Narrative Threads</h3>
                      <p className="text-[11px] text-slate-400 -mt-1">Each motif is a potential essay narrative. Here&apos;s how to weave your ideas together.</p>
                      {motifAnalysis.motifs.map((motif, mi) => {
                        const pal = MOTIF_PALETTE[motif.colorIdx % MOTIF_PALETTE.length];
                        const mBullets = motif.bulletIds.map(id => motifAnalysis.bullets.find(b => b.id === id)).filter(Boolean);
                        return (
                          <div key={motif.id} className="rounded-xl border p-4" style={{ borderColor: pal.border + '40', backgroundColor: pal.bg + '80' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pal.border }} />
                              <h4 className="text-xs font-bold" style={{ color: pal.text }}>{motif.name}</h4>
                              <span className="text-[10px] font-medium" style={{ color: pal.accent }}>
                                {motif.dominantThemes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' + ')}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {mBullets.map(b => b && (
                                <span key={b.id} className="px-2 py-0.5 rounded-full text-[9px] font-medium" style={{ backgroundColor: pal.light, color: pal.text }}>
                                  {b.text.length > 40 ? b.text.slice(0, 37) + '...' : b.text}
                                </span>
                              ))}
                            </div>
                            <div className="p-3 rounded-lg bg-white/70 border" style={{ borderColor: pal.border + '20' }}>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: pal.border }}>How to write this</p>
                              <p className="text-[11px] text-slate-600 leading-relaxed">{motif.narrative}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Orphan ideas */}
                  {motifAnalysis.orphanIds.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-xs font-bold text-slate-500 mb-2">Standalone Ideas</h4>
                      <p className="text-[10px] text-slate-400 mb-3">These ideas didn&apos;t connect strongly to others. They might work as standalone essay topics, or try adding more related experiences to find connections.</p>
                      <div className="flex flex-wrap gap-1.5">
                        {motifAnalysis.orphanIds.map(id => {
                          const b = motifAnalysis.bullets.find(x => x.id === id);
                          return b ? (
                            <span key={id} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] text-slate-600">{b.text}</span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Empty state */
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-md px-6">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent/10 to-purple-100 flex items-center justify-center mb-5">
                      <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold font-display text-primary mb-2">Motifs — Story Stitching</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Drop in your ideas, experiences, and moments as bullet points. Motifs discovers the hidden threads between them and maps out how to weave them into a compelling, multi-dimensional essay.
                    </p>
                    <div className="text-left bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">How it works</p>
                      <ol className="space-y-1.5 text-[11px] text-slate-500">
                        <li className="flex gap-2"><span className="text-accent font-bold">1.</span> Type your experiences, memories, and ideas as bullet points</li>
                        <li className="flex gap-2"><span className="text-accent font-bold">2.</span> Click &ldquo;Find Motifs&rdquo; to discover hidden connections</li>
                        <li className="flex gap-2"><span className="text-accent font-bold">3.</span> See how your ideas cluster into essay-worthy narrative threads</li>
                        <li className="flex gap-2"><span className="text-accent font-bold">4.</span> Get specific advice on how to structure each motif into an essay</li>
                        <li className="flex gap-2"><span className="text-accent font-bold">5.</span> Save boards to reference while writing</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
        {mode === 'essays' && <div className="flex-1 min-h-0 grid lg:grid-cols-[220px_1fr_320px] gap-4">

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
        </div>}
      </div>
    </DashboardLayout>
  );
}
