/* ══════════════════════════════════════════════════════════════════════
   STRUCTURED (INTERACTIVE) PREMIUM TEMPLATES

   These turn premium lesson notes from plain text into real frameworks:
   dropdowns, 1–5 rating steppers, checklists, repeatable rows, and
   built-in charts that visualize progress over time. The kind of thing a
   tutor would pay to unlock rather than rebuild by hand.

   A schema is an ordered list of Blocks. A note's answers live in a JSON
   `data` object keyed by each block's `key`. Charts are DERIVED from a
   `rows` block, so the graph updates itself as the tutor logs data.
   ══════════════════════════════════════════════════════════════════════ */

export type RowCol =
  | { key: string; label: string; type: 'text'; placeholder?: string }
  | { key: string; label: string; type: 'number'; unit?: string }
  | { key: string; label: string; type: 'select'; options: string[] }
  | { key: string; label: string; type: 'rating'; max?: number };

export type Block =
  | { t: 'group'; label: string; help?: string }
  | { t: 'text'; key: string; label: string; placeholder?: string }
  | { t: 'notes'; key: string; label: string; placeholder?: string }
  | { t: 'select'; key: string; label: string; options: string[] }
  | { t: 'rating'; key: string; label: string; max?: number; lowLabel?: string; highLabel?: string }
  | { t: 'number'; key: string; label: string; unit?: string; placeholder?: string }
  | { t: 'checklist'; key: string; label?: string; items: { k: string; label: string }[] }
  | { t: 'rows'; key: string; label: string; addLabel?: string; columns: RowCol[] }
  | { t: 'chart'; label: string; rowsKey: string; labelCol: string; valueCol: string; kind: 'bar' | 'line'; max?: number; unit?: string; help?: string };

/* ── Schemas per premium template id ───────────────────────────────── */

