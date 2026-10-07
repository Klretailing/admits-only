import { signOut, type SignOutParams } from 'next-auth/react';

/* ══════════════════════════════════════════════════════════════════════
   SIGNED-IN HINT  (prevents the header's Sign In ⇄ Dashboard flicker)

   Public pages are pre-rendered as static HTML, where the session is always
   "loading", and the browser only learns the truth after /api/auth/session
   answers (≈0.2s normally, 1.5s+ on a cold start). The header used to treat
   "loading" as "signed out", so a signed-in student saw Sign In / Get Started
   appear and then vanish into Dashboard. If the session request failed, they
   saw Sign In for good.

   Hiding the buttons until the answer arrives would blank the Get Started
   button for logged-out visitors — most public traffic — so instead we
   remember the last known state. An inline script in _document adds
   `ao-auth-in` to <html> before first paint; CSS shows the matching
   buttons; once the session resolves, the real answer replaces the guess.
   It is only ever a display hint: nothing is authorised by it.
   ══════════════════════════════════════════════════════════════════════ */

export const AUTH_HINT_KEY = 'ao_auth';

export function setAuthHint(signedIn: boolean) {
  try {
    localStorage.setItem(AUTH_HINT_KEY, signedIn ? 'in' : 'out');
    document.documentElement.classList.toggle('ao-auth-in', signedIn);
  } catch { /* private mode: fall back to the signed-out default */ }
}

/** Sign out and forget the hint first, so the page we land on doesn't
    briefly show "Dashboard" to someone who just signed out. */
export function signOutAndForget(opts?: SignOutParams<true>) {
  setAuthHint(false);
  return signOut(opts);
}

/** A post-sign-in destination from ?next=, accepted only if it is a path on
    this site. Anything else (absolute URLs, protocol-relative "//evil.com",
    backslash tricks) is ignored, so the parameter can't be used to bounce a
    student to another site right after they sign in. */
export function safeNext(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  return raw;
}
