/* ══════════════════════════════════════════════════════════════════════
   APPLICATION DEADLINES

   ⚠ READ THIS BEFORE TRUSTING A DATE
   Deadlines move every cycle, and a missed deadline is unrecoverable. These
   are the *typical* dates each school has used recently, not a live feed. The
   UI always shows them as "typical" and links to the school's own admissions
   page, because the school's site is the only authority. Never present these
   as confirmed.

   What IS reliable here is the STRUCTURE — which rounds a school offers.
   That changes rarely, and it is the part students most often get wrong:
     • Most public universities do not offer Early Decision at all.
     • The UC campuses have one window (Nov 30) and no early round whatsoever.
     • Harvard / Yale / Princeton / Stanford run Restrictive Early Action, so
       applying early to one usually bars applying early to another private.
     • ED is binding; EA and REA are not.

   ROUNDS
     rea  Restrictive / Single-Choice Early Action — non-binding, exclusive
     ed   Early Decision I  — binding
     ed2  Early Decision II — binding, later window
     ea   Early Action      — non-binding
     rd   Regular Decision
     rolling / priority — reviewed as they arrive; priority is the date after
     which aid and housing get materially harder to get.
   ══════════════════════════════════════════════════════════════════════ */

import { colleges } from './colleges';

export interface Deadlines {
  rea?: string;
  ed?: string;
  ed2?: string;
  ea?: string;
  rd?: string;
  rolling?: boolean;
  priority?: string;
}

export const ROUND_META: Record<string, { label: string; short: string; binding: boolean; note: string }> = {
  rea: { label: 'Restrictive Early Action', short: 'REA', binding: false, note: 'Non-binding, but you usually cannot apply early to other private colleges.' },
  ed:  { label: 'Early Decision',           short: 'ED',  binding: true,  note: 'Binding — if you are admitted you must attend and withdraw other applications.' },
  ed2: { label: 'Early Decision II',        short: 'ED II', binding: true, note: 'Binding, with a later deadline than ED I.' },
  ea:  { label: 'Early Action',             short: 'EA',  binding: false, note: 'Non-binding — you hear early and can still compare offers.' },
  rd:  { label: 'Regular Decision',         short: 'RD',  binding: false, note: 'The standard round.' },
};

/* ─── the data ───
   Grouped by how the school actually behaves, which is also how the dates
   cluster. Anything genuinely distinctive is called out in a comment. */