export const STRUCTURED_SCHEMAS: Record<string, Block[]> = {
  'progress-report': [
    { t: 'text', key: 'period', label: 'Reporting period', placeholder: 'e.g. March 2026' },
    { t: 'number', key: 'sessions', label: 'Sessions this period' },
    { t: 'group', label: 'Skills & where they stand', help: 'Rate each skill Emerging → Secure. The chart updates as you go.' },
    { t: 'rows', key: 'skills', label: 'Skills', addLabel: 'Add skill', columns: [
      { key: 'skill', label: 'Skill', type: 'text', placeholder: 'e.g. Multi-step word problems' },
      { key: 'level', label: 'Level', type: 'rating', max: 3 },
    ] },
    { t: 'chart', label: 'Mastery snapshot', rowsKey: 'skills', labelCol: 'skill', valueCol: 'level', kind: 'bar', max: 3, help: '1 Emerging · 2 Developing · 3 Secure' },
    { t: 'notes', key: 'wins', label: 'Wins & breakthroughs' },
    { t: 'notes', key: 'home', label: 'Recommended practice at home' },
    { t: 'notes', key: 'tutorNote', label: "Tutor's note to the family" },
  ],
  'reading-fluency': [
    { t: 'text', key: 'book', label: 'Book / passage' },
    { t: 'text', key: 'level', label: 'Reading level', placeholder: 'e.g. Level M' },
    { t: 'group', label: 'Fluency over time', help: 'Log a WCPM each session — the growth line builds itself.' },
    { t: 'rows', key: 'fluency', label: 'Fluency log', addLabel: 'Add reading', columns: [
      { key: 'date', label: 'Date', type: 'text', placeholder: 'M/D' },
      { key: 'wcpm', label: 'WCPM', type: 'number' },
      { key: 'acc', label: 'Accuracy %', type: 'number', unit: '%' },
    ] },
    { t: 'chart', label: 'WCPM growth', rowsKey: 'fluency', labelCol: 'date', valueCol: 'wcpm', kind: 'line', unit: ' wcpm' },
    { t: 'rating', key: 'comprehension', label: 'Comprehension', max: 5, lowLabel: 'Emerging', highLabel: 'Strong' },
    { t: 'checklist', key: 'work', label: 'Word work practiced', items: [
      { k: 'decoding', label: 'Decoding' }, { k: 'blending', label: 'Blending' },
      { k: 'sight', label: 'Sight words' }, { k: 'expression', label: 'Expression' },
    ] },
    { t: 'notes', key: 'reteach', label: 'Tricky words / patterns to reteach' },
    { t: 'text', key: 'nextTarget', label: 'Next level target' },
  ],
  'math-mastery': [
    { t: 'text', key: 'concept', label: 'Concept' },
    { t: 'text', key: 'standard', label: 'Grade-level standard', placeholder: 'e.g. 5.NF.A.1' },
    { t: 'select', key: 'prereq', label: 'Prerequisites solid?', options: ['Yes — ready', 'Some gaps', 'Major gaps'] },
    { t: 'group', label: 'Skill mastery', help: '1 Emerging · 2 Developing · 3 Secure' },
    { t: 'rows', key: 'skills', label: 'Sub-skills', addLabel: 'Add sub-skill', columns: [
      { key: 'skill', label: 'Sub-skill', type: 'text' },
      { key: 'mastery', label: 'Mastery', type: 'rating', max: 3 },
    ] },
    { t: 'chart', label: 'Mastery map', rowsKey: 'skills', labelCol: 'skill', valueCol: 'mastery', kind: 'bar', max: 3 },
    { t: 'notes', key: 'errors', label: 'Error patterns spotted' },
    { t: 'notes', key: 'reteach', label: 'Reteach / stretch plan' },
    { t: 'text', key: 'homework', label: 'Homework' },
  ],
  'learning-support': [
    { t: 'text', key: 'goals', label: 'Goal(s) targeted' },
    { t: 'checklist', key: 'accommodations', label: 'Accommodations used', items: [
      { k: 'time', label: 'Extended time' }, { k: 'chunking', label: 'Chunking' },
      { k: 'visual', label: 'Visual supports' }, { k: 'breaks', label: 'Movement breaks' },
      { k: 'readaloud', label: 'Read-aloud' }, { k: 'scribe', label: 'Scribe' },
    ] },
    { t: 'group', label: 'Evidence toward goal' },
    { t: 'rows', key: 'evidence', label: 'Data points', addLabel: 'Add data point', columns: [
      { key: 'date', label: 'Date', type: 'text', placeholder: 'M/D' },
      { key: 'measure', label: 'Measure', type: 'text' },
      { key: 'result', label: 'Result', type: 'number' },
    ] },
    { t: 'chart', label: 'Progress toward goal', rowsKey: 'evidence', labelCol: 'date', valueCol: 'result', kind: 'line' },
    { t: 'rating', key: 'engagement', label: 'Engagement / regulation', max: 5 },
    { t: 'notes', key: 'strategies', label: 'Strategies that worked' },
    { t: 'notes', key: 'team', label: 'For the team / next session' },
  ],
  'test-prep': [
    { t: 'select', key: 'test', label: 'Test', options: ['SAT', 'ACT', 'AP', 'State', 'Other'] },
    { t: 'text', key: 'testDate', label: 'Test date' },
    { t: 'number', key: 'baseline', label: 'Baseline score' },
    { t: 'number', key: 'goal', label: 'Goal score' },
    { t: 'group', label: 'Score trajectory', help: 'Log each practice score — watch the line climb toward the goal.' },
    { t: 'rows', key: 'scores', label: 'Practice scores', addLabel: 'Add score', columns: [
      { key: 'label', label: 'Attempt / date', type: 'text' },
      { key: 'score', label: 'Score', type: 'number' },
    ] },
    { t: 'chart', label: 'Score trajectory', rowsKey: 'scores', labelCol: 'label', valueCol: 'score', kind: 'line' },
    { t: 'notes', key: 'focus', label: 'Focus this session' },
    { t: 'notes', key: 'assignments', label: 'Assignments before next session' },
  ],
  'family-digest': [
    { t: 'text', key: 'week', label: 'Week of' },
    { t: 'rating', key: 'overall', label: 'Week overall', max: 5 },
    { t: 'notes', key: 'highlight', label: 'Highlight of the week' },
    { t: 'notes', key: 'growth', label: 'Growth I noticed' },
    { t: 'notes', key: 'celebrate', label: 'Celebrate at home' },
    { t: 'notes', key: 'practice', label: 'One thing to practice' },
    { t: 'notes', key: 'next', label: 'Coming up next week' },
  ],
  'cornell-notes': [
    { t: 'text', key: 'topic', label: 'Topic' },
    { t: 'group', label: 'Cues & notes', help: 'Left = cue questions / key terms. Right = the notes.' },
    { t: 'rows', key: 'cues', label: 'Cornell rows', addLabel: 'Add row', columns: [
      { key: 'cue', label: 'Cue / question', type: 'text' },
      { key: 'note', label: 'Note', type: 'text' },
    ] },
    { t: 'notes', key: 'summary', label: 'Summary (in my own words)' },
    { t: 'checklist', key: 'review', label: 'Review check', items: [
      { k: 'reread', label: 'Re-read within 24 hours' },
      { k: 'aloud', label: 'Can explain it out loud' },
      { k: 'flashcard', label: 'Made a flashcard / practice question' },
    ] },
  ],
  'live-tracker': [
    { t: 'group', label: 'Understanding checks', help: 'Rate 1 (lost) → 5 (got it) as you go.' },
    { t: 'rows', key: 'checks', label: 'Checks', addLabel: 'Add check', columns: [
      { key: 'topic', label: 'Topic', type: 'text' },
      { key: 'rating', label: 'Got it?', type: 'rating', max: 5 },
    ] },
    { t: 'chart', label: 'Understanding across the session', rowsKey: 'checks', labelCol: 'topic', valueCol: 'rating', kind: 'bar', max: 5 },
    { t: 'notes', key: 'wins', label: 'Quick wins' },
    { t: 'notes', key: 'stuck', label: 'Stuck points → follow up' },
    { t: 'text', key: 'exit', label: 'Exit ticket (one thing they can do now)' },
  ],
  'engagement-log': [
    { t: 'select', key: 'mood', label: 'Mood', options: ['😀 Great', '🙂 Good', '😐 Okay', '😟 Off day'] },
    { t: 'group', label: 'Focus through the session' },
    { t: 'rows', key: 'checkins', label: 'Focus check-ins', addLabel: 'Add check-in', columns: [
      { key: 'time', label: 'Time', type: 'text', placeholder: 'e.g. 10 min' },
      { key: 'focus', label: 'Focus', type: 'rating', max: 5 },
    ] },
    { t: 'chart', label: 'Focus level', rowsKey: 'checkins', labelCol: 'time', valueCol: 'focus', kind: 'line', max: 5 },
    { t: 'notes', key: 'positive', label: 'Positive moments & reinforcement used' },
    { t: 'notes', key: 'breaks', label: 'Breaks & regulation strategies that worked' },
    { t: 'notes', key: 'parent', label: 'For parent / next session' },
  ],
  'group-roster': [
    { t: 'text', key: 'group', label: 'Class / group' },
    { t: 'text', key: 'topic', label: 'Topic' },
    { t: 'group', label: 'Roster' },
    { t: 'rows', key: 'roster', label: 'Students', addLabel: 'Add student', columns: [
      { key: 'name', label: 'Student', type: 'text' },
      { key: 'participation', label: 'Participation', type: 'rating', max: 5 },
      { key: 'note', label: 'Note', type: 'text' },
    ] },
    { t: 'chart', label: 'Participation', rowsKey: 'roster', labelCol: 'name', valueCol: 'participation', kind: 'bar', max: 5 },
    { t: 'notes', key: 'homework', label: 'Whole-group homework' },
  ],
};

