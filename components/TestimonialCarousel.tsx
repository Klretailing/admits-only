import { useState, useEffect, useRef, useCallback } from 'react';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  highlight?: string;
}

const testimonials: Testimonial[] = [
  {
    quote: 'The mentorship plan felt like a premium concierge service. My daughter gained confidence and a standout portfolio that got her into her dream school.',
    name: 'Jasmine R.',
    role: 'Parent, Bay Area',
    highlight: 'Admitted to Stanford',
  },
  {
    quote: 'Their hybrid model blends rigorous instruction with genuine community. It is the future of supplemental education and we saw results within weeks.',
    name: 'Dr. Malik S.',
    role: 'School Administrator',
    highlight: 'Partner School',
  },
  {
    quote: 'The research lab and storytelling workshops made me feel prepared for both college applications and real leadership opportunities beyond the classroom.',
    name: 'Elena T.',
    role: 'Student, Grade 11',
    highlight: 'Admitted to MIT',
  },
  {
    quote: 'We explored three consulting services before finding AdmitsOnly. The difference was night and day — they truly understood our son as an individual.',
    name: 'Robert & Lisa K.',
    role: 'Parents, New York',
    highlight: 'Admitted to Columbia',
  },
  {
    quote: 'The SAT prep wasn\'t just drilling questions. They taught me how to think about problems differently. My score jumped 210 points in three months.',
    name: 'Marcus W.',
    role: 'Student, Grade 12',
    highlight: '1560 SAT Score',
  },
  {
    quote: 'As a single mom, I worried I couldn\'t give my daughter the same advantages. AdmitsOnly leveled the playing field completely.',
    name: 'Patricia D.',
    role: 'Parent, Chicago',
    highlight: 'Admitted to Northwestern',
  },
];

export default function TestimonialCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const totalSlides = testimonials.length;

  // Track screen size for responsive carousel math
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Auto-advance
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, totalSlides]);

  // On mobile: each card is 100% width, move 100% per slide
  // On desktop: each card is 33.33% width, move 33.33% per slide
  const slidePercent = isMobile ? 100 : 100 / 3;

  // Touch/swipe support for mobile
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setActiveIndex((prev) => (prev + 1) % totalSlides);
      } else {
        setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
      }
    }
    setIsPaused(false);
  }, [totalSlides]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Cards track */}
      <div
        className="overflow-hidden"
        ref={trackRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * slidePercent}%)` }}
        >
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="w-full md:w-1/3 flex-shrink-0 px-3"
            >
              <div className={`h-full rounded-2xl border p-7 transition-all duration-300 ${
                i === activeIndex
                  ? 'bg-white border-accent/20 shadow-xl shadow-accent/10 scale-[1.02]'
                  : 'bg-surface border-slate-100 scale-100'
              }`}>
                {/* Highlight tag */}
                {t.highlight && (
                  <span className={`inline-block mb-4 px-3 py-1 rounded-full text-xs font-bold ${
                    i === activeIndex
                      ? 'bg-accent/10 text-accent'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {t.highlight}
                  </span>
                )}

                {/* Quote icon */}
                <svg className={`w-7 h-7 mb-3 ${i === activeIndex ? 'text-accent/20' : 'text-slate-200'}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11 7.05V4a1 1 0 00-1-1H4a1 1 0 00-1 1v6a1 1 0 001 1h3a3 3 0 01-3 3v2a5 5 0 005-5V7.05h2zm10 0V4a1 1 0 00-1-1h-6a1 1 0 00-1 1v6a1 1 0 001 1h3a3 3 0 01-3 3v2a5 5 0 005-5V7.05h2z" />
                </svg>

                <p className="text-slate-600 leading-relaxed text-sm">&ldquo;{t.quote}&rdquo;</p>

                <div className="mt-6 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    i === activeIndex
                      ? 'bg-gradient-to-br from-accent to-purple-600'
                      : 'bg-slate-300'
                  }`}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-primary text-sm">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots + arrows */}
      <div className="mt-8 flex items-center justify-center gap-6">
        <button
          onClick={() => setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides)}
          className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:border-accent hover:text-accent transition-colors"
          aria-label="Previous testimonial"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeIndex ? 'w-8 bg-accent' : 'w-2 bg-slate-200 hover:bg-slate-300'
              }`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => setActiveIndex((prev) => (prev + 1) % totalSlides)}
          className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:border-accent hover:text-accent transition-colors"
          aria-label="Next testimonial"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