export const DEADLINES: Record<string, Deadlines> = {
  /* Restrictive / Single-Choice Early Action — the four that bar other early apps */
  harvard:   { rea: 'Nov 1', rd: 'Jan 1' },
  yale:      { rea: 'Nov 1', rd: 'Jan 2' },
  princeton: { rea: 'Nov 1', rd: 'Jan 1' },
  stanford:  { rea: 'Nov 1', rd: 'Jan 2' },

  /* Ivies and peers running binding ED */
  columbia:     { ed: 'Nov 1', rd: 'Jan 1' },
  upenn:        { ed: 'Nov 1', rd: 'Jan 5' },
  brown:        { ed: 'Nov 1', rd: 'Jan 5' },
  dartmouth:    { ed: 'Nov 1', rd: 'Jan 2' },
  cornell:      { ed: 'Nov 1', rd: 'Jan 2' },
  duke:         { ed: 'Nov 1', rd: 'Jan 4' },
  jhu:          { ed: 'Nov 1', ed2: 'Jan 3', rd: 'Jan 2' },
  northwestern: { ed: 'Nov 1', rd: 'Jan 3' },
  vanderbilt:   { ed: 'Nov 1', ed2: 'Jan 1', rd: 'Jan 1' },
  rice:         { ed: 'Nov 1', rd: 'Jan 4' },
  washu:        { ed: 'Nov 1', ed2: 'Jan 2', rd: 'Jan 2' },
  emory:        { ed: 'Nov 1', ed2: 'Jan 1', rd: 'Jan 1' },
  cmu:          { ed: 'Nov 1', rd: 'Jan 3' },
  tufts:        { ed: 'Nov 1', ed2: 'Jan 4', rd: 'Jan 4' },
  nyu:          { ed: 'Nov 1', ed2: 'Jan 1', rd: 'Jan 5' },
  boston_university: { ed: 'Nov 1', ed2: 'Jan 4', rd: 'Jan 4' },
  case_western: { ed: 'Nov 1', ed2: 'Jan 15', ea: 'Nov 1', rd: 'Jan 15' },
  tulane:       { ed: 'Nov 1', ed2: 'Jan 12', ea: 'Nov 15', rd: 'Jan 15' },
  wake_forest:  { ed: 'Nov 15', ed2: 'Jan 1', rd: 'Jan 1' },
  villanova:    { ed: 'Nov 1', ed2: 'Jan 15', ea: 'Nov 1', rd: 'Jan 15' },
  lehigh:       { ed: 'Nov 1', ed2: 'Jan 1', rd: 'Jan 1' },
  rochester:    { ed: 'Nov 1', ed2: 'Jan 5', ea: 'Nov 1', rd: 'Jan 5' },
  brandeis:     { ed: 'Nov 1', ed2: 'Jan 1', ea: 'Nov 1', rd: 'Jan 1' },
  umiami:       { ed: 'Nov 1', ed2: 'Jan 1', ea: 'Nov 1', rd: 'Jan 1' },
  rpi:          { ed: 'Nov 1', ed2: 'Dec 15', ea: 'Nov 1', rd: 'Jan 15' },
  stevens:      { ed: 'Nov 15', ed2: 'Jan 15', ea: 'Nov 15', rd: 'Feb 1' },
  wpi:          { ed: 'Nov 1', ed2: 'Jan 1', ea: 'Nov 1', rd: 'Feb 1' },
  drexel:       { ed: 'Nov 1', ed2: 'Jan 15', ea: 'Nov 1', rd: 'Jan 15' },
  fordham:      { ed: 'Nov 1', ed2: 'Jan 1', ea: 'Nov 1', rd: 'Jan 15' },
  gw:           { ed: 'Nov 1', ed2: 'Jan 5', rd: 'Jan 5' },
  american:     { ed: 'Nov 15', ed2: 'Jan 15', ea: 'Nov 15', rd: 'Jan 15' },
  syracuse:     { ed: 'Nov 15', ea: 'Nov 15', rd: 'Jan 1' },
  udenver:      { ed: 'Nov 1', ed2: 'Jan 15', ea: 'Nov 1', rd: 'Jan 15' },
  seton_hall:   { ea: 'Nov 15', rd: 'Mar 1', rolling: true },

  /* Early Action, non-binding */
  mit:        { ea: 'Nov 1', rd: 'Jan 4' },
  caltech:    { ea: 'Nov 1', rd: 'Jan 3' },
  uchicago:   { ea: 'Nov 1', ed: 'Nov 1', ed2: 'Jan 4', rd: 'Jan 4' },
  notredame:  { rea: 'Nov 1', rd: 'Jan 1' },
  georgetown: { ea: 'Nov 1', rd: 'Jan 10' },
  boston_college: { ea: 'Nov 1', ed: 'Nov 1', ed2: 'Jan 1', rd: 'Jan 1' },
  northeastern:   { ea: 'Nov 1', ed: 'Nov 1', ed2: 'Jan 1', rd: 'Jan 1' },
  usc:        { ea: 'Nov 1', rd: 'Jan 15' },   // EA is for most majors; arts have earlier dates
  smu:        { ed: 'Nov 1', ed2: 'Jan 15', ea: 'Nov 1', rd: 'Jan 15' },
  pepperdine: { ea: 'Nov 1', rd: 'Jan 15' },
  santa_clara:{ ed: 'Nov 1', ea: 'Nov 1', rd: 'Jan 7' },
  lmu:        { ea: 'Nov 1', ed: 'Nov 1', rd: 'Jan 15' },
  chapman:    { ed: 'Nov 1', ea: 'Nov 1', rd: 'Jan 15' },
  tcu:        { ed: 'Nov 1', ea: 'Nov 1', rd: 'Feb 1' },
  baylor:     { ed: 'Nov 1', ea: 'Nov 1', rd: 'Feb 1' },
  gonzaga:    { ea: 'Nov 15', rd: 'Jan 15' },
  marquette:  { ea: 'Nov 1', rd: 'Mar 1', rolling: true },
  loyola_chicago: { ea: 'Nov 1', rd: 'Feb 1', rolling: true },
  creighton:  { ea: 'Nov 1', rd: 'Feb 1', rolling: true },
  usd:        { ed: 'Nov 15', ea: 'Nov 15', rd: 'Jan 15' },
  slu:        { ea: 'Nov 1', rd: 'Mar 1', rolling: true },
  udayton:    { ea: 'Nov 1', rd: 'Feb 1', rolling: true },
  depaul:     { ea: 'Nov 1', rd: 'Feb 1', rolling: true },
  byu:        { ea: 'Nov 1', rd: 'Dec 15' },
  elon:       { ed: 'Nov 1', ed2: 'Jan 5', ea: 'Nov 10', rd: 'Jan 10' },
  howard:     { ea: 'Nov 1', rd: 'Feb 15' },
  spelman:    { ed: 'Nov 1', ea: 'Nov 15', rd: 'Feb 1' },
  morehouse:  { ea: 'Nov 1', rd: 'Feb 15', rolling: true },
  providence: { ed: 'Nov 1', ed2: 'Jan 15', ea: 'Nov 1', rd: 'Jan 15' },
  utulsa:     { ea: 'Nov 1', rd: 'Feb 1', rolling: true },
  furman:     { ed: 'Nov 1', ed2: 'Jan 7', ea: 'Nov 15', rd: 'Jan 15' },

  /* Liberal arts colleges — ED I/II is the norm */
  williams:   { ed: 'Nov 15', rd: 'Jan 8' },
  amherst:    { ed: 'Nov 1', rd: 'Jan 3' },
  pomona:     { ed: 'Nov 1', ed2: 'Jan 8', rd: 'Jan 8' },
  swarthmore: { ed: 'Nov 15', ed2: 'Jan 5', rd: 'Jan 5' },
  wellesley:  { ed: 'Nov 1', ed2: 'Jan 1', rd: 'Jan 8' },
  bowdoin:    { ed: 'Nov 15', ed2: 'Jan 5', rd: 'Jan 5' },
  middlebury: { ed: 'Nov 1', ed2: 'Jan 1', rd: 'Jan 1' },
  cmc:        { ed: 'Nov 1', ed2: 'Jan 10', rd: 'Jan 10' },
  harvey_mudd:{ ed: 'Nov 15', ed2: 'Jan 5', rd: 'Jan 5' },
  colby:      { ed: 'Nov 15', ed2: 'Jan 1', rd: 'Jan 1' },
  barnard:    { ed: 'Nov 1', rd: 'Jan 1' },
  carleton:   { ed: 'Nov 15', ed2: 'Jan 15', rd: 'Jan 15' },
  hamilton:   { ed: 'Nov 15', ed2: 'Jan 5', rd: 'Jan 5' },
  haverford:  { ed: 'Nov 15', ed2: 'Jan 5', rd: 'Jan 5' },
  vassar:     { ed: 'Nov 15', ed2: 'Jan 1', rd: 'Jan 1' },
  wesleyan:   { ed: 'Nov 15', ed2: 'Jan 1', rd: 'Jan 1' },
  grinnell:   { ed: 'Nov 15', ed2: 'Jan 1', ea: 'Nov 15', rd: 'Jan 15' },
  colgate:    { ed: 'Nov 15', ed2: 'Jan 15', rd: 'Jan 15' },
  bates:      { ed: 'Nov 15', ed2: 'Jan 1', rd: 'Jan 1' },
  oberlin:    { ed: 'Nov 15', ed2: 'Jan 2', rd: 'Jan 15' },
  davidson:   { ed: 'Nov 15', ed2: 'Jan 6', rd: 'Jan 6' },
  wandl:      { ed: 'Nov 1', ed2: 'Jan 1', rd: 'Jan 1' },   // Washington and Lee
  colorado_college: { ed: 'Nov 1', ed2: 'Jan 15', rd: 'Jan 15' },
  urichmond:  { ed: 'Nov 1', ed2: 'Jan 1', ea: 'Nov 1', rd: 'Jan 1' },
  reed:       { ed: 'Nov 1', ed2: 'Dec 20', rd: 'Jan 15' },
  macalester: { ed: 'Nov 1', ed2: 'Jan 1', rd: 'Jan 15' },
  kenyon:     { ed: 'Nov 15', ed2: 'Jan 15', ea: 'Dec 1', rd: 'Jan 15' },
  whitman:    { ed: 'Nov 15', ed2: 'Jan 1', ea: 'Nov 15', rd: 'Jan 15' },
  bucknell:   { ed: 'Nov 15', ed2: 'Jan 15', rd: 'Jan 15' },
  lafayette:  { ed: 'Nov 15', ed2: 'Jan 15', rd: 'Jan 15' },
  holy_cross: { ed: 'Nov 15', ed2: 'Jan 15', ea: 'Nov 15', rd: 'Jan 15' },

  /* ─── University of California ───
     One window for every campus, no early round at all, and the application
     closes Nov 30 — earlier than most students expect. */
  ucberkeley: { rd: 'Nov 30' },
  ucla:       { rd: 'Nov 30' },
  ucsd:       { rd: 'Nov 30' },
  ucdavis:    { rd: 'Nov 30' },
  uci:        { rd: 'Nov 30' },
  ucsb:       { rd: 'Nov 30' },
  ucsc:       { rd: 'Nov 30' },
  ucr:        { rd: 'Nov 30' },

  /* California State system — also a Nov 30 close, no early round */
  calpolyslo: { rd: 'Nov 30' },
  sdsu:       { rd: 'Nov 30' },

  /* Public flagships — EA is common, ED is rare */
  umich:      { ea: 'Nov 1', rd: 'Feb 1' },
  uva:        { ed: 'Nov 1', ea: 'Nov 1', rd: 'Jan 5' },
  unc:        { ea: 'Oct 15', rd: 'Jan 15' },
  // Georgia Tech splits EA: Oct 15 for Georgia residents, Nov 1 for everyone
  // else. Nov 1 is shown because it applies to the large majority of applicants.
  gatech:     { ea: 'Nov 1', rd: 'Jan 4' },
  utaustin:   { rd: 'Dec 1' },
  ufl:        { rd: 'Nov 1' },
  uw:         { rd: 'Nov 15' },
  uiuc:       { ea: 'Nov 1', rd: 'Jan 5' },
  purdue:     { ea: 'Nov 1', rd: 'Jan 15' },
  wisc:       { ea: 'Nov 1', rd: 'Feb 1' },
  osu:        { ea: 'Nov 1', rd: 'Feb 1' },
  psu:        { ea: 'Nov 1', rd: 'Nov 30', priority: 'Nov 30' },
  umd:        { ea: 'Nov 1', rd: 'Jan 20' },
  vt:         { ed: 'Nov 1', ea: 'Nov 15', rd: 'Jan 15' },
  ncsu:       { ea: 'Oct 15', rd: 'Jan 15' },
  uga:        { ea: 'Oct 15', rd: 'Jan 1' },
  clemson:    { ea: 'Oct 15', rd: 'May 1', priority: 'Dec 1' },
  pitt:       { rolling: true, priority: 'Nov 1' },
  rutgers:    { ea: 'Nov 1', rd: 'Dec 1' },
  umn:        { ea: 'Nov 1', rd: 'Jan 1', rolling: true },
  indiana:    { ea: 'Nov 1', rd: 'Feb 1' },
  msu:        { ea: 'Nov 1', rd: 'Mar 1', rolling: true },
  uconn:      { ea: 'Nov 1', rd: 'Jan 15' },
  umass:      { ea: 'Nov 5', rd: 'Jan 15' },
  cuboulder:  { ea: 'Nov 15', rd: 'Jan 15' },
  asu:        { rolling: true, priority: 'Nov 1' },
  uarizona:   { rolling: true, priority: 'Nov 1' },
  tamu:       { ea: 'Oct 15', rd: 'Dec 1' },
  usc_columbia: { ea: 'Oct 15', rd: 'Dec 1', priority: 'Dec 1' },
  uoregon:    { ea: 'Nov 1', rd: 'Jan 15', rolling: true },
  utk:        { ea: 'Nov 1', rd: 'Dec 15', priority: 'Dec 15' },
  bama:       { ea: 'Nov 1', rd: 'May 1', rolling: true, priority: 'Dec 1' },
  iastate:    { rolling: true, priority: 'Nov 1' },
  uiowa:      { ea: 'Nov 1', rd: 'May 1', rolling: true },
  uky:        { ea: 'Nov 1', rd: 'Feb 15', rolling: true },
  lsu:        { ea: 'Nov 15', rd: 'Apr 15', priority: 'Nov 15' },
  fsu:        { ea: 'Nov 1', rd: 'Mar 1' },
  ucf:        { ea: 'Nov 1', rd: 'Jan 15' },
  stonybrook: { ea: 'Nov 1', rd: 'Jan 15' },
  binghamton: { ea: 'Nov 1', ed: 'Nov 1', ed2: 'Jan 1', rd: 'Jan 15' },
  udel:       { ea: 'Nov 1', ed: 'Nov 1', rd: 'Jan 15' },
  uvm:        { ed: 'Nov 1', ed2: 'Jan 15', ea: 'Nov 1', rd: 'Jan 15' },
  unh:        { ea: 'Nov 15', ed: 'Nov 15', rd: 'Feb 1' },
  temple:     { ea: 'Nov 1', rd: 'Feb 1', rolling: true },
  gmu:        { ea: 'Nov 1', ed: 'Nov 1', rd: 'Feb 1', rolling: true },
  uoklahoma:  { ea: 'Nov 1', rd: 'Feb 1', priority: 'Dec 15' },
  unl:        { ea: 'Nov 1', rd: 'May 1', rolling: true },
  colostate:  { ea: 'Nov 15', rd: 'Feb 1', rolling: true },
  wsu:        { rolling: true, priority: 'Jan 31' },
  oregonstate:{ ea: 'Nov 1', rd: 'Feb 1', rolling: true },
  jmu:        { ed: 'Nov 1', ea: 'Nov 1', rd: 'Jan 15' },
  uark:       { rolling: true, priority: 'Nov 15' },
  umissouri:  { rolling: true, priority: 'Dec 1' },
  usf:        { ea: 'Nov 1', rd: 'Feb 15' },
  uhawaii:    { ea: 'Nov 1', rd: 'Mar 1', rolling: true },
  uutah:      { ea: 'Nov 1', rd: 'Apr 1', priority: 'Dec 1' },
  olemiss:    { rolling: true, priority: 'Feb 1' },
  ukansas:    { rolling: true, priority: 'Nov 1' },
  unm:        { rolling: true, priority: 'Feb 1' },
  william_mary: { ed: 'Nov 1', ed2: 'Jan 1', ea: 'Nov 1', rd: 'Jan 1' },
};

