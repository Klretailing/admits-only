import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';
import { computeHolisticScore, evaluateExtracurriculars, comparativeData, normalizeBucket as normalizeBucketShared } from '../../lib/scoring';
import type { Extracurricular as ExtracurricularType } from '../../lib/scoring';

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
  satMath: string;
  satRW: string;
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
}

const PERSONAS: Persona[] = [
  { name: 'Coach Jordan', title: 'Student Success Coach', color: 'text-blue-700', avatarBg: 'from-blue-400 to-blue-600' },
  { name: 'Dr. Mehta', title: 'Former Ivy Admissions Reader', color: 'text-purple-700', avatarBg: 'from-purple-400 to-purple-600' },
  { name: 'Sophia Chen', title: 'Stanford Junior, Peer Mentor', color: 'text-pink-700', avatarBg: 'from-pink-400 to-pink-600' },
  { name: 'Prof. Williams', title: 'Research Director, MIT', color: 'text-cyan-700', avatarBg: 'from-cyan-400 to-cyan-600' },
  { name: 'Ms. Torres', title: 'College Counselor (15 yrs)', color: 'text-amber-700', avatarBg: 'from-amber-400 to-amber-600' },
];

interface PersonaSuggestion {
  persona: Persona;
  suggestion: string;
}

function generatePersonaSuggestions(ecs: Extracurricular[]): PersonaSuggestion[] {
  const suggestions: PersonaSuggestion[] = [];
  const buckets = new Set(ecs.map(ec => normalizeBucket(ec.category)));
  const avgYears = ecs.length > 0 ? ecs.reduce((s, e) => s + e.years, 0) / ecs.length : 0;
  const hasLeadership = ecs.some(ec => /(?:president|founder|captain|leader|chair|director|head|editor|chief)/i.test(ec.role));
  const hasResearch = buckets.has('Research');
  const hasVolunteering = buckets.has('Volunteering');
  const hasSport = buckets.has('Sport');
  const hasInternship = buckets.has('Internship');
  const ecCount = ecs.length;

  // Coach Jordan
  if (ecCount === 0) {
    suggestions.push({ persona: PERSONAS[0], suggestion: "Start by listing any activities you do regularly — even informal ones count. Tutoring a neighbor, managing a social media page, or organizing pickup games all show initiative. Let's build from there." });
  } else if (!hasSport && buckets.size < 3) {
    suggestions.push({ persona: PERSONAS[0], suggestion: "Consider adding a physical activity or sport — it shows discipline and teamwork. Even intramural or recreational sports count. Colleges want to see you can balance academics with a full life." });
  } else if (hasSport && buckets.size < 3) {
    suggestions.push({ persona: PERSONAS[0], suggestion: "Athletic commitment is great, but show some range. Add a community service activity or join a club related to your academic interests. It shows you're more than just an athlete." });
  } else {
    suggestions.push({ persona: PERSONAS[0], suggestion: "Good balance so far. Now think about which 2-3 activities you want to be your 'headline' — the ones that tell your story. Deepen those with leadership roles or tangible projects." });
  }

  // Dr. Mehta
  if (!hasLeadership && ecCount >= 3) {
    suggestions.push({ persona: PERSONAS[1], suggestion: "I notice no leadership titles yet. Admissions committees look for progression — have you moved from member to officer in any activity? Seek out a leadership role. Even 'project lead' or 'team captain' shows initiative." });
  } else if (hasLeadership && !hasVolunteering) {
    suggestions.push({ persona: PERSONAS[1], suggestion: "Leadership is strong, but I'm not seeing community engagement. Top applicants demonstrate they use their skills to serve others. Even 5 hours/month of volunteering adds an important dimension." });
  } else if (buckets.size >= 5 && hasLeadership) {
    suggestions.push({ persona: PERSONAS[1], suggestion: "Excellent range and leadership. Now focus on deepening your 'spike' — the one area that makes you unforgettable. Admissions officers remember the student who went deep, not the one who did everything." });
  } else if (ecCount < 3) {
    suggestions.push({ persona: PERSONAS[1], suggestion: "Most competitive applicants list 8-10 activities. Aim for at least 5 meaningful ones. Think beyond traditional clubs — personal projects, self-taught skills, and family responsibilities all count." });
  } else {
    suggestions.push({ persona: PERSONAS[1], suggestion: "Solid foundation. The differentiator at top schools is impact — not just participation, but tangible outcomes. For each activity, ask: 'What changed because I was there?'" });
  }

  // Sophia Chen
  if (ecCount === 0) {
    suggestions.push({ persona: PERSONAS[2], suggestion: "Don't stress — I started building my profile sophomore year. The key is picking things you genuinely enjoy. Forced activities show through in interviews. What do you do when you're NOT studying?" });
  } else if (avgYears < 2) {
    suggestions.push({ persona: PERSONAS[2], suggestion: "Real talk: admissions can tell when you joined everything junior year. If you're newer to these activities, that's okay — but commit now and show growth by senior year. Continuity matters more than quantity." });
  } else if (!hasResearch && !hasInternship) {
    suggestions.push({ persona: PERSONAS[2], suggestion: "Have you considered cold-emailing professors or startups for a research or internship spot? I emailed 12 professors before one said yes, and that experience became my personal statement. Worth the effort." });
  } else {
    suggestions.push({ persona: PERSONAS[2], suggestion: "Solid profile. Start thinking about your 'narrative' — what story do your activities tell together? When I applied, my activities all connected to education equity, and that thread made my app memorable." });
  }

  // Prof. Williams
  if (hasResearch) {
    const researchEcs = ecs.filter(ec => normalizeBucket(ec.category) === 'Research');
    const avgResYears = researchEcs.reduce((s, e) => s + e.years, 0) / researchEcs.length;
    if (avgResYears >= 2) {
      suggestions.push({ persona: PERSONAS[3], suggestion: "Sustained research commitment — excellent. Have you considered submitting to a journal or presenting at a conference? Even a poster at a regional symposium demonstrates scholarly initiative." });
    } else {
      suggestions.push({ persona: PERSONAS[3], suggestion: "You've started research, which is great. Aim for 2+ years of continuous involvement. Ask your mentor about co-authoring a paper or presenting findings. That progression from learner to contributor is key." });
    }
  } else {
    suggestions.push({ persona: PERSONAS[3], suggestion: "I don't see research experience. Consider reaching out to university faculty for a mentored project. Programs like RSI, SSTP, or local university summer programs are excellent starting points for any field." });
  }

  // Ms. Torres
  if (ecCount >= 5 && buckets.size >= 4) {
    suggestions.push({ persona: PERSONAS[4], suggestion: "Your profile is shaping up nicely. Now be strategic: identify your top 3 activities and make sure their descriptions tell a story of growth. Admissions readers spend ~8 minutes per application — your list needs to pop." });
  } else if (!hasVolunteering && !hasInternship) {
    suggestions.push({ persona: PERSONAS[4], suggestion: "I'd recommend adding either volunteering or an internship before application season. These are the two categories that most commonly appear in admitted students' profiles at top 20 schools." });
  } else if (ecCount <= 2) {
    suggestions.push({ persona: PERSONAS[4], suggestion: "Let's build out your activity list. Start with what you're already doing informally — helping at a family business, tutoring, organizing events. Then add 2-3 structured activities aligned with your intended major." });
  } else {
    suggestions.push({ persona: PERSONAS[4], suggestion: "Each activity should serve one of three purposes: show leadership, show passion, or show impact. If an activity doesn't do any of those, consider replacing it with one that does." });
  }

  return suggestions;
}

