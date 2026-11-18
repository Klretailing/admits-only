/* ──────────────────────────────────────────────────────────────────────
   Age rules, in one place.

   • Students must be 13 or older (US COPPA: under-13 accounts need verified
     parental consent, which we don't collect). Parents and tutors must be 18+.
   • We ask for a full date of birth at sign-up to check age accurately, but
     store only the month and year ("YYYY-MM"): enough to know when a student
     turns 18, without keeping a full birthday on file (data minimization).
   • From month+year we assume the LATEST possible birthday in that month, so
     rounding always errs toward treating someone as younger (more protected).
   • A student account with no birth month on file is treated as a minor.
   ────────────────────────────────────────────────────────────────────── */

export const MIN_STUDENT_AGE = 13;
export const ADULT_AGE = 18;

export interface Dob { year: number; month: number; day: number }

/** Strict "YYYY-MM-DD" parse of a real, past date within the last 120 years. */
export function parseDob(value: unknown, now: Date = new Date()): Dob | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null; // Feb 30 etc.
  if (d.getTime() > now.getTime()) return null;
  if (year < now.getUTCFullYear() - 120) return null;
  return { year, month, day };
}

/** Whole years of age on `now` (UTC calendar). */
export function ageFromDob(dob: Dob, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - dob.year;
  const beforeBirthday = now.getUTCMonth() + 1 < dob.month || (now.getUTCMonth() + 1 === dob.month && now.getUTCDate() < dob.day);
  if (beforeBirthday) age -= 1;
  return age;
}

export function birthMonthOf(dob: Dob): string {
  return `${dob.year}-${String(dob.month).padStart(2, '0')}`;
}

/** Age from a stored "YYYY-MM", assuming the last day of the month (youngest possible). */
export function ageFromBirthMonth(birthMonth: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(birthMonth || '');
  if (!m) return null;
  const year = Number(m[1]), month = Number(m[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return ageFromDob({ year, month, day: lastDay }, now);
}

/** Should this account get minor protections? Unknown age on a student = yes. */
export function isMinor(role: string | null | undefined, birthMonth: string | null | undefined, now: Date = new Date()): boolean {
  const age = birthMonth ? ageFromBirthMonth(birthMonth, now) : null;
  if (age !== null) return age < ADULT_AGE;
  return role === 'student';
}

export type AgeCheck =
  | { ok: true; birthMonth: string; age: number; minor: boolean }
  | { ok: false; status: 400 | 403; code: 'missing' | 'invalid' | 'under_13' | 'adult_required'; error: string };

/** The sign-up rule for a role, given the date of birth the person entered. */
export function checkSignupAge(role: string, dateOfBirth: unknown, now: Date = new Date()): AgeCheck {
  if (dateOfBirth == null || dateOfBirth === '') {
    return { ok: false, status: 400, code: 'missing', error: 'Please enter your date of birth.' };
  }
  const dob = parseDob(dateOfBirth, now);
  if (!dob) return { ok: false, status: 400, code: 'invalid', error: 'Please enter a real date of birth.' };
  const age = ageFromDob(dob, now);
  if (role === 'student' && age < MIN_STUDENT_AGE) {
    return { ok: false, status: 403, code: 'under_13', error: 'AdmitsOnly is for students 13 and older.' };
  }
  if ((role === 'parent' || role === 'educator' || role === 'admin') && age < ADULT_AGE) {
    return { ok: false, status: 403, code: 'adult_required', error: 'Parent and tutor accounts are for adults 18 and older. Students can sign up as a student.' };
  }
  return { ok: true, birthMonth: birthMonthOf(dob), age, minor: age < ADULT_AGE };
}