/** Deadlines for a college, or null when we have nothing for it. */
export function deadlinesFor(collegeId: string): Deadlines | null {
  return DEADLINES[collegeId] || null;
}

/** Rounds present, in the order a student meets them through the year. */
export function orderedRounds(d: Deadlines): { key: string; date: string }[] {
  const order = ['rea', 'ed', 'ea', 'ed2', 'rd'] as const;
  return order
    .filter(k => typeof d[k] === 'string' && d[k])
    .map(k => ({ key: k, date: d[k] as string }));
}

/** A Google search that lands on the school's own admissions dates page. */
export function verifyUrl(collegeName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${collegeName} undergraduate application deadlines`)}`;
}

/* ─── resolving a free-text school name ───
   The application tracker stores whatever name the student picked, which may
   come from the heatmap (`colleges`), the supplemental-essay database
   (`SCHOOLS`), or their own typing. Matching has to be STRICT: showing a
   student Miami University's dates for University of Miami is worse than
   showing none at all, so this deliberately does no substring or fuzzy
   matching — only a normalised exact match plus an explicit alias list. */

/* "university" and "college" are NOT stripped. Dropping them collapses
   Boston University into Boston College and Miami University into University
   of Miami — two pairs of genuinely different schools with different
   deadlines. Only true noise words go. */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    // Fold accents first, so "San José State" and "San Jose State" agree.
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|of|at|in)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Alternate names students and our other datasets use for the same school. */
const ALIASES: Record<string, string> = {
  'mit': 'mit',
  'massachusetts institute technology': 'mit',
  'caltech': 'caltech',
  'california institute technology': 'caltech',
  'georgia institute technology': 'gatech',
  'georgia tech': 'gatech',
  'penn': 'upenn',
  'university pennsylvania': 'upenn',
  'johns hopkins university': 'jhu',
  'johns hopkins': 'jhu',
  'carnegie mellon university': 'cmu',
  'carnegie mellon': 'cmu',
  'washington university st louis': 'washu',
  'washington university saint louis': 'washu',
  'university north carolina chapel hill': 'unc',
  'unc chapel hill': 'unc',
  'university texas austin': 'utaustin',
  'ut austin': 'utaustin',
  'uw madison': 'wisc',
  'university wisconsin madison': 'wisc',
  'university michigan': 'umich',
  'university michigan ann arbor': 'umich',
  'university virginia': 'uva',
  'university florida': 'ufl',
  'virginia tech': 'vt',
  'notre dame': 'notredame',
  'university notre dame': 'notredame',
  'new york university': 'nyu',
  'university southern california': 'usc',
  'boston university': 'boston_university',
  'boston college': 'boston_college',
  'william mary': 'william_mary',
  'college william mary': 'william_mary',
  'university california los angeles': 'ucla',
  'university california berkeley': 'ucberkeley',
  'university california san diego': 'ucsd',
  'university california davis': 'ucdavis',
  'university california irvine': 'uci',
  'university california santa barbara': 'ucsb',
  'university california santa cruz': 'ucsc',
  'university california riverside': 'ucr',
  'university chicago': 'uchicago',
  'university washington': 'uw',
  'university illinois urbana champaign': 'uiuc',
  'university maryland': 'umd',
  'university georgia': 'uga',
  'california polytechnic state university san luis obispo': 'calpolyslo',
  'cal poly slo': 'calpolyslo',
  'cal poly': 'calpolyslo',
  'san diego state university': 'sdsu',
  'arizona state university': 'asu',
  'university illinois urbana champaign': 'uiuc',
  'penn state': 'psu',
  'pennsylvania state university': 'psu',
  'ohio state university': 'osu',
  'rutgers university': 'rutgers',
  'purdue university': 'purdue',
};

let nameIndex: Map<string, string> | null = null;

/** Built lazily so importing this module stays cheap. */
function index(): Map<string, string> {
  if (nameIndex) return nameIndex;
  const m = new Map<string, string>();
  for (const c of colleges) {
    const key = normalizeName(c.name);
    // First entry wins, so two colleges that normalise alike never silently
    // overwrite each other — the collision just fails to resolve the second.
    if (key && !m.has(key)) m.set(key, c.id);
  }
  for (const [alias, id] of Object.entries(ALIASES)) {
    // An alias never overwrites a real college name. Otherwise a careless
    // alias could quietly redirect one school's card to another's dates.
    if (DEADLINES[id] && !m.has(alias)) m.set(alias, id);
  }
  nameIndex = m;
  return m;
}

/** The college id for a free-text school name, or null if we cannot be sure. */
export function collegeIdForName(name: string): string | null {
  if (!name) return null;
  const key = normalizeName(name);
  if (!key) return null;
  return index().get(key) || null;
}

/** Deadlines for a free-text school name, or null when unmatched. */
export function deadlinesForName(name: string): Deadlines | null {
  const id = collegeIdForName(name);
  return id ? deadlinesFor(id) : null;
}