/* ──────────────────────── HOLISTIC SCORING ENGINE ──────────────────────── */
// Scoring logic imported from lib/scoring.ts (shared with server-side API).
// computeHolisticScore, evaluateExtracurriculars, comparativeData, and
// normalizeBucket are re-exported from the import at the top of this file.

/* ──────────────────────── SCATTERPLOT ──────────────────────── */

function Scatterplot({ userGpa, userSat }: { userGpa: number; userSat: number }) {
  const W = 520, H = 360;
  const PAD = { top: 24, right: 34, bottom: 50, left: 58 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const xMin = 2.5, xMax = 4.2, yMin = 800, yMax = 1600;
  const toX = (gpa: number) => PAD.left + ((gpa - xMin) / (xMax - xMin)) * plotW;
  const toY = (sat: number) => PAD.top + plotH - ((sat - yMin) / (yMax - yMin)) * plotH;
  const hasUser = userGpa > 0 && userSat > 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[540px]">
      <defs>
        <linearGradient id="zone-red" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fee2e2" stopOpacity="0.7" /><stop offset="100%" stopColor="#fecaca" stopOpacity="0.3" /></linearGradient>
        <linearGradient id="zone-amber" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fef3c7" stopOpacity="0.7" /><stop offset="100%" stopColor="#fde68a" stopOpacity="0.3" /></linearGradient>
        <linearGradient id="zone-green" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#d1fae5" stopOpacity="0.7" /><stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.3" /></linearGradient>
        <radialGradient id="user-glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" /><stop offset="70%" stopColor="#6366f1" stopOpacity="0.1" /><stop offset="100%" stopColor="#6366f1" stopOpacity="0" /></radialGradient>
        <filter id="dot-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#6366f1" floodOpacity="0.3" /></filter>
        <filter id="zone-shadow" x="-2%" y="-2%" width="104%" height="104%"><feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#000" floodOpacity="0.06" /></filter>
        <radialGradient id="comp-dot" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#c7d2fe" /><stop offset="100%" stopColor="#a5b4fc" /></radialGradient>
        <radialGradient id="user-dot-grad" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#818cf8" /><stop offset="100%" stopColor="#4f46e5" /></radialGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} rx="16" fill="white" />
      <rect x={toX(xMin)} y={toY(1150)} width={toX(3.3) - toX(xMin)} height={toY(yMin) - toY(1150)} fill="url(#zone-red)" rx="8" filter="url(#zone-shadow)" />
      <text x={toX(xMin) + 8} y={toY(1150) + 16} className="text-[9px] font-bold" fill="#dc2626" opacity="0.7">Needs Improvement</text>
      <rect x={toX(3.3)} y={toY(1350)} width={toX(3.7) - toX(3.3)} height={toY(1150) - toY(1350)} fill="url(#zone-amber)" rx="8" filter="url(#zone-shadow)" />
      <text x={toX(3.3) + 8} y={toY(1350) + 16} className="text-[9px] font-bold" fill="#d97706" opacity="0.7">Developing</text>
      <rect x={toX(3.7)} y={toY(yMax)} width={toX(xMax) - toX(3.7)} height={toY(1350) - toY(yMax)} fill="url(#zone-green)" rx="8" filter="url(#zone-shadow)" />
      <text x={toX(3.7) + 8} y={toY(yMax) + 16} className="text-[9px] font-bold" fill="#059669" opacity="0.7">Competitive</text>
      {[3.0, 3.5, 4.0].map((g) => (<line key={`gx-${g}`} x1={toX(g)} y1={PAD.top} x2={toX(g)} y2={PAD.top + plotH} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4 4" />))}
      {[1000, 1200, 1400].map((s) => (<line key={`gy-${s}`} x1={PAD.left} y1={toY(s)} x2={PAD.left + plotW} y2={toY(s)} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4 4" />))}
      <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="#cbd5e1" strokeWidth="1.5" />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="#cbd5e1" strokeWidth="1.5" />
      {[2.5, 3.0, 3.5, 4.0].map((g) => (<text key={`xl-${g}`} x={toX(g)} y={PAD.top + plotH + 20} textAnchor="middle" className="text-[10px] font-medium" fill="#94a3b8">{g.toFixed(1)}</text>))}
      <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle" className="text-[11px] font-bold" fill="#6366f1">GPA</text>
      {[800, 1000, 1200, 1400, 1600].map((s) => (<text key={`yl-${s}`} x={PAD.left - 10} y={toY(s) + 4} textAnchor="end" className="text-[10px] font-medium" fill="#94a3b8">{s}</text>))}
      <text x={14} y={PAD.top + plotH / 2} textAnchor="middle" className="text-[11px] font-bold" fill="#6366f1" transform={`rotate(-90, 14, ${PAD.top + plotH / 2})`}>SAT Score</text>
      {comparativeData.map((d, i) => (<g key={i}><circle cx={toX(d.gpa)} cy={toY(d.sat)} r="5" fill="url(#comp-dot)" opacity="0.6" /><circle cx={toX(d.gpa)} cy={toY(d.sat)} r="5" fill="none" stroke="#818cf8" strokeWidth="0.5" opacity="0.3" /></g>))}
      {hasUser && (
        <g>
          <circle cx={toX(userGpa)} cy={toY(userSat)} r="20" fill="url(#user-glow)" />
          <circle cx={toX(userGpa)} cy={toY(userSat)} r="8" fill="url(#user-dot-grad)" filter="url(#dot-shadow)" />
          <circle cx={toX(userGpa)} cy={toY(userSat)} r="8" fill="none" stroke="white" strokeWidth="2.5" />
          <circle cx={toX(userGpa) - 2} cy={toY(userSat) - 2} r="2" fill="white" opacity="0.5" />
          <text x={toX(userGpa) + 14} y={toY(userSat) + 4} className="text-[11px] font-extrabold" fill="#4f46e5">You</text>
        </g>
      )}
      <g transform={`translate(${PAD.left + plotW - 140}, ${PAD.top + 4})`}>
        <rect x="0" y="0" width="138" height="58" rx="10" fill="white" stroke="#e2e8f0" filter="url(#zone-shadow)" />
        <circle cx="14" cy="14" r="5" fill="#a7f3d0" stroke="#059669" strokeWidth="1" /><text x="26" y="18" className="text-[9px] font-semibold" fill="#374151">Competitive</text>
        <circle cx="14" cy="30" r="5" fill="#fde68a" stroke="#d97706" strokeWidth="1" /><text x="26" y="34" className="text-[9px] font-semibold" fill="#374151">Developing</text>
        <circle cx="14" cy="46" r="5" fill="#fecaca" stroke="#dc2626" strokeWidth="1" /><text x="26" y="50" className="text-[9px] font-semibold" fill="#374151">Needs Improvement</text>
      </g>
    </svg>
  );
}

/* ──────────────────────── SCORE RING ──────────────────────── */

function ScoreRing({ score, label, size = 100, color = '#6366f1' }: { score: number; label: string; size?: number; color?: string }) {
  const r = (size - 12) / 2;
  const c = Math.PI * 2 * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-1000" style={{ filter: `drop-shadow(0 0 6px ${color}40)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold font-display text-primary">{score}</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-500 text-center">{label}</p>
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
        <div className="p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
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

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  const [profile, setProfile] = useState<ProfileData>({
    gpa: '', gpaScale: '4.0', satMath: '', satRW: '', extracurriculars: [],
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
            satMath: p.satMath != null ? p.satMath.toString() : '',
            satRW: p.satRW != null ? p.satRW.toString() : '',
            extracurriculars: (p.extracurriculars as Extracurricular[]) || [],
          });
          if (p.holisticScore != null) setScored(true);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [status]);

  const results = useMemo(() => computeHolisticScore(profile), [profile]);
  const diversity = useMemo(() => computeDiversityScore(profile.extracurriculars), [profile.extracurriculars]);
  const depth = useMemo(() => computeDepthScore(profile.extracurriculars), [profile.extracurriculars]);
  const personaSuggestions = useMemo(() => generatePersonaSuggestions(profile.extracurriculars), [profile.extracurriculars]);

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
          satMath: profile.satMath || null,
          satRW: profile.satRW || null,
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
    setProfile(prev => ({ ...prev, extracurriculars: prev.extracurriculars.filter(ec => ec.id !== id) }));
    if (editingEcId === id) setEditingEcId(null);
  };

  const updateECDescription = (id: string, description: string) => {
    setProfile(prev => ({
      ...prev,
      extracurriculars: prev.extracurriculars.map(ec => ec.id === id ? { ...ec, description } : ec),
    }));
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
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1.5">GPA</label>
                    <input type="number" step="0.01" min="0" max={profile.gpaScale === '5.0' ? '5.0' : '4.0'} value={profile.gpa} onChange={(e) => setProfile({ ...profile, gpa: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" placeholder="e.g. 3.85" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1.5">Scale</label>
                    <select value={profile.gpaScale} onChange={(e) => setProfile({ ...profile, gpaScale: e.target.value as '4.0' | '5.0' })} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent">
                      <option value="4.0">/ 4.0</option>
                      <option value="5.0">/ 5.0</option>
                    </select>
                  </div>
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
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${bucket.gradient}`} />
                        <span className={`text-xs font-bold ${bucket.text}`}>{bucket.label}</span>
                        <span className={`text-[10px] font-medium ${bucket.text} opacity-60`}>({ecs.length})</span>
                      </div>

                      {/* EC cards in this bucket */}
                      {ecs.map(ec => (
                        <div key={ec.id} className={`ml-2 p-4 rounded-xl bg-surface border ${bucket.border} group transition-all`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-primary">{ec.name}</p>
                              </div>
                              <p className="text-xs text-slate-600 font-medium">{ec.role}</p>

                              {/* Description — editable */}
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

                              <div className="flex items-center gap-3 mt-1.5">
                                <p className="text-[11px] text-slate-400">{ec.years} yr{ec.years !== 1 ? 's' : ''} &middot; {ec.hoursPerWeek} hrs/wk</p>
                                {editingEcId !== ec.id && (
                                  <button onClick={() => startEditEC(ec)} className="text-[10px] text-indigo-500 font-semibold hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Improve description
                                  </button>
                                )}
                              </div>
                            </div>
                            <button onClick={() => removeEC(ec.id)} className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
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
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-lg font-bold font-display text-primary mb-5">Activity Scoreboard</h3>

                <div className="flex items-center justify-around gap-4 mb-6">
                  <ScoreRing score={diversity.score} label="Diversity" size={95} color="#8b5cf6" />
                  <ScoreRing score={depth.score} label="Depth" size={95} color="#06b6d4" />
                  <ScoreRing score={results.ecScore} label="Overall EC" size={95} color="#10b981" />
                </div>

                {/* Category coverage bar */}
                <div className="mb-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Category Coverage ({diversity.filledBuckets}/{diversity.totalBuckets})</p>
                  <div className="flex gap-1">
                    {EC_BUCKETS.map(b => {
                      const filled = ecsByBucket[b.key]?.length > 0;
                      return (
                        <div key={b.key} className="flex-1 group relative">
                          <div className={`h-3 rounded-full transition-all ${filled ? `bg-gradient-to-r ${b.gradient}` : 'bg-slate-100'}`} />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block">
                            <span className="text-[9px] bg-slate-800 text-white px-2 py-0.5 rounded whitespace-nowrap">{b.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Feedback */}
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                    <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">Diversity</p>
                    <p className="text-xs text-purple-800 mt-0.5">{diversity.feedback}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-100">
                    <p className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wider">Depth</p>
                    <p className="text-xs text-cyan-800 mt-0.5">{depth.feedback}</p>
                  </div>
                </div>

                {/* Missing categories */}
                {diversity.missing.length > 0 && diversity.missing.length <= 4 && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">Consider adding</p>
                    <div className="flex flex-wrap gap-1.5">
                      {diversity.missing.map(cat => (
                        <span key={cat} className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded-full">{cat}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── PERSONALIZED SUGGESTIONS ─── */}
            {profile.extracurriculars.length >= 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold font-display text-primary">Personalized Suggestions</h3>
                  <button
                    onClick={() => setShowPersonas(!showPersonas)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-medium"
                  >
                    {showPersonas ? 'Hide' : 'Show'}
                  </button>
                </div>

                {showPersonas && (
                  <div className="space-y-3">
                    {personaSuggestions.map((ps, i) => (
                      <div key={i} className="p-4 rounded-xl bg-surface border border-slate-100 hover:border-slate-200 transition-all">
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${ps.persona.avatarBg} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                            {ps.persona.name.split(' ').map(w => w[0]).join('')}
                          </div>
                          <div>
                            <p className={`text-xs font-bold ${ps.persona.color}`}>{ps.persona.name}</p>
                            <p className="text-[10px] text-slate-400">{ps.persona.title}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{ps.suggestion}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── HOLISTIC EVALUATION ─── */}
            {!scored ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent/10 to-purple-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h3 className="text-lg font-bold font-display text-primary">Your Evaluation Awaits</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">Fill in your GPA, SAT scores, and extracurriculars, then click &ldquo;Evaluate My Profile&rdquo; to see your holistic score.</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h3 className="text-lg font-bold font-display text-primary mb-5">Holistic Evaluation</h3>
                  <div className="flex items-center justify-around gap-4">
                    <ScoreRing score={results.holistic} label="Overall Score" size={110} />
                    <ScoreRing score={results.percentile} label="Percentile" size={110} color="#10b981" />
                  </div>

                  <div className="mt-6 p-4 rounded-xl bg-surface border border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Score Breakdown</p>
                    <div className="space-y-3">
                      {[
                        { label: 'GPA', score: results.gpaScore, weight: '35%', color: 'bg-accent' },
                        { label: 'SAT', score: results.satScore, weight: '30%', color: 'bg-purple-500' },
                        { label: 'Extracurriculars', score: results.ecScore, weight: '35%', color: 'bg-emerald-500' },
                      ].map(item => (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-primary">{item.label} <span className="text-slate-400 text-xs">({item.weight})</span></span>
                            <span className="font-bold text-primary">{item.score}/100</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${item.score}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-accent/5 to-purple-50 border border-accent/10">
                    <p className="text-sm font-semibold text-primary">
                      You&apos;re in the <span className="text-accent">{results.percentile}th percentile</span> compared to {comparativeData.length} students on the platform.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {results.percentile >= 80 ? 'Excellent position for top-tier universities.' :
                       results.percentile >= 60 ? 'Strong profile with room for strategic improvement.' :
                       results.percentile >= 40 ? 'Solid foundation — focus on extracurriculars and test prep.' :
                       'Great starting point. Let\'s build a plan to boost your profile.'}
                    </p>
                  </div>

                  {results.ecFeedback && (
                    <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">AI Extracurricular Assessment</p>
                      <p className="text-sm text-emerald-800">{results.ecFeedback}</p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h3 className="text-lg font-bold font-display text-primary mb-1">Where You Stand</h3>
                  <p className="text-xs text-slate-400 mb-4">Your position vs. other AdmitsOnly students.</p>
                  <Scatterplot userGpa={results.normalizedGpa} userSat={results.totalSAT} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