/* Sample data — makes the PREVIEW look alive (charts populated). */
export const SAMPLE_DATA: Record<string, any> = {
  'progress-report': { period: 'March', sessions: 4, skills: [
    { skill: 'Fractions', level: 3 }, { skill: 'Word problems', level: 2 }, { skill: 'Long division', level: 2 },
  ], wins: 'Finally clicked on equivalent fractions!' },
  'reading-fluency': { book: 'Frog and Toad', level: 'Level K', fluency: [
    { date: '3/2', wcpm: 48, acc: 92 }, { date: '3/9', wcpm: 57, acc: 94 }, { date: '3/16', wcpm: 66, acc: 96 },
  ], comprehension: 4, work: { decoding: true, sight: true } },
  'math-mastery': { concept: 'Adding fractions', prereq: 'Some gaps', skills: [
    { skill: 'Common denominators', mastery: 2 }, { skill: 'Simplifying', mastery: 3 }, { skill: 'Mixed numbers', mastery: 1 },
  ] },
  'learning-support': { goals: 'Read 60 wcpm', evidence: [
    { date: '3/2', measure: 'wcpm', result: 44 }, { date: '3/9', measure: 'wcpm', result: 51 }, { date: '3/16', measure: 'wcpm', result: 58 },
  ], engagement: 4, accommodations: { time: true, chunking: true } },
  'test-prep': { test: 'SAT', baseline: 1080, goal: 1300, scores: [
    { label: 'Diag', score: 1080 }, { label: 'PT1', score: 1140 }, { label: 'PT2', score: 1210 },
  ] },
  'family-digest': { week: 'Mar 16', overall: 5, highlight: 'Read a whole chapter out loud with expression.' },
  'cornell-notes': { topic: 'Photosynthesis', cues: [
    { cue: 'What do plants need?', note: 'Sunlight, water, CO₂' }, { cue: 'What is produced?', note: 'Glucose + oxygen' },
  ], review: { reread: true } },
  'live-tracker': { checks: [
    { topic: 'Slope', rating: 3 }, { topic: 'Y-intercept', rating: 4 }, { topic: 'Graphing', rating: 5 },
  ], exit: 'Can graph y = mx + b' },
  'engagement-log': { mood: '🙂 Good', checkins: [
    { time: '5 min', focus: 3 }, { time: '20 min', focus: 4 }, { time: '35 min', focus: 3 },
  ] },
  'group-roster': { group: 'Tues Reading Group', topic: 'Main idea', roster: [
    { name: 'Ava', participation: 5, note: 'Led the discussion' }, { name: 'Ben', participation: 3, note: 'Quiet today' }, { name: 'Cara', participation: 4, note: '' },
  ] },
};

