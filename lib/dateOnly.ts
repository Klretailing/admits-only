/* ──────────────────────────────────────────────────────────────────────
   Calendar dates ("2026-11-01") are days on the wall calendar, not instants.

   `new Date('2026-11-01')` parses as UTC midnight, which in every US time
   zone is the evening of Oct 31. So a deadline rendered with it shows a day
   early, groups into the wrong month, and reads "past due" on the deadline
   day itself. Every date-only value (application deadlines, task due dates,
   "YYYY-MM" month keys) should go through these helpers instead.
   ────────────────────────────────────────────────────────────────────── */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse a date. "YYYY-MM-DD" becomes local midnight of that day; anything
 *  else (a full ISO timestamp) is parsed normally. */
export function parseDay(value: string): Date {
  const m = DATE_ONLY.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/** Whole calendar days from today until the date: 0 = today, 1 = tomorrow,
 *  -1 = yesterday. Null for a missing or unparseable value. */
export function daysUntilDay(value: string | null | undefined, now: Date = new Date()): number | null {
  if (!value) return null;
  const t = parseDay(value);
  if (Number.isNaN(t.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  // Round, not floor: a DST shift makes a calendar day 23 or 25 hours long.
  return Math.round((day.getTime() - today.getTime()) / 86400000);
}
