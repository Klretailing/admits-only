/* Password rules, shared by sign-up, password reset and change password.
   Following NIST SP 800-63B: length matters more than character tricks, and
   passwords known from breach lists are refused. Passwords are never stored:
   only a bcrypt hash (cost 12) is. */

export const MIN_PASSWORD_LENGTH = 8;
// bcrypt only reads the first 72 bytes; a longer limit would silently ignore the rest.
export const MAX_PASSWORD_LENGTH = 72;

// The most common passwords in public breach data (and obvious site-specific ones).
const COMMON = new Set([
  'password', 'password1', 'password12', 'password123', 'password1234', 'passw0rd', 'p@ssw0rd', 'p@ssword',
  '12345678', '123456789', '1234567890', '12341234', '11111111', '00000000', '87654321', '123123123',
  'qwerty123', 'qwertyuiop', 'qwerty12', 'qwerty1234', '1q2w3e4r', '1q2w3e4r5t', 'zaq12wsx', 'asdfghjkl',
  'iloveyou', 'iloveyou1', 'sunshine', 'sunshine1', 'princess', 'princess1', 'football', 'football1',
  'baseball', 'basketball', 'soccer12', 'superman', 'batman12', 'starwars', 'pokemon1', 'minecraft',
  'whatever', 'trustno1', 'letmein1', 'welcome1', 'welcome123', 'monkey12', 'dragon12', 'shadow12',
  'master12', 'abc12345', 'abcd1234', 'aa123456', 'charlie1', 'michael1', 'jennifer', 'jordan23',
  'computer', 'internet', 'changeme', 'liverpool', 'chelsea1', 'freedom1', 'butterfly', 'chocolate',
  'admitsonly', 'admitsonly1', 'admitsonly123', 'college1', 'college123', 'student1', 'student123',
  'harvard1', 'stanford', 'school12', 'teacher1', 'parent123', 'tutor123',
]);

/** Returns a reason the password is not acceptable, or null if it is fine. */
export function passwordProblem(password: unknown, email?: string | null, name?: string | null): string | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_LENGTH) {
    return `Use ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return 'That password is too common and easy to guess. Try a short phrase only you would know.';
  if (/^(.)\1+$/.test(password)) return 'Avoid repeating one character.';
  const local = (email || '').toLowerCase().split('@')[0];
  if (local && local.length >= 3 && (lower === local || lower.includes(local))) return "Don't use your email address in your password.";
  const first = (name || '').toLowerCase().trim().split(/\s+/)[0];
  if (first && first.length >= 3 && lower.replace(/[^a-z]/g, '') === first) return "Don't use your name as your password.";
  return null;
}
