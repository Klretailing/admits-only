import { useEffect, useState } from 'react';
import { useInView } from '../hooks/useAnimations';

const essayText = `The fluorescent lights of the community center hummed overhead as I unpacked boxes of donated textbooks. At fifteen, I had started a free tutoring program for immigrant families in my neighborhood — families like mine, who had arrived in the Bay Area speaking little English and knowing even less about the American education system.

What began as Saturday morning sessions with three students grew into something I never expected. By junior year, our program served forty-two students across three locations. But the numbers don't capture what mattered most: watching Maria, a shy eighth-grader from Guatemala, stand up at our year-end showcase and deliver her first presentation in English. Or seeing David, whose parents worked double shifts, receive his first A in algebra and tape it to the refrigerator like a trophy.

These moments taught me that education isn't just about content — it's about belief. Every student who walked through our doors carried the weight of their family's expectations and their own quiet doubts. My job wasn't just to teach quadratic equations or essay structure. It was to show them that their stories mattered, that their voices deserved to be heard.`;

export default function EssayMockup() {
  const { ref, isVisible } = useInView(0.2);
  const [displayedChars, setDisplayedChars] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    // Start with some text already visible, then type the rest
    const initialChars = 380;
    setDisplayedChars(initialChars);

    const interval = setInterval(() => {
      setDisplayedChars((prev) => {
        if (prev >= essayText.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isVisible]);

  const visibleText = essayText.slice(0, displayedChars);
  const showCursor = displayedChars < essayText.length && isVisible;

  return (
    <div ref={ref} className="relative">
      {/* Window chrome */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Personal Essay — Common Application</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="hidden sm:inline">650 words</span>
            <span className="badge-accent !text-[10px] !py-0.5">Draft 3</span>
          </div>
        </div>

        {/* Essay header */}
        <div className="px-8 pt-6 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 9L12 16L22 9L12 2Z" fill="white" opacity="0.9" />
                <path d="M4 11V17L12 22L20 17V11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-accent uppercase tracking-wider">AdmitsOnly Essay Coach</p>
              <p className="text-[11px] text-slate-400">Reviewed by Sarah M. &middot; Senior Essay Strategist</p>
            </div>
          </div>
          <p className="text-sm font-bold text-primary">
            Prompt: Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.
          </p>
        </div>

        {/* Essay body */}
        <div className="px-8 py-6 min-h-[280px] max-h-[340px] overflow-hidden relative">
          <p className="text-sm text-slate-700 leading-[1.9] font-serif whitespace-pre-wrap">
            {visibleText}
            {showCursor && (
              <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse" />
            )}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </div>

        {/* Coach feedback bar */}
        <div className="px-8 py-4 bg-gradient-to-r from-accent/[0.03] to-purple-50/50 border-t border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-slate-600">Strong narrative voice</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-slate-600">Authentic detail</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-slate-600">Tighten conclusion</span>
              </div>
            </div>
            <span className="text-xs font-bold text-accent">Score: 9.2/10</span>
          </div>
        </div>
      </div>

      {/* Floating annotation cards */}
      <div className={`absolute -right-4 top-24 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-3 max-w-[180px]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-green-700">Vivid Opening</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">Sensory detail draws the reader in immediately.</p>
        </div>
      </div>

      <div className={`absolute -left-4 bottom-32 transition-all duration-700 delay-700 ${isVisible ? 'opacity-100 -translate-x-0' : 'opacity-0 -translate-x-8'}`}>
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-3 max-w-[180px]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
              <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-accent">Impact Story</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">Specific names and outcomes show genuine impact.</p>
        </div>
      </div>
    </div>
  );
}
