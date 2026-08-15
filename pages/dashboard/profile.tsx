import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';
import { useTheme } from '../../lib/themeContext';
import { computeHolisticScore, evaluateExtracurriculars, comparativeData, normalizeBucket as normalizeBucketShared } from '../../lib/scoring';
import type { Extracurricular as ExtracurricularType } from '../../lib/scoring';
import { tracker } from '../../lib/analytics';

/* ──────────────────────── TYPES ──────────────────────── */

interface Extracurricular {
  id: string;
  name: string;
  role: string;
  description: string;
  years: number;
  hoursPerWeek: number;
  category: string;
}

interface ProfileData {
  gpa: string;
  gpaScale: '4.0' | '5.0';
  gpaWeighted: string;
  satMath: string;
  satRW: string;
  actScore: string;
  extracurriculars: Extracurricular[];
}

/* ──────────────────────── EC BUCKET SYSTEM ──────────────────────── */

const EC_BUCKETS = [
  { key: 'Internship', label: 'Internship', gradient: 'from-blue-500 to-blue-600', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', ring: '#3b82f6' },
  { key: 'Volunteering', label: 'Volunteering', gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', ring: '#10b981' },
  { key: 'Sport', label: 'Sport', gradient: 'from-orange-500 to-orange-600', light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', ring: '#f97316' },
  { key: 'Education Programs', label: 'Education Programs', gradient: 'from-purple-500 to-purple-600', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', ring: '#8b5cf6' },
  { key: 'Recreational Programs', label: 'Recreational', gradient: 'from-pink-500 to-pink-600', light: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', badge: 'bg-pink-100 text-pink-700', ring: '#ec4899' },
  { key: 'Research', label: 'Research', gradient: 'from-cyan-500 to-cyan-600', light: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', badge: 'bg-cyan-100 text-cyan-700', ring: '#06b6d4' },
  { key: 'Clubs', label: 'Clubs', gradient: 'from-amber-500 to-amber-600', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', ring: '#f59e0b' },
];

function normalizeBucket(category: string): string {
  return normalizeBucketShared(category);
}

function getBucket(category: string) {
  const normalized = normalizeBucket(category);
  return EC_BUCKETS.find(b => b.key === normalized) || EC_BUCKETS[6];
}

/* ──────────────────────── DESCRIPTION REVISION ENGINE ──────────────────────── */

const STRONG_VERBS = ['led', 'founded', 'organized', 'created', 'designed', 'managed', 'coordinated', 'developed', 'implemented', 'spearheaded', 'launched', 'initiated', 'established', 'built', 'directed', 'mentored', 'trained', 'produced', 'achieved', 'increased', 'improved', 'raised', 'served', 'facilitated', 'advocated', 'pioneered', 'cultivated', 'transformed'];

const FILLER_WORDS = ['basically', 'really', 'very', 'just', 'actually', 'kind of', 'sort of', 'i think', 'i guess', 'pretty much', 'definitely', 'literally'];

const CATEGORY_VERB_MAP: Record<string, string[]> = {
  'Internship': ['Contributed', 'Collaborated', 'Executed', 'Analyzed', 'Delivered'],
  'Volunteering': ['Served', 'Supported', 'Advocated', 'Organized', 'Mobilized'],
  'Sport': ['Competed', 'Trained', 'Captained', 'Led', 'Achieved'],
  'Education Programs': ['Completed', 'Mastered', 'Studied', 'Earned', 'Excelled'],
  'Recreational Programs': ['Performed', 'Created', 'Produced', 'Directed', 'Showcased'],
  'Research': ['Investigated', 'Analyzed', 'Published', 'Presented', 'Discovered'],
  'Clubs': ['Led', 'Founded', 'Organized', 'Managed', 'Grew'],
};

const CATEGORY_TEMPLATES: Record<string, string> = {
  'Internship': '"Executed [specific deliverables] as [role] at [company], collaborating with [team]. Resulted in [measurable outcome]."',
  'Volunteering': '"Served [X] hours weekly as [role] for [org], [specific duties]. Impacted [number] of [people/families/students]."',
  'Sport': '"Competed as [position] on [team], training [X] hrs/week. Achieved [record/award]. Led team through [challenge]."',
  'Education Programs': '"Selected for [program name], a [selective] program in [subject]. Completed [project]. Earned [recognition]."',
  'Recreational Programs': '"Performed/created [work] as [role] in [group]. Showcased at [venue/event]. Grew skills in [area]."',
  'Research': '"Investigated [topic] under [mentor] at [institution]. Used [methodology]. Presented findings at [venue]."',
  'Clubs': '"Grew [club] membership from [X] to [Y] as [role]. Organized [events]. Raised [funds] for [cause]."',
};

interface RevisionResult {
  polished: string | null;
  concise: string | null;
  tips: string[];
  template: string;
}

function generateRevisions(desc: string, name: string, role: string, category: string): RevisionResult | null {
  const bucket = normalizeBucket(category);
  const template = CATEGORY_TEMPLATES[bucket] || CATEGORY_TEMPLATES['Clubs'];

  if (!desc || desc.trim().length < 15) return { polished: null, concise: null, tips: [], template };

  const text = desc.trim();
  const tips: string[] = [];
  const hasNumbers = /\d+/.test(text);
  const startsWithAction = STRONG_VERBS.some(v => text.toLowerCase().startsWith(v));
  const hasImpact = /(?:result|impact|achiev|improv|increas|rais|serv|award|recogni|select|won|earned|published|present)/i.test(text);
  const hasFillers = FILLER_WORDS.some(f => new RegExp(`\\b${f}\\b`, 'i').test(text));
  const wordCount = text.split(/\s+/).length;

  if (!hasNumbers) tips.push('Add specific numbers to quantify your impact (e.g., "mentored 15 students" or "raised $2,000")');
  if (!startsWithAction) {
    const verbs = CATEGORY_VERB_MAP[bucket] || STRONG_VERBS.slice(0, 4);
    tips.push(`Start with a strong action verb: ${verbs.slice(0, 3).join(', ')}`);
  }
  if (!hasImpact) tips.push('Mention a specific outcome or achievement to show measurable impact');
  if (wordCount < 15) tips.push('Expand your description to highlight your specific contributions');
  if (wordCount > 80) tips.push('Consider trimming to your most impressive 2-3 contributions');

  // Generate polished version
  let polished: string | null = null;
  if (hasFillers || !startsWithAction) {
    let p = text;
    for (const f of FILLER_WORDS) {
      p = p.replace(new RegExp(`\\b${f}\\b\\s*`, 'gi'), '');
    }
    p = p.replace(/\s{2,}/g, ' ').trim();

    if (!startsWithAction && role && name) {
      const verb = (CATEGORY_VERB_MAP[bucket] || ['Contributed'])[0];
      const prep = bucket === 'Sport' ? 'in' : 'for';
      p = `${verb} as ${role} ${prep} ${name}, ${p.charAt(0).toLowerCase()}${p.slice(1)}`;
      if (!p.endsWith('.') && !p.endsWith('!')) p += '.';
    }
    if (p !== text) polished = p;
  }

  // Generate concise version
  let concise: string | null = null;
  if (wordCount > 25) {
    let c = text;
    for (const f of FILLER_WORDS) {
      c = c.replace(new RegExp(`\\b${f}\\b\\s*`, 'gi'), '');
    }
    const sentences = c.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
    if (sentences.length > 2) c = sentences.slice(0, 2).join(' ');
    c = c.replace(/\s{2,}/g, ' ').trim();
    if (c.length < text.length * 0.85 && c !== text) concise = c;
  }

  return { polished, concise, tips, template };
}

/* ──────────────────────── DIVERSITY & DEPTH SCORING ──────────────────────── */

function computeDiversityScore(ecs: Extracurricular[]) {
  const buckets = new Set(ecs.map(ec => normalizeBucket(ec.category)));
  const totalBuckets = EC_BUCKETS.length;
  const filledBuckets = buckets.size;
  const score = Math.round((filledBuckets / totalBuckets) * 100);
  const missing = EC_BUCKETS.filter(b => !buckets.has(b.key)).map(b => b.label);

  let feedback = '';
  if (filledBuckets === totalBuckets) feedback = 'Exceptional breadth across all activity categories.';
  else if (filledBuckets >= 5) feedback = 'Strong diversity. Consider exploring: ' + missing.slice(0, 2).join(', ') + '.';
  else if (filledBuckets >= 3) feedback = 'Good foundation. Explore ' + missing.slice(0, 2).join(' or ') + ' to stand out.';
  else if (filledBuckets >= 1) feedback = 'Narrow focus so far. Admissions officers value well-rounded profiles.';
  else feedback = 'Add activities to see your diversity score.';

  return { score, filledBuckets, totalBuckets, missing, feedback };
}

function computeDepthScore(ecs: Extracurricular[]) {
  if (ecs.length === 0) return { score: 0, feedback: 'Add activities to see your depth score.' };

  const depths = ecs.map(ec => {
    const yearWeight = Math.min(ec.years, 4) / 4;
    const hourWeight = Math.min(ec.hoursPerWeek, 20) / 20;
    return (yearWeight * 0.6 + hourWeight * 0.4) * 100;
  });
  const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
  const longTermBonus = Math.min(ecs.filter(ec => ec.years >= 4).length * 5, 15);
  const commitBonus = Math.min(ecs.filter(ec => ec.hoursPerWeek >= 10).length * 3, 10);
  const score = Math.min(100, Math.round(avgDepth + longTermBonus + commitBonus));

  let feedback = '';
  if (score >= 80) feedback = 'Exceptional depth. Your sustained commitment stands out.';
  else if (score >= 60) feedback = 'Strong commitment. Consider deepening involvement in your key activities.';
  else if (score >= 40) feedback = 'Moderate depth. Aim for 2+ years and 5+ hrs/week in core activities.';
  else feedback = 'Build deeper involvement — sustained commitment is what impresses admissions officers.';

  return { score, feedback };
}

/* ──────────────────────── PERSONA SUGGESTION ENGINE ──────────────────────── */

interface Persona {
  name: string;
  title: string;
  color: string;
  avatarBg: string;
  emoji: string;
}

const PERSONAS: Persona[] = [
  { name: 'Dr. Mehta', title: 'Former Ivy Admissions Reader', color: 'text-violet-700', avatarBg: 'from-violet-500 to-purple-600', emoji: 'DM' },
  { name: 'Coach Jordan', title: 'Student Success Strategist', color: 'text-sky-700', avatarBg: 'from-sky-500 to-blue-600', emoji: 'CJ' },
  { name: 'Ms. Torres', title: 'College Counselor (15 yrs)', color: 'text-rose-700', avatarBg: 'from-rose-500 to-pink-600', emoji: 'MT' },
];

interface PersonaSuggestion {
  persona: Persona;
  suggestion: string;
}

interface ProfileContext {
  gpa: string;
  gpaScale: '4.0' | '5.0';
  gpaWeighted: string;
  satMath: string;
  satRW: string;
  actScore: string;
  ecs: Extracurricular[];
}

function generatePersonaSuggestions(ctx: ProfileContext): PersonaSuggestion[] {
  const { gpa, gpaScale, satMath, satRW, ecs } = ctx;
  const suggestions: PersonaSuggestion[] = [];
  const buckets = new Set(ecs.map(ec => normalizeBucket(ec.category)));
  const avgYears = ecs.length > 0 ? ecs.reduce((s, e) => s + e.years, 0) / ecs.length : 0;
  const avgHours = ecs.length > 0 ? ecs.reduce((s, e) => s + e.hoursPerWeek, 0) / ecs.length : 0;
  const hasLeadership = ecs.some(ec => /(?:president|founder|captain|leader|chair|director|head|editor|chief)/i.test(ec.role));
  const hasResearch = buckets.has('Research');
  const hasVolunteering = buckets.has('Volunteering');
  const hasSport = buckets.has('Sport');
  const hasInternship = buckets.has('Internship');
  const ecCount = ecs.length;
  const gpaNum = parseFloat(gpa) || 0;
  const normalizedGpa = gpaScale === '5.0' ? gpaNum * 0.8 : gpaNum;
  const totalSAT = (parseInt(satMath) || 0) + (parseInt(satRW) || 0);
  const longTermECs = ecs.filter(ec => ec.years >= 3);
  const highCommitECs = ecs.filter(ec => ec.hoursPerWeek >= 10);
  const leadershipECs = ecs.filter(ec => /(?:president|founder|captain|leader|chair|director|head|editor|chief)/i.test(ec.role));

  // Dr. Mehta — Admissions strategy, holistic view, what top schools want
  {
    let suggestion = '';
    if (ecCount === 0 && gpaNum === 0 && totalSAT === 0) {
      suggestion = "Your profile is a blank canvas — which is actually an opportunity. Start by entering your GPA and test scores so I can assess where you stand. Then we'll build your extracurricular narrative strategically.";
    } else if (normalizedGpa >= 3.8 && totalSAT >= 1450 && ecCount >= 5 && hasLeadership) {
      const spike = longTermECs.length > 0 ? longTermECs[0].category.toLowerCase() : 'your strongest area';
      suggestion = `Strong academic foundation (${gpaNum} GPA, ${totalSAT} SAT) with ${ecCount} activities and leadership. At top schools, you're in the competitive pool. The differentiator now is your "spike" — double down on ${spike}. Ask yourself: what would make an admissions officer remember you at 11pm after reading 40 apps?`;
    } else if (normalizedGpa >= 3.8 && totalSAT >= 1450 && !hasLeadership) {
      suggestion = `Your numbers are strong (${gpaNum} GPA, ${totalSAT} SAT), but I don't see leadership progression. At schools like Harvard or Stanford, 75% of admits held a titled leadership position. Seek out officer roles — even "project lead" in ${ecs.length > 0 ? ecs[0].name : 'a club'} would help.`;
    } else if (normalizedGpa >= 3.5 && totalSAT >= 1300 && ecCount < 4) {
      suggestion = `Your academics are solid (${gpaNum} GPA), but ${ecCount} activit${ecCount === 1 ? 'y is' : 'ies are'} below the competitive threshold. Most admitted students at T30 schools list 7-10. Don't pad — find 2-3 activities aligned with what you'd study. Personal projects, freelance work, and family responsibilities all count.`;
    } else if (normalizedGpa < 3.5 && ecCount >= 4 && hasLeadership) {
      suggestion = `Your extracurricular profile shows real initiative — ${leadershipECs.length} leadership role${leadershipECs.length > 1 ? 's' : ''} and ${ecCount} activities. To compensate for a ${gpaNum} GPA, your activities need to tell a compelling story of impact. Quantify everything: members recruited, funds raised, people served.`;
    } else if (totalSAT > 0 && totalSAT < 1200 && normalizedGpa >= 3.5) {
      suggestion = `Your GPA (${gpaNum}) is working in your favor, but a ${totalSAT} SAT could hold you back at test-required schools. Consider test-optional applications, or target a 100+ point improvement through focused prep on your weaker section (${parseInt(satMath) < parseInt(satRW) ? 'Math' : 'Reading & Writing'}).`;
    } else if (ecCount >= 3 && avgYears < 1.5) {
      suggestion = `I see ${ecCount} activities, but the average commitment is ${avgYears.toFixed(1)} years. Admissions readers look for sustained involvement — it signals genuine passion vs. resume padding. Prioritize 3-4 activities you'll stick with through senior year over adding new ones.`;
    } else if (ecCount === 0) {
      suggestion = "Most competitive applicants list 8-10 meaningful activities. Start with what you already do outside of class — tutoring, creative projects, family responsibilities, part-time work. Then add 2-3 structured activities aligned with your academic interests.";
    } else {
      const missingBuckets = EC_BUCKETS.filter(b => !buckets.has(b.key)).slice(0, 2).map(b => b.label.toLowerCase());
      suggestion = `Solid foundation with ${ecCount} activities across ${buckets.size} categories. For a stronger application, consider adding ${missingBuckets.join(' or ')}. The key question for each activity: "What changed because I was there?" — tangible outcomes beat participation every time.`;
    }
    suggestions.push({ persona: PERSONAS[0], suggestion });
  }

  // Coach Jordan — Practical strategy, balance, actionable next steps
  {
    let suggestion = '';
    if (ecCount === 0) {
      suggestion = "Let's start simple: what do you do when you're not studying? Gaming communities, social media, helping at home — these all contain seeds of activities admissions officers value. List 3 things you enjoy, and I'll help turn them into strong extracurriculars.";
    } else if (buckets.size === 1 && ecCount >= 2) {
      const onlyBucket = Array.from(buckets)[0];
      suggestion = `All ${ecCount} of your activities fall under ${onlyBucket}. That shows passion, but admissions officers want to see range. Add one community-facing activity (volunteering, mentoring) and one intellectual pursuit (research, academic club) to show you're multidimensional.`;
    } else if (hasSport && !hasVolunteering && !hasResearch) {
      const sportECs = ecs.filter(ec => normalizeBucket(ec.category) === 'Sport');
      suggestion = `Your athletic commitment (${sportECs.map(e => e.name).join(', ')}) shows discipline. Now complement it: a volunteering activity shows character, and a research or academic pursuit shows intellectual curiosity. This "athlete + scholar + citizen" triangle is compelling.`;
    } else if (highCommitECs.length >= 2 && longTermECs.length >= 2) {
      suggestion = `Impressive commitment: ${highCommitECs.length} activities at 10+ hrs/week and ${longTermECs.length} at 3+ years. You're showing depth. Now identify your top 2 "headline" activities — the ones you'd discuss in an interview. Make sure their descriptions highlight specific achievements, not just responsibilities.`;
    } else if (avgHours < 5 && ecCount >= 3) {
      suggestion = `You have ${ecCount} activities averaging ${avgHours.toFixed(1)} hrs/week each. That's light — aim for at least 2 activities at 8-10 hrs/week. Colleges prefer 4 deep commitments over 8 shallow ones. Consider dropping your least impactful activity and redirecting that time.`;
    } else if (!hasSport && buckets.size < 3) {
      suggestion = `With ${buckets.size} categor${buckets.size === 1 ? 'y' : 'ies'} covered, you need more range. A physical activity (even intramural sports) shows balance. A club or volunteering role adds another dimension. Target 4-5 categories total for a well-rounded profile.`;
    } else {
      const topEC = ecs.reduce((best, ec) => ec.years * ec.hoursPerWeek > best.years * best.hoursPerWeek ? ec : best, ecs[0]);
      suggestion = `Good balance with ${buckets.size} activity categories. Your deepest commitment is ${topEC.name} (${topEC.years} yrs, ${topEC.hoursPerWeek} hrs/wk) — make this the star of your application. Next step: ensure each activity description starts with an action verb and includes a measurable outcome.`;
    }
    suggestions.push({ persona: PERSONAS[1], suggestion });
  }

  // Ms. Torres — Long-term counselor perspective, strategic positioning, deadlines
  {
    let suggestion = '';
    if (ecCount === 0 && gpaNum === 0) {
      suggestion = "We're starting from scratch, and that's perfectly fine — I've guided hundreds of students from this exact point to strong applications. Priority one: enter your academic stats. Priority two: list everything you do outside class, even informally. We'll build your strategy from there.";
    } else if (ecCount >= 5 && buckets.size >= 4 && hasLeadership && normalizedGpa >= 3.7) {
      suggestion = `You're in a strong position with ${ecCount} activities, leadership, and a ${gpaNum} GPA. At this stage, I'd focus on narrative coherence — do your activities tell one story? The strongest applications have a thread connecting everything. Think: "What's my theme?" and let that guide your essays.`;
    } else if (!hasVolunteering && !hasInternship) {
      suggestion = `I notice you're missing both volunteering and professional experience. These are the two categories that appear most frequently in admitted students' profiles at T20 schools. Even a summer commitment — a 6-week internship or weekend volunteering — fills this gap meaningfully.`;
    } else if (ecCount <= 2 && (gpaNum > 0 || totalSAT > 0)) {
      const statsNote = gpaNum > 0 ? `Your ${gpaNum} GPA shows academic ability` : `Your ${totalSAT} SAT shows academic potential`;
      suggestion = `${statsNote}, but ${ecCount} activit${ecCount === 1 ? 'y' : 'ies'} won't cut it — even at test-optional schools. Start with what you already do: helping at a family business, tutoring siblings, running a social media account. Then add 2-3 structured activities by semester's end.`;
    } else if (hasResearch && hasLeadership && hasVolunteering) {
      suggestion = `Research, leadership, and community service — you're hitting the key markers. Now be strategic about descriptions: admissions readers spend ~8 minutes per app. Lead with your most impressive metric in each description. Numbers stick: "raised $5K" is more memorable than "organized fundraisers."`;
    } else if (avgYears >= 3 && ecCount >= 3) {
      suggestion = `${longTermECs.length} of your ${ecCount} activities show 3+ years of commitment — that's exactly what admissions offices want to see. This signals genuine passion. Make sure your activity descriptions show growth: member → officer → leader, or beginner → advanced → mentor.`;
    } else {
      const nextSteps: string[] = [];
      if (!hasLeadership) nextSteps.push('seek a leadership title in your strongest activity');
      if (buckets.size < 4) nextSteps.push(`expand from ${buckets.size} to 4+ activity categories`);
      if (avgYears < 2) nextSteps.push('commit to current activities for at least 2 years');
      if (ecCount < 5) nextSteps.push(`add ${5 - ecCount} more meaningful activities`);
      suggestion = `Good progress. Your strategic priorities: ${nextSteps.slice(0, 3).join('; ')}. Each improvement compounds — a stronger profile means more options and better scholarship potential.`;
    }
    suggestions.push({ persona: PERSONAS[2], suggestion });
  }

  return suggestions;
}

/* ──────────────────────── HOLISTIC SCORING ENGINE ──────────────────────── */
// Scoring logic imported from lib/scoring.ts (shared with server-side API).
// computeHolisticScore, evaluateExtracurriculars, comparativeData, and
// normalizeBucket are re-exported from the import at the top of this file.

/* ──────────────────────── SCATTERPLOT ──────────────────────── */

function getTier(score: number): 'building' | 'developing' | 'competitive' | 'elite' {
  if (score < 40) return 'building';
  if (score < 65) return 'developing';
  if (score < 85) return 'competitive';
  return 'elite';
}

const tierColors = {
  building: { fill: '#ef4444', solid: '#fca5a5' },
  developing: { fill: '#f59e0b', solid: '#fcd34d' },
  competitive: { fill: '#10b981', solid: '#6ee7b7' },
  elite: { fill: '#8b5cf6', solid: '#c4b5fd' },
};

const SCATTER_TIERS = [
  { key: 'elite', label: 'Elite', range: '85+', fill: '#8b5cf6' },
  { key: 'competitive', label: 'Competitive', range: '65–84', fill: '#10b981' },
  { key: 'developing', label: 'Developing', range: '40–64', fill: '#f59e0b' },
  { key: 'building', label: 'Building', range: '<40', fill: '#ef4444' },
] as const;

function Scatterplot({ userGpa, userSat }: { userGpa: number; userSat: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Wide, roomy canvas so all 52 points spread out and nothing overlaps.
  const W = 720, H = 460;
  const PAD = { top: 22, right: 26, bottom: 58, left: 62 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const xMin = 2.4, xMax = 4.2, yMin = 800, yMax = 1600;
  const toX = (gpa: number) => PAD.left + ((gpa - xMin) / (xMax - xMin)) * plotW;
  const toY = (sat: number) => PAD.top + plotH - ((sat - yMin) / (yMax - yMin)) * plotH;
  const hasUser = userGpa > 0 && userSat > 0;

  const active = selected ?? hovered;

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair" onClick={(e) => {
        if ((e.target as Element).tagName !== 'circle') setSelected(null);
      }}>
        <defs>
          <linearGradient id="chart-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#f8fafc" /></linearGradient>
          <radialGradient id="user-glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" /></radialGradient>
          <radialGradient id="user-dot-grad" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#c4b5fd" /><stop offset="100%" stopColor="#7c3aed" /></radialGradient>
        </defs>
        <rect x="0" y="0" width={W} height={H} rx="16" fill="url(#chart-bg)" />

        {/* Single, subtle "strong-profile" target zone in the top-right (high GPA
            + high SAT). One non-overlapping tint replaces the four muddy boxes. */}
        <rect x={toX(3.6)} y={PAD.top} width={PAD.left + plotW - toX(3.6)} height={toY(1400) - PAD.top} fill="#8b5cf6" opacity="0.06" rx="8" />
        <text x={PAD.left + plotW - 8} y={PAD.top + 15} textAnchor="end" className="text-[9px] font-bold tracking-wide" fill="#8b5cf6" opacity="0.6">TOP-TIER RANGE</text>

        {/* Grid lines */}
        {[2.5, 3.0, 3.5, 4.0].map((g) => (<line key={`gx-${g}`} x1={toX(g)} y1={PAD.top} x2={toX(g)} y2={PAD.top + plotH} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4 8" />))}
        {[900, 1000, 1100, 1200, 1300, 1400, 1500].map((s) => (<line key={`gy-${s}`} x1={PAD.left} y1={toY(s)} x2={PAD.left + plotW} y2={toY(s)} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4 8" />))}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="#cbd5e1" strokeWidth="1" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="#cbd5e1" strokeWidth="1" />

        {/* Axis labels */}
        {[2.5, 3.0, 3.5, 4.0].map((g) => (<text key={`xl-${g}`} x={toX(g)} y={PAD.top + plotH + 22} textAnchor="middle" className="text-[11px] font-medium" fill="#64748b">{g.toFixed(1)}</text>))}
        <text x={PAD.left + plotW / 2} y={H - 8} textAnchor="middle" className="text-[12px] font-bold" fill="#7c3aed">GPA (weighted)</text>
        {[800, 1000, 1200, 1400, 1600].map((s) => (<text key={`yl-${s}`} x={PAD.left - 10} y={toY(s) + 4} textAnchor="end" className="text-[11px] font-medium" fill="#64748b">{s}</text>))}
        <text x={16} y={PAD.top + plotH / 2} textAnchor="middle" className="text-[12px] font-bold" fill="#7c3aed" transform={`rotate(-90, 16, ${PAD.top + plotH / 2})`}>SAT Score</text>

        {/* Comparative dots — colored by tier. A white halo keeps overlapping
            dots visually separable. */}
        {comparativeData.map((d, i) => {
          const tier = getTier(d.score);
          const color = tierColors[tier];
          const isActive = active === i;
          return (
            <g key={i}>
              {isActive && <circle cx={toX(d.gpa)} cy={toY(d.sat)} r="15" fill={color.fill} opacity="0.2" />}
              <circle cx={toX(d.gpa)} cy={toY(d.sat)} r={isActive ? 6.5 : 5.5} fill="white" opacity="0.85" />
              <circle
                cx={toX(d.gpa)} cy={toY(d.sat)} r={isActive ? 6 : 5}
                fill={color.fill} opacity={isActive ? 1 : 0.8}
                stroke={isActive ? color.solid : 'white'} strokeWidth={isActive ? 1.5 : 0.75}
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={(e) => { e.stopPropagation(); setSelected(selected === i ? null : i); }}
              />
            </g>
          );
        })}

        {/* User position */}
        {hasUser && (
          <g>
            <circle cx={toX(userGpa)} cy={toY(userSat)} r="28" fill="url(#user-glow)">
              <animate attributeName="r" values="26;32;26" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.4;0.8" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx={toX(userGpa)} cy={toY(userSat)} r="9" fill="url(#user-dot-grad)" />
            <circle cx={toX(userGpa)} cy={toY(userSat)} r="9" fill="none" stroke="white" strokeWidth="2" opacity="0.9" />
            <circle cx={toX(userGpa) - 2} cy={toY(userSat) - 2} r="2.5" fill="white" opacity="0.4" />
            <rect x={toX(userGpa) + 13} y={toY(userSat) - 11} width="34" height="22" rx="6" fill="#7c3aed" opacity="0.95" />
            <text x={toX(userGpa) + 30} y={toY(userSat) + 4} textAnchor="middle" className="text-[10px] font-extrabold" fill="white">You</text>
          </g>
        )}

        {/* Tooltip for active dot */}
        {active !== null && (() => {
          const d = comparativeData[active];
          const tier = getTier(d.score);
          const color = tierColors[tier];
          const tx = toX(d.gpa);
          const ty = toY(d.sat);
          const flipX = tx > W - 130;
          const flipY = ty < 80;
          const bx = flipX ? tx - 122 : tx + 12;
          const by = flipY ? ty + 16 : ty - 56;
          return (
            <g>
              <rect x={bx} y={by} width="112" height="50" rx="8" fill="rgba(255,255,255,0.97)" stroke={color.fill} strokeWidth="1" />
              <text x={bx + 8} y={by + 16} className="text-[10px] font-bold" fill={color.fill}>Score: {d.score}</text>
              <text x={bx + 8} y={by + 30} className="text-[9px] font-medium" fill="#64748b">GPA {d.gpa.toFixed(1)} · SAT {d.sat}</text>
              <text x={bx + 8} y={by + 43} className="text-[9px] font-semibold" fill={color.fill} style={{ textTransform: 'capitalize' }}>{tier}</text>
            </g>
          );
        })()}
      </svg>

      {/* Legend — moved OUT of the plot so it never covers data points */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
        {SCATTER_TIERS.map((t) => (
          <span key={t.key} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.fill }} />
            {t.label} <span className="text-slate-400">({t.range})</span>
          </span>
        ))}
        {hasUser && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600">
            <span className="w-2.5 h-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: '#7c3aed' }} />
            You
          </span>
        )}
      </div>

      {/* Bottom stats summary */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]">
        <span className="text-slate-400">{comparativeData.length} students tracked</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-400">Hover or tap any dot for details</span>
      </div>
    </div>
  );
}

/* ──────────────────────── SCORE RING ──────────────────────── */

function ScoreRing({ score, label, size = 100, color = '#6366f1', glowColor }: { score: number; label: string; size?: number; color?: string; glowColor?: string }) {
  const r = (size - 14) / 2;
  const c = Math.PI * 2 * r;
  const offset = c - (score / 100) * c;
  const glow = glowColor || color;
  const tier = score >= 80 ? 'Excellent' : score >= 60 ? 'Strong' : score >= 40 ? 'Building' : 'Start Here';
  const tierColor = score >= 80 ? '#34d399' : score >= 60 ? '#a78bfa' : score >= 40 ? '#fbbf24' : '#94a3b8';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={`ring-grad-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={glow} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" opacity="1" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#ring-grad-${label.replace(/\s/g, '')})`} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-1000" />
        </svg>
        {/* The ring keeps its vivid brand color (a graphic, exempt from text
            contrast rules); the numeral and tier read in high-contrast ink so
            they stay legible in both themes. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold font-display viz-numeral">{score}</span>
          <span className="text-[8px] font-bold uppercase tracking-widest viz-caption">{tier}</span>
        </div>
      </div>
      <p className="text-xs font-bold text-slate-400 text-center tracking-wide">{label}</p>
    </div>
  );
}

/* ──────────────────────── DESCRIPTION SUGGESTIONS COMPONENT ──────────────────────── */

function DescriptionSuggestions({
  description,
  name,
  role,
  category,
  onApply,
}: {
  description: string;
  name: string;
  role: string;
  category: string;
  onApply: (newDesc: string) => void;
}) {
  const result = useMemo(() => generateRevisions(description, name, role, category), [description, name, role, category]);
  if (!result) return null;

  const { polished, concise, tips, template } = result;
  const hasSuggestions = polished || concise || tips.length > 0;

  return (
    <div className="mt-2 space-y-2">
      {/* Template hint (always visible) */}
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Strong description template</p>
        <p className="text-xs text-slate-500 italic leading-relaxed">{template}</p>
      </div>

      {hasSuggestions && (
        <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
          <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider mb-2">Suggested revisions</p>

          {polished && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-indigo-600">Polished version</span>
                <button
                  onClick={() => onApply(polished)}
                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                >
                  Use this
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-white/60 rounded p-2">{polished}</p>
            </div>
          )}

          {concise && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-purple-600">Concise version</span>
                <button
                  onClick={() => onApply(concise)}
                  className="text-[10px] font-semibold text-purple-600 hover:text-purple-800 underline underline-offset-2"
                >
                  Use this
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-white/60 rounded p-2">{concise}</p>
            </div>
          )}

          {tips.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 mb-1">Tips to improve</p>
              <ul className="space-y-1">
                {tips.map((tip, i) => (
                  <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                    <span className="text-indigo-400 mt-0.5 flex-shrink-0">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */

export default function StudentProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  const [profile, setProfile] = useState<ProfileData>({
    gpa: '', gpaScale: '4.0', gpaWeighted: '', satMath: '', satRW: '', actScore: '', extracurriculars: [],
  });

  const [showAddEC, setShowAddEC] = useState(false);
  const [newEC, setNewEC] = useState<Omit<Extracurricular, 'id'>>({
    name: '', role: '', description: '', years: 0, hoursPerWeek: 0, category: 'Clubs',
  });
  const [editingEcId, setEditingEcId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');

  const [scored, setScored] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showPersonas, setShowPersonas] = useState(true);

  // Load profile
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if (data.profile) {
          const p = data.profile;
          setProfile({
            gpa: p.gpa != null ? p.gpa.toString() : '',
            gpaScale: (p.gpaScale as '4.0' | '5.0') || '4.0',
            gpaWeighted: p.gpaWeighted != null ? p.gpaWeighted.toString() : '',
            satMath: p.satMath != null ? p.satMath.toString() : '',
            satRW: p.satRW != null ? p.satRW.toString() : '',
            actScore: p.actScore != null ? p.actScore.toString() : '',
            extracurriculars: (p.extracurriculars as Extracurricular[]) || [],
          });
          if (p.holisticScore != null) setScored(true);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [status]);

  const results = useMemo(() => computeHolisticScore({
    ...profile,
    gpaWeighted: profile.gpaWeighted || null,
    actScore: profile.actScore || null,
  }), [profile]);
  const diversity = useMemo(() => computeDiversityScore(profile.extracurriculars), [profile.extracurriculars]);
  const depth = useMemo(() => computeDepthScore(profile.extracurriculars), [profile.extracurriculars]);
  const personaSuggestions = useMemo(() => generatePersonaSuggestions({
    gpa: profile.gpa,
    gpaScale: profile.gpaScale,
    gpaWeighted: profile.gpaWeighted,
    satMath: profile.satMath,
    satRW: profile.satRW,
    actScore: profile.actScore,
    ecs: profile.extracurriculars,
  }), [profile]);

  // Group ECs by bucket
  const ecsByBucket = useMemo(() => {
    const grouped: Record<string, Extracurricular[]> = {};
    for (const ec of profile.extracurriculars) {
      const bucket = normalizeBucket(ec.category);
      if (!grouped[bucket]) grouped[bucket] = [];
      grouped[bucket].push(ec);
    }
    return grouped;
  }, [profile.extracurriculars]);

  // Save profile
  const saveProfile = useCallback(async (showScore: boolean) => {
    setSaving(true);
    const res = computeHolisticScore(profile);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gpa: profile.gpa || null,
          gpaScale: profile.gpaScale,
          gpaWeighted: profile.gpaWeighted || null,
          satMath: profile.satMath || null,
          satRW: profile.satRW || null,
          actScore: profile.actScore || null,
          extracurriculars: profile.extracurriculars,
          holisticScore: showScore ? res.holistic : null,
          percentile: showScore ? res.percentile : null,
          gpaScore: showScore ? res.gpaScore : null,
          satScore: showScore ? res.satScore : null,
          ecScore: showScore ? res.ecScore : null,
        }),
      });
    } catch (e) { /* silent */ }
    setSaving(false);
    tracker.feature('profile', 'save', { ecCount: profile.extracurriculars.length, scored: showScore });
  }, [profile]);

  const addExtracurricular = () => {
    if (!newEC.name.trim()) return;
    const years = newEC.years || 1;
    const hoursPerWeek = newEC.hoursPerWeek || 1;
    setProfile(prev => ({
      ...prev,
      extracurriculars: [...prev.extracurriculars, { ...newEC, years, hoursPerWeek, id: `ec_${Date.now()}` }],
    }));
    setNewEC({ name: '', role: '', description: '', years: 0, hoursPerWeek: 0, category: 'Clubs' });
    setShowAddEC(false);
  };

  const removeEC = (id: string) => {
    if (!window.confirm('Remove this activity? This cannot be undone.')) return;
    setProfile(prev => ({ ...prev, extracurriculars: prev.extracurriculars.filter(ec => ec.id !== id) }));
    if (editingEcId === id) setEditingEcId(null);
  };

  const updateEC = (id: string, updates: Partial<Extracurricular>) => {
    setProfile(prev => ({
      ...prev,
      extracurriculars: prev.extracurriculars.map(ec => ec.id === id ? { ...ec, ...updates } : ec),
    }));
  };

  const updateECDescription = (id: string, description: string) => {
    updateEC(id, { description });
  };

  const startEditEC = (ec: Extracurricular) => {
    setEditingEcId(ec.id);
    setEditDescription(ec.description);
  };

  const saveEditEC = () => {
    if (editingEcId) {
      updateECDescription(editingEcId, editDescription);
      setEditingEcId(null);
    }
  };

  // Full edit mode for an activity
  const [fullEditId, setFullEditId] = useState<string | null>(null);
  const [fullEditData, setFullEditData] = useState<Extracurricular | null>(null);

  const startFullEdit = (ec: Extracurricular) => {
    setFullEditId(ec.id);
    setFullEditData({ ...ec });
  };

  const saveFullEdit = () => {
    if (fullEditId && fullEditData) {
      updateEC(fullEditId, fullEditData);
      setFullEditId(null);
      setFullEditData(null);
    }
  };

  // Auto-save
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => { saveProfile(scored); }, 1500);
    return () => clearTimeout(timer);
  }, [profile, scored, loaded, saveProfile]);

  if (status !== 'authenticated') return null;

  const totalSAT = (parseInt(profile.satMath) || 0) + (parseInt(profile.satRW) || 0);
  const activeBuckets = EC_BUCKETS.filter(b => ecsByBucket[b.key]?.length);

  return (
    <DashboardLayout>
      <Head><title>My Profile | AdmitsOnly Dashboard</title></Head>

      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">My Profile</h1>
            <p className="mt-1 text-slate-500">Track your activities, build your profile, and get personalized guidance.</p>
          </div>
          {saving && <span className="text-xs text-slate-400 animate-pulse">Saving...</span>}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          {/* ─── INPUT COLUMN ─── */}
          <div className="space-y-6">
            {/* Academic Stats */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="text-lg font-bold font-display text-primary mb-5">Academic Stats</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">GPA</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input type="number" step="0.01" min="0" max="4.0" value={profile.gpa} onChange={(e) => setProfile({ ...profile, gpa: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" placeholder="e.g. 3.85" />
                      <p className="text-[11px] text-slate-400 mt-1">Unweighted (out of 4.0)</p>
                    </div>
                    <div>
                      <input type="number" step="0.01" min="0" max="5.0" value={profile.gpaWeighted} onChange={(e) => setProfile({ ...profile, gpaWeighted: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" placeholder="e.g. 4.35" />
                      <p className="text-[11px] text-slate-400 mt-1">Weighted (out of 5.0)</p>
                    </div>
                  </div>
                  {parseFloat(profile.gpaWeighted) > parseFloat(profile.gpa) && parseFloat(profile.gpa) > 0 && (
                    <p className="text-[11px] text-accent font-semibold mt-2">Course rigor bonus applied for AP/Honors coursework</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">SAT Scores</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input type="number" min="200" max="800" value={profile.satMath} onChange={(e) => setProfile({ ...profile, satMath: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" placeholder="Math (200-800)" />
                      <p className="text-[11px] text-slate-400 mt-1">Math</p>
                    </div>
                    <div>
                      <input type="number" min="200" max="800" value={profile.satRW} onChange={(e) => setProfile({ ...profile, satRW: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" placeholder="R&W (200-800)" />
                      <p className="text-[11px] text-slate-400 mt-1">Reading & Writing</p>
                    </div>
                  </div>
                  {totalSAT > 0 && <p className="text-xs text-accent font-semibold mt-2">Total: {totalSAT} / 1600</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">ACT Composite</label>
                  <input type="number" min="1" max="36" value={profile.actScore} onChange={(e) => setProfile({ ...profile, actScore: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" placeholder="1-36" />
                  {parseInt(profile.actScore) > 0 && totalSAT > 0 && (
                    <p className="text-[11px] text-slate-400 mt-1">Best score used for matching (SAT {totalSAT} vs ACT {profile.actScore})</p>
                  )}
                </div>
              </div>
            </div>

            {/* ─── ACTIVITY TRACKER WITH BUCKETS ─── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold font-display text-primary">Activity Tracker</h3>
                  {profile.extracurriculars.length > 0 && (
                    <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-bold rounded-full">
                      {profile.extracurriculars.length} {profile.extracurriculars.length === 1 ? 'activity' : 'activities'}
                    </span>
                  )}
                </div>
                <button onClick={() => setShowAddEC(true)} className="px-3 py-1.5 text-xs font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition-colors">
                  + Add Activity
                </button>
              </div>

              {/* Empty state */}
              {profile.extracurriculars.length === 0 && !showAddEC && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  </div>
                  <p className="text-sm text-slate-500">Add your activities, clubs, sports, and volunteer work.</p>
                  <p className="text-xs text-slate-400 mt-1">Activities are grouped by category so you can track your profile balance.</p>
                </div>
              )}

              {/* Bucket-grouped EC display */}
              <div className="space-y-4">
                {activeBuckets.map(bucket => {
                  const ecs = ecsByBucket[bucket.key] || [];
                  return (
                    <div key={bucket.key} className="space-y-2">
                      {/* Bucket header */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${bucket.light} ${bucket.border} border`}>
                        <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: bucket.ring }} />
                        <span className={`text-xs font-bold ${bucket.text}`}>{bucket.label}</span>
                        <span className={`text-[10px] font-medium ${bucket.text} opacity-60`}>({ecs.length})</span>
                      </div>

                      {/* EC cards in this bucket */}
                      {ecs.map(ec => (
                        <div key={ec.id} className={`ml-2 p-4 rounded-xl bg-surface border ${bucket.border} group transition-all`}>
                          {fullEditId === ec.id && fullEditData ? (
                            /* ── Full Edit Form ── */
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input type="text" value={fullEditData.name} onChange={e => setFullEditData({ ...fullEditData, name: e.target.value })} placeholder="Activity name" className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                                <input type="text" value={fullEditData.role} onChange={e => setFullEditData({ ...fullEditData, role: e.target.value })} placeholder="Your role" className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                              </div>
                              <textarea
                                value={fullEditData.description}
                                onChange={e => setFullEditData({ ...fullEditData, description: e.target.value })}
                                rows={3}
                                placeholder="Describe your involvement..."
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                              />
                              <DescriptionSuggestions
                                description={fullEditData.description}
                                name={fullEditData.name}
                                role={fullEditData.role}
                                category={fullEditData.category}
                                onApply={d => setFullEditData({ ...fullEditData, description: d })}
                              />
                              <div className="grid grid-cols-3 gap-3">
                                <select value={fullEditData.category} onChange={e => setFullEditData({ ...fullEditData, category: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30">
                                  {EC_BUCKETS.map(b => (<option key={b.key} value={b.key}>{b.label}</option>))}
                                </select>
                                <div>
                                  <input type="number" min="1" max="12" value={fullEditData.years || ''} onChange={e => setFullEditData({ ...fullEditData, years: e.target.value === '' ? 0 : Math.min(12, Math.max(0, parseInt(e.target.value) || 0)) })} placeholder="Years" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                                  <p className="text-[10px] text-slate-400 mt-0.5">Years</p>
                                </div>
                                <div>
                                  <input type="number" min="1" max="40" value={fullEditData.hoursPerWeek || ''} onChange={e => setFullEditData({ ...fullEditData, hoursPerWeek: e.target.value === '' ? 0 : Math.min(40, Math.max(0, parseInt(e.target.value) || 0)) })} placeholder="Hrs/wk" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                                  <p className="text-[10px] text-slate-400 mt-0.5">Hrs/week</p>
                                </div>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => { setFullEditId(null); setFullEditData(null); }} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">Cancel</button>
                                <button onClick={saveFullEdit} className="px-3 py-1.5 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors">Save Changes</button>
                              </div>
                            </div>
                          ) : (
                            /* ── Normal Display ── */
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-semibold text-primary">{ec.name}</p>
                                </div>
                                <p className="text-xs text-slate-600 font-medium">{ec.role}</p>

                                {/* Description — inline edit mode */}
                                {editingEcId === ec.id ? (
                                  <div className="mt-2">
                                    <textarea
                                      value={editDescription}
                                      onChange={e => setEditDescription(e.target.value)}
                                      rows={3}
                                      className="w-full px-3 py-2 rounded-lg border border-accent/30 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                                      autoFocus
                                    />
                                    <DescriptionSuggestions
                                      description={editDescription}
                                      name={ec.name}
                                      role={ec.role}
                                      category={ec.category}
                                      onApply={(d) => setEditDescription(d)}
                                    />
                                    <div className="flex gap-2 mt-2">
                                      <button onClick={() => setEditingEcId(null)} className="text-[11px] text-slate-400 hover:text-slate-600">Cancel</button>
                                      <button onClick={saveEditEC} className="text-[11px] text-accent font-semibold hover:text-accent/80">Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ec.description}</p>
                                )}

                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                  <p className="text-[11px] text-slate-400">{ec.years} yr{ec.years !== 1 ? 's' : ''} &middot; {ec.hoursPerWeek} hrs/wk</p>
                                  {editingEcId !== ec.id && (
                                    <button onClick={() => startEditEC(ec)} className="text-[10px] text-indigo-500 font-semibold hover:text-indigo-700 transition-opacity">
                                      Improve description
                                    </button>
                                  )}
                                </div>
                              </div>
                              {/* Always-visible action buttons */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => startFullEdit(ec)} className="p-1.5 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" title="Edit activity">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => removeEC(ec.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove activity">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* ─── ADD ACTIVITY FORM ─── */}
              {showAddEC && (
                <div className="mt-4 p-4 rounded-xl bg-accent/5 border border-accent/10 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={newEC.name} onChange={e => setNewEC({ ...newEC, name: e.target.value })} placeholder="Activity name" className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                    <input type="text" value={newEC.role} onChange={e => setNewEC({ ...newEC, role: e.target.value })} placeholder="Your role (e.g. President)" className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                  </div>
                  <textarea
                    value={newEC.description}
                    onChange={e => setNewEC({ ...newEC, description: e.target.value })}
                    placeholder="Describe your involvement and impact..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                  />

                  {/* Live description suggestions */}
                  <DescriptionSuggestions
                    description={newEC.description}
                    name={newEC.name}
                    role={newEC.role}
                    category={newEC.category}
                    onApply={d => setNewEC({ ...newEC, description: d })}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <select value={newEC.category} onChange={e => setNewEC({ ...newEC, category: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30">
                      {EC_BUCKETS.map(b => (<option key={b.key} value={b.key}>{b.label}</option>))}
                    </select>
                    <div>
                      <input type="number" min="1" max="12" value={newEC.years || ''} onChange={e => setNewEC({ ...newEC, years: e.target.value === '' ? 0 : Math.min(12, Math.max(0, parseInt(e.target.value) || 0)) })} placeholder="1-12" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                      <p className="text-[10px] text-slate-400 mt-0.5">Years</p>
                    </div>
                    <div>
                      <input type="number" min="1" max="40" value={newEC.hoursPerWeek || ''} onChange={e => setNewEC({ ...newEC, hoursPerWeek: e.target.value === '' ? 0 : Math.min(40, Math.max(0, parseInt(e.target.value) || 0)) })} placeholder="1-40" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                      <p className="text-[10px] text-slate-400 mt-0.5">Hrs/week</p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowAddEC(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
                    <button onClick={addExtracurricular} className="px-4 py-2 text-sm font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors">Add Activity</button>
                  </div>
                </div>
              )}
            </div>

            {/* Evaluate button */}
            <button
              onClick={() => { setScored(true); saveProfile(true); }}
              disabled={!profile.gpa && !profile.satMath}
              className="btn-primary w-full text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Evaluate My Profile
            </button>
          </div>

          {/* ─── RESULTS COLUMN ─── */}
          <div className="space-y-6">

            {/* ─── EC SCOREBOARD (always visible when there are ECs) ─── */}
            {profile.extracurriculars.length > 0 && (
              <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="relative text-lg font-bold font-display text-slate-800 mb-5">Activity Scoreboard</h3>

                <div className="relative flex items-center justify-around gap-4 mb-6">
                  <ScoreRing score={diversity.score} label="Diversity" size={95} color="#a78bfa" glowColor="#c4b5fd" />
                  <ScoreRing score={depth.score} label="Depth" size={95} color="#22d3ee" glowColor="#67e8f9" />
                  <ScoreRing score={results.ecScore} label="Overall EC" size={95} color="#34d399" glowColor="#6ee7b7" />
                </div>

                {/* Category coverage bar */}
                <div className="relative mb-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Category Coverage ({diversity.filledBuckets}/{diversity.totalBuckets})</p>
                  <div className="flex gap-1.5">
                    {EC_BUCKETS.map(b => {
                      const filled = ecsByBucket[b.key]?.length > 0;
                      return (
                        <div key={b.key} className="flex-1 group relative">
                          <div className={`h-3 rounded-full transition-all ${filled ? '' : 'bg-slate-100'}`} style={filled ? { backgroundColor: b.ring } : undefined} />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                            <span className="text-[9px] bg-white text-slate-800 px-2 py-0.5 rounded shadow-sm whitespace-nowrap">{b.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Feedback */}
                <div className="relative space-y-2">
                  <div className="p-3 rounded-xl bg-violet-50 border border-violet-200">
                    <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider">Diversity</p>
                    <p className="text-xs text-violet-700 mt-0.5">{diversity.feedback}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200">
                    <p className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wider">Depth</p>
                    <p className="text-xs text-cyan-700 mt-0.5">{depth.feedback}</p>
                  </div>
                </div>

                {/* Missing categories */}
                {diversity.missing.length > 0 && diversity.missing.length <= 4 && (
                  <div className="relative mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1.5">Consider adding</p>
                    <div className="flex flex-wrap gap-1.5">
                      {diversity.missing.map(cat => (
                        <span key={cat} className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded-full border border-amber-200">{cat}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── PERSONALIZED SUGGESTIONS ─── */}
            <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold font-display text-primary">Expert Guidance</h3>
                  <p className="text-[11px] mt-0.5 text-slate-400">Personalized advice based on your current profile</p>
                </div>
                <button
                  onClick={() => setShowPersonas(!showPersonas)}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors text-violet-600"
                >
                  {showPersonas ? 'Collapse' : 'Expand'}
                </button>
              </div>

              {showPersonas && (
                <div className="relative space-y-3">
                  {personaSuggestions.map((ps, i) => (
                    <div key={i} className="group p-4 rounded-xl bg-white border border-slate-100 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-xs flex-shrink-0">
                          {ps.persona.emoji}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${ps.persona.color}`}>{ps.persona.name}</p>
                          <p className="text-[10px] font-medium text-slate-400">{ps.persona.title}</p>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed pl-[52px] text-slate-600">{ps.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── HOLISTIC EVALUATION ─── */}
            {!scored ? (
              <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold font-display text-slate-800">Your Evaluation Awaits</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">Fill in your GPA, SAT scores, and extracurriculars, then click &ldquo;Evaluate My Profile&rdquo; to see your holistic score.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-6">
                  <h3 className="relative text-lg font-bold font-display text-slate-800 mb-5">Holistic Evaluation</h3>
                  <div className="relative flex items-center justify-around gap-4">
                    <ScoreRing score={results.holistic} label="Overall Score" size={115} color="#a78bfa" glowColor="#c4b5fd" />
                    <ScoreRing score={results.percentile} label="Percentile" size={115} color="#34d399" glowColor="#6ee7b7" />
                  </div>

                  <div className="relative mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Score Breakdown</p>
                    <div className="space-y-3">
                      {[
                        { label: 'GPA', score: results.gpaScore, weight: '33%', color: 'bg-violet-500' },
                        { label: 'Test Scores', score: results.satScore, weight: '28%', color: 'bg-fuchsia-500' },
                        { label: 'Extracurriculars', score: results.ecScore, weight: '34%', color: 'bg-emerald-400' },
                      ].map(item => (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-medium text-slate-700">{item.label} <span className="text-slate-400 text-xs">({item.weight})</span></span>
                            <span className="font-bold text-slate-800">{item.score}<span className="text-slate-400 text-xs">/100</span></span>
                          </div>
                          <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${item.score}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(results.rigorBonus > 0 || results.actEquivalent > 0) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {results.rigorBonus > 0 && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-violet-50 text-violet-600 border border-violet-200">
                          +{results.rigorBonus} rigor bonus
                        </span>
                      )}
                      {results.actEquivalent > 0 && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200">
                          ACT {results.actEquivalent} equivalent
                        </span>
                      )}
                      {results.bestTestScore > 0 && results.bestTestScore !== results.totalSAT && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-50 text-cyan-600 border border-cyan-200">
                          Best: {results.bestTestScore} SAT-eq
                        </span>
                      )}
                    </div>
                  )}

                  <div className="relative mt-4 p-4 rounded-xl bg-violet-50 border border-violet-200">
                    <p className="text-sm font-semibold text-slate-800">
                      You&apos;re in the <span className="text-violet-600 font-extrabold">{results.percentile}th percentile</span> compared to {comparativeData.length} students on the platform.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {results.percentile >= 80 ? 'Excellent position for top-tier universities.' :
                       results.percentile >= 60 ? 'Strong profile with room for strategic improvement.' :
                       results.percentile >= 40 ? 'Solid foundation — focus on extracurriculars and test prep.' :
                       'Great starting point. Let\'s build a plan to boost your profile.'}
                    </p>
                  </div>

                  {results.ecFeedback && (
                    <div className="relative mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">AI Extracurricular Assessment</p>
                      <p className="text-sm text-emerald-700">{results.ecFeedback}</p>
                    </div>
                  )}
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6">
                  <h3 className="text-lg font-bold font-display text-slate-800 mb-1">Where You Stand</h3>
                  <p className="text-xs text-slate-500 mb-4">Your position vs. other AdmitsOnly students.</p>
                  <Scatterplot userGpa={results.normalizedGpa} userSat={results.totalSAT} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Connection Code Section */}
        <ConnectionCodeSection />
      </div>
    </DashboardLayout>
  );
}

/* ──────────────────────── CONNECTION CODE ──────────────────────── */

function ConnectionCodeSection() {
  const [code, setCode] = useState('');
  const [connections, setConnections] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/connection-code')
      .then(r => r.json())
      .then(data => {
        setCode(data.code || '');
        setConnections(data.connectionsAsStudent || []);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRemove = async (id: string) => {
    await fetch('/api/connection-code', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId: id }),
    });
    setConnections(prev => prev.filter(c => c.id !== id));
  };

  if (!loaded) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">Your Connection Code</h3>
          <p className="text-xs text-slate-400">Share with parents or tutors so they can track your progress</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 px-5 py-3 text-center">
          <p className="text-xl font-mono font-bold text-primary tracking-[0.3em]">{code}</p>
        </div>
        <button
          onClick={handleCopy}
          className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
            copied ? 'bg-emerald-50 text-emerald-600' : 'bg-accent text-white hover:bg-accent/90'
          }`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {connections.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Connected Accounts</p>
          <div className="space-y-2">
            {connections.map((conn: any) => (
              <div key={conn.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                    conn.role === 'parent' ? 'bg-teal-500' : 'bg-purple-500'
                  }`}>
                    {(conn.connectedName || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">{conn.connectedName}</p>
                    <p className="text-[10px] text-slate-400">{conn.role === 'parent' ? 'Parent' : 'Tutor'}</p>
                  </div>
                </div>
                <button onClick={() => handleRemove(conn.id)} className="text-xs text-slate-400 hover:text-red-500">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-accent/5 rounded-xl border border-accent/10">
        <p className="text-xs text-slate-500">
          <span className="font-semibold">What they&apos;ll see:</span> Parents see your application progress, deadlines, and task completion.
          Tutors see essay titles and scores. Neither can see your essay content or personal notes.
        </p>
      </div>
    </div>
  );
}
