import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';
import {
  TRAITS,
  ARCHETYPES,
  STORY_SEEDS,
  recommendArchetypes,
  suggestBeatIndex,
  buildOutline,
  type Archetype,
} from '../../lib/storyBuilder';

const BEAT_TINTS = [
  'bg-slate-100 text-slate-600',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
];

export default function StoryBuilder() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  // ---- inputs ----
  const [traits, setTraits] = useState<string[]>([]);
  const [experiences, setExperiences] = useState<string[]>(['', '', '']);
  const [built, setBuilt] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [seedTheme, setSeedTheme] = useState<string>('All');

  const experiencesText = experiences.join('  ');

  const recommendations = useMemo(
    () => (built ? recommendArchetypes(traits, experiencesText) : []),
    [built, traits, experiencesText],
  );

  const selected: Archetype | null = useMemo(() => {
    if (!selectedId) return null;
    return ARCHETYPES.find((a) => a.id === selectedId) || null;
  }, [selectedId]);

  const seedThemes = useMemo(() => ['All', ...Array.from(new Set(STORY_SEEDS.map((s) => s.theme)))], []);
  const visibleSeeds = seedTheme === 'All' ? STORY_SEEDS : STORY_SEEDS.filter((s) => s.theme === seedTheme);

  function toggleTrait(key: string) {
    setTraits((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }
  function setExperience(i: number, val: string) {
    setExperiences((cur) => cur.map((e, idx) => (idx === i ? val : e)));
  }
  function addExperience() {
    setExperiences((cur) => (cur.length >= 6 ? cur : [...cur, '']));
  }
  function build() {
    const recs = recommendArchetypes(traits, experiencesText);
    setBuilt(true);
    setSelectedId(recs[0]?.archetype.id || ARCHETYPES[0].id);
    setTimeout(() => document.getElementById('sb-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }
  function reset() {
    setBuilt(false);
    setSelectedId(null);
    setTraits([]);
    setExperiences(['', '', '']);
  }
  async function copyOutline() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(buildOutline(selected, experiences));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  }

  const filledExperiences = experiences.map((e) => e.trim()).filter(Boolean);
  const canBuild = traits.length > 0 || filledExperiences.length > 0;

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-slate-400">Loading…</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>Story Builder | AdmitsOnly Dashboard</title></Head>

      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/dashboard/essays')} className="p-1.5 -ml-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-50 transition-colors" title="Back to Essays">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h1 className="text-xl lg:text-2xl font-bold font-display text-primary tracking-tight">Story Builder</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500 max-w-xl">
              Stuck on what to write about? Tell us a bit about you and a few things you’ve lived through — we’ll suggest the story angles that fit you best and hand you a beat-by-beat outline.
            </p>
          </div>
        </div>

        {/* ── STEP 1: Inputs ── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 lg:p-6 space-y-6">
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-bold text-primary">1. Which of these sound like you?</p>
              <span className="text-xs text-slate-400">{traits.length} picked</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 mb-3">Tap any that fit — no wrong answers.</p>
            <div className="flex flex-wrap gap-2">
              {TRAITS.map((t) => {
                const on = traits.includes(t.key);
                return (
                  <button
                    key={t.key}
                    onClick={() => toggleTrait(t.key)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      on ? 'bg-accent text-white border-accent shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-accent/40 hover:text-accent'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-primary">2. Toss in a few things you’ve experienced</p>
            <p className="text-xs text-slate-400 mt-0.5 mb-3">
              Just a phrase each — a moment, a challenge, a weird hobby, a family thing, a win, a loss. Don’t overthink it.
            </p>
            <div className="space-y-2">
              {experiences.map((e, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <input
                    value={e}
                    onChange={(ev) => setExperience(i, ev.target.value)}
                    placeholder={
                      i === 0 ? 'e.g. I moved schools in 10th grade and knew no one' :
                      i === 1 ? 'e.g. I fix and resell old bikes on weekends' :
                      'e.g. I take care of my little brother after school'
                    }
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm text-primary placeholder:text-slate-300 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                  />
                </div>
              ))}
            </div>
            {experiences.length < 6 && (
              <button onClick={addExperience} className="mt-2 text-xs font-semibold text-accent hover:underline">+ Add another</button>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={build}
              disabled={!canBuild}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-accent rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {built ? 'Rebuild my storylines' : 'Build my storylines →'}
            </button>
            {built && (
              <button onClick={reset} className="text-sm font-medium text-slate-400 hover:text-slate-600">Start over</button>
            )}
            {!canBuild && <span className="text-xs text-slate-400">Pick a trait or add one experience to begin.</span>}
          </div>
        </div>

        {/* ── STEP 2: Recommendations + Timeline ── */}
        {built && (
          <div id="sb-results" className="space-y-6">
            <div>
              <p className="text-sm font-bold text-primary mb-1">Your best-fit story angles</p>
              <p className="text-xs text-slate-400 mb-3">Pick one to see how to stitch it together. You can try each.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {recommendations.map(({ archetype: a, reasons }, idx) => {
                  const active = selectedId === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedId(a.id)}
                      className={`text-left p-4 rounded-2xl border transition-all ${
                        active ? 'border-accent ring-2 ring-accent/15 bg-accent/[0.03]' : 'border-slate-200 hover:border-accent/40 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-white bg-gradient-to-r ${a.color}`}>
                          {idx === 0 ? 'Top match' : `Option ${idx + 1}`}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-primary">{a.name}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">{a.tagline}</p>
                      {reasons.length > 0 && (
                        <p className="text-[11px] text-accent mt-2 font-medium">Why: {reasons.join(', ')}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected archetype → timeline */}
            {selected && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 lg:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold font-display text-primary">{selected.name}</h2>
                    <p className="text-sm text-slate-500">{selected.bestFor}</p>
                  </div>
                  <button onClick={copyOutline} className="self-start px-4 py-2 text-sm font-semibold text-accent border border-accent/30 rounded-xl hover:bg-accent/5 transition-colors flex-shrink-0">
                    {copied ? '✓ Copied outline' : 'Copy outline'}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 text-sm">
                  <div className="flex-1 p-3 rounded-xl bg-surface border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Opening idea</p>
                    <p className="text-slate-600">{selected.hook}</p>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-surface border border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Landing the point</p>
                    <p className="text-slate-600">{selected.insight}</p>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Your story timeline</p>
                  <div className="relative">
                    {/* connecting line (vertical on mobile, horizontal on lg) */}
                    <div className="hidden lg:block absolute top-4 left-0 right-0 h-0.5 bg-slate-100" />
                    <div className="grid gap-4 lg:grid-cols-5">
                      {selected.beats.map((beat, i) => {
                        const mapped = filledExperiences.filter((e) => suggestBeatIndex(e) === i);
                        return (
                          <div key={beat.label} className="relative">
                            <div className="flex lg:flex-col items-start lg:items-center gap-3 lg:gap-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 relative z-10 ring-4 ring-white ${BEAT_TINTS[i]}`}>
                                {i + 1}
                              </div>
                              <div className="flex-1 lg:mt-3 lg:text-center">
                                <p className="text-sm font-bold text-primary">{beat.label}</p>
                                <p className="text-xs text-slate-500 mt-1 leading-snug lg:min-h-[3.5rem]">{beat.guide}</p>
                                {mapped.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {mapped.map((m, k) => (
                                      <p key={k} className="text-[11px] text-left inline-block bg-accent/8 text-accent rounded-lg px-2 py-1 leading-snug">
                                        {m}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {filledExperiences.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-4">
                      Your experiences are slotted into the beat they most likely fit. Move them around in your head — the timeline is a starting map, not a rulebook.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Spark library (always available) ── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-bold text-primary">Idea sparks</p>
              <p className="text-xs text-slate-400">Just browsing? Skim these for a jolt of inspiration.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {seedThemes.map((th) => (
                <button
                  key={th}
                  onClick={() => setSeedTheme(th)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    seedTheme === th ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {th}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleSeeds.map((s) => (
              <div key={s.id} className="p-4 rounded-xl bg-surface border border-slate-100 hover:border-accent/30 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.theme}</span>
                <p className="text-sm font-semibold text-primary mt-1">{s.title}</p>
                <p className="text-xs text-slate-500 mt-1.5 leading-snug">{s.spark}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