export function isStructured(templateId: string | undefined | null): boolean {
  return !!templateId && !!STRUCTURED_SCHEMAS[templateId];
}

/** Build the empty default `data` object for a schema. */
export function initData(schema: Block[]): any {
  const data: any = {};
  for (const b of schema) {
    if (b.t === 'group' || b.t === 'chart') continue;
    if (b.t === 'checklist') data[b.key] = {};
    else if (b.t === 'rows') data[b.key] = [emptyRow(b.columns)];
    else if (b.t === 'rating' || b.t === 'number') data[b.key] = '';
    else data[b.key] = '';
  }
  return data;
}

export function emptyRow(columns: RowCol[]): any {
  const r: any = {};
  for (const c of columns) r[c.key] = c.type === 'rating' || c.type === 'number' ? '' : '';
  return r;
}

/** Extract {label, value} points from a rows block for charting. */
export function chartPoints(data: any, rowsKey: string, labelCol: string, valueCol: string): { label: string; value: number }[] {
  const rows: any[] = Array.isArray(data?.[rowsKey]) ? data[rowsKey] : [];
  return rows
    .map((r, i) => ({ label: String(r?.[labelCol] ?? `#${i + 1}`), value: Number(r?.[valueCol]) }))
    .filter((p) => !Number.isNaN(p.value));
}
