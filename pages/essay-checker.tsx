import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import CraftStudio from '../components/CraftStudio';
import { analyzeCraft } from '../lib/essayCraft';
import { tracker } from '../lib/analytics';

/* ══════════════════════════════════════════════════════════════════════
   FREE ESSAY CHECKER  (public, no account)

   The growth bet: let someone get real value before asking them for
   anything. A student searching "college essay checker" lands here, pastes
   a draft, and gets the same craft analysis signed-in students get. Only
   then is there an invitation to sign up, and signing up carries this exact
   essay into their account (see CHECKER_DRAFT_KEY and the essays page), so
   it never feels like starting over.

   Privacy is a real selling point here, not decoration: the analysis runs
   entirely in the browser (lib/essayCraft + lib/essayVocabulary are pure
   functions), so the essay is never uploaded. The page says so, and it must
   stay true — do not add a server call that sends the text.
   ══════════════════════════════════════════════════════════════════════ */

export const CHECKER_DRAFT_KEY = 'ao_checker_draft';

const PROMPTS: { id: string; short: string; text: string }[] = [
  { id: '1', short: 'Background, identity, interest or talent', text: 'Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.' },
  { id: '2', short: 'A challenge, setback or failure', text: 'The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure. How did it affect you, and what did you learn from the experience?' },
  { id: '3', short: 'Questioning a belief or idea', text: 'Reflect on a time when you questioned or challenged a belief or idea. What prompted your thinking? What was the outcome?' },
  { id: '4', short: 'Unexpected gratitude', text: 'Reflect on something that someone has done for you that has made you happy or thankful in a surprising way. How has this gratitude affected or motivated you?' },
  { id: '5', short: 'Growth and a new understanding', text: 'Discuss an accomplishment, event, or realization that sparked a period of personal growth and a new understanding of yourself or others.' },
  { id: '6', short: 'A topic you lose track of time on', text: 'Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time. Why does it captivate you? What or who do you turn to when you want to learn more?' },
  { id: '7', short: 'Topic of your choice', text: "Share an essay on any topic of your choice. It can be one you've already written, one that responds to a different prompt, or one of your own design." },
];

const WORD_LIMIT = 650;

export default function EssayChecker() {
  const [text, setText] = useState('');
  const [promptId, setPromptId] = useState('7');
  const [debounced, setDebounced] = useState('');
  const prompt = PROMPTS.find(p => p.id === promptId)!;

  // Restore a draft from earlier in this browser, so a refresh loses nothing.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CHECKER_DRAFT_KEY) || 'null');
      if (saved?.text) { setText(saved.text); setDebounced(saved.text); }
      if (saved?.promptId) setPromptId(saved.promptId);
    } catch { /* nothing saved */ }
  }, []);

  // Analyse after a short pause in typing, not on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(text), 350);
    return () => clearTimeout(id);
  }, [text]);

  // Keep the draft in this browser only, ready to carry into a new account.
  useEffect(() => {
    try {
      if (text.trim()) localStorage.setItem(CHECKER_DRAFT_KEY, JSON.stringify({ text, promptId, prompt: prompt.text }));
      else localStorage.removeItem(CHECKER_DRAFT_KEY);
    } catch { /* private mode */ }
  }, [text, promptId, prompt.text]);

  const report = useMemo(() => analyzeCraft(debounced, prompt.text), [debounced, prompt.text]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  // One analytics event per check, once there is enough text to analyse.
  const [counted, setCounted] = useState(false);
  useEffect(() => {
    if (report.ready && !counted) { tracker.feature('essay-checker', 'analyzed', { words }); setCounted(true); }
  }, [report.ready, counted, words]);

  const title = 'Free College Essay Checker: Instant Feedback on Your Personal Statement | AdmitsOnly';
  const description = 'Paste your Common App essay and get instant feedback on structure, tone, readability, and word choice. Free, no account needed, and your essay never leaves your browser.';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" key="og:title" content="Free College Essay Checker | AdmitsOnly" />
        <meta property="og:description" key="og:description" content={description} />
        <meta name="twitter:title" key="twitter:title" content="Free College Essay Checker | AdmitsOnly" />
        <meta name="twitter:description" key="twitter:description" content={description} />
      </Head>

      <section className="bg-surface border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-8 sm:pt-16">
          <p className="text-sm font-semibold text-accent">Free essay checker</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold font-display text-primary tracking-tight max-w-2xl">
            Get instant feedback on your college essay
          </h1>
          <p className="mt-3 text-slate-600 max-w-2xl">
            Paste your personal statement to see how it reads: structure, rhythm, tone, and the words a busy
            admissions reader might trip on. No account needed.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600">
            <svg className="w-4 h-4 text-emerald-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Your essay stays in your browser. Nothing is uploaded or saved by us.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="min-w-0">
          <label htmlFor="checker-prompt" className="block text-sm font-semibold text-primary mb-2">Which prompt is it for?</label>
          <select
            id="checker-prompt"
            value={promptId}
            onChange={e => setPromptId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          >
            {PROMPTS.map(p => <option key={p.id} value={p.id}>Common App prompt {p.id}: {p.short}</option>)}
          </select>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">{prompt.text}</p>

          <label htmlFor="checker-essay" className="sr-only">Your essay</label>
          <textarea
            id="checker-essay"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste or start typing your essay here…"
            className="mt-4 w-full min-h-[280px] lg:min-h-[420px] rounded-2xl border border-slate-200 bg-white p-5 text-[15px] leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-y"
          />
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className={words > WORD_LIMIT ? 'font-semibold text-red-700' : 'text-slate-500'}>
              {words} / {WORD_LIMIT} words{words > WORD_LIMIT ? `, ${words - WORD_LIMIT} over the limit` : ''}
            </span>
            {text && (
              <button onClick={() => { setText(''); setDebounced(''); setCounted(false); }} className="text-slate-500 hover:text-primary font-medium">
                Clear
              </button>
            )}
          </div>
          {/* On phones the feedback sits below the essay, out of sight. Without
              this, pasting an essay looked like nothing happened. */}
          {report.ready && (
            <button
              onClick={() => document.getElementById('checker-feedback')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="lg:hidden mt-4 w-full btn-primary"
            >
              See your feedback ↓
            </button>
          )}
        </div>

        <aside id="checker-feedback" className="min-w-0 space-y-4 lg:sticky lg:top-20 scroll-mt-20">
          <CraftStudio report={report} />

          {/* The ask comes after the value, never before it. */}
          {report.ready && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-primary">Keep this essay and every draft after it</p>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                A free account saves this essay, tracks your score across drafts, and adds feedback on the
                supplements for each school on your list.
              </p>
              <Link
                href="/auth/register?next=/dashboard/essays%3Fimport%3Dchecker"
                onClick={() => tracker.feature('essay-checker', 'signup_click')}
                className="mt-4 btn-primary w-full text-center"
              >
                Save my essay, free
              </Link>
              <p className="mt-2 text-xs text-slate-500 text-center">
                Already have an account?{' '}
                <Link href="/auth/login?next=/dashboard/essays%3Fimport%3Dchecker" className="font-semibold text-accent hover:underline">Sign in</Link>
              </p>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}
