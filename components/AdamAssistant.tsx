import { useState, useRef, useEffect, useCallback } from 'react';

/* ──────────────────────────────────────────────────────────────
   Adam — AI college-admissions assistant.
   Distinct glowing ORANGE theme (deliberately different from the
   site's indigo accent). Lives docked on the right edge and is
   launched from a pinned entry near the bottom of the sidebar.

   Endpoint contract:
   - POST   /api/ai/adam  { message } -> { reply, available:true }
              on failure 503 { available:false, error } or 429
   - GET    /api/ai/adam            -> { messages:[{role,content}], available }
   - DELETE /api/ai/adam            -> clears the conversation
   ────────────────────────────────────────────────────────────── */

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING =
  "Hey, I'm Adam — your admissions guide. I've got your profile in front of me. What's on your mind?";

const SUGGESTED_PROMPTS = [
  'Help me brainstorm my personal statement',
  'Is my school list balanced?',
  'What should I focus on this month?',
  'How do I make my activities stronger?',
];

/* ── Adam avatar mark: a friendly orange compass/spark ─────────── */
function AdamMark({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5z"
      />
    </svg>
  );
}

/* ── Render Adam's prose: paragraphs split on blank lines, light **bold** ── */
function renderReply(text: string) {
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs.map((para, pi) => {
    const lines = para.split('\n');
    return (
      <p key={pi} className={pi > 0 ? 'mt-3' : ''}>
        {lines.map((line, li) => {
          const parts = line.split('**').map((part, i) =>
            i % 2 === 1 ? (
              <strong key={i} className="font-semibold text-slate-900">
                {part}
              </strong>
            ) : (
              <span key={i}>{part}</span>
            )
          );
          return (
            <span key={li}>
              {parts}
              {li < lines.length - 1 && <br />}
            </span>
          );
        })}
      </p>
    );
  });
}

/* ══════════════════════════════════════════════════════════════
   Sidebar launcher — pinned near the bottom of the nav.
   Stands out in ORANGE with a gentle pulsing glow so Adam reads
   as "alive" and distinct from the indigo nav items.
   ══════════════════════════════════════════════════════════════ */
export function AdamNavButton({
  onClick,
  active,
}: {
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
        active
          ? 'bg-orange-500/10 text-orange-700'
          : 'text-orange-700 hover:bg-orange-500/10'
      }`}
    >
      <span className="relative flex items-center justify-center w-7 h-7 flex-shrink-0">
        {/* soft radial glow behind the avatar — intentional attention affordance */}
        <span className="absolute inset-0 rounded-full bg-orange-500/40 blur-md animate-pulse" />
        <span className="relative w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-[0_0_12px_rgba(249,115,22,0.55)]">
          <AdamMark className="w-4 h-4" />
        </span>
      </span>
      <span className="flex-1 text-left">Ask Adam</span>
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   Floating orange launcher for mobile (bottom-right).
   ══════════════════════════════════════════════════════════════ */
export function AdamFloatingButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.6)] active:scale-95 transition-transform"
      title="Ask Adam"
      aria-label="Ask Adam"
    >
      <span className="absolute inset-0 rounded-full bg-orange-500/40 blur-lg animate-pulse" />
      <AdamMark className="relative w-6 h-6" />
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   Adam's home — a docked side panel that slides in from the right.
   ~400px on desktop, full-screen sheet on mobile.
   ══════════════════════════════════════════════════════════════ */
export function AdamPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [available, setAvailable] = useState<boolean>(true);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Restore the persisted conversation the first time Adam is opened.
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/ai/adam');
      const data = await res.json();
      if (data.available === false) {
        setAvailable(false);
      } else {
        setAvailable(true);
      }
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      // Network hiccup — leave Adam available and show the greeting.
      setMessages([]);
    }
    setLoadingHistory(false);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (open && !loaded) {
      loadHistory();
    }
  }, [open, loaded, loadHistory]);

  // Lock body scroll while the full-screen sheet is up on mobile.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function send(overrideMessage?: string) {
    const text = (overrideMessage ?? input).trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setStatusNote(null);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/adam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (res.status === 429) {
        setLoading(false);
        setStatusNote("Give me a sec — lots of students right now.");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.status === 503 || data.available === false) {
        setAvailable(false);
        setLoading(false);
        return;
      }

      setAvailable(true);
      if (data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setStatusNote("I couldn't reach the server just then — mind trying again?");
    }
    setLoading(false);
  }

  async function startFresh() {
    try {
      await fetch('/api/ai/adam', { method: 'DELETE' });
    } catch {
      /* best-effort */
    }
    setMessages([]);
    setStatusNote(null);
    inputRef.current?.focus();
  }

  const showGreeting = !loadingHistory && available && messages.length === 0;

  return (
    <>
      {/* Backdrop — mobile sheet + a soft dim on desktop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/30 transition-opacity duration-300 lg:bg-slate-900/10 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Docked panel — slides in from the right edge */}
      <aside
        className={`fixed z-50 flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-out
          top-0 left-0 right-0 h-screen lg:left-auto lg:w-[400px] xl:w-[420px]
          lg:border-l lg:border-orange-100
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ height: '100dvh' }}
        role="dialog"
        aria-label="Adam, your admissions guide"
      >
        {/* Header — deep orange gradient: keeps Adam's identity while giving
            white text a 5.2:1+ contrast ratio (orange-500 was only 2.8:1). */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-br from-orange-700 to-orange-800 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="relative flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-white/30 blur-md animate-pulse" />
              <span className="relative w-10 h-10 rounded-full bg-white/20 ring-2 ring-white/40 flex items-center justify-center">
                <AdamMark className="w-5 h-5" />
              </span>
            </span>
            <div>
              <h3 className="text-base font-bold leading-tight">Adam</h3>
              <p className="text-[11px] text-white/90 leading-tight">Your admissions guide</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={startFresh}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-all"
              title="Start fresh"
              aria-label="Start a fresh conversation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-all"
              title="Close"
              aria-label="Close Adam"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 bg-orange-50/30" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Unavailable state — warm, never a raw error */}
          {!available && (
            <div className="flex flex-col items-center text-center py-10 px-4">
              <span className="relative flex items-center justify-center mb-4">
                <span className="absolute inset-0 rounded-full bg-orange-500/25 blur-lg" />
                <span className="relative w-14 h-14 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-[0_0_18px_rgba(249,115,22,0.5)]">
                  <AdamMark className="w-7 h-7" />
                </span>
              </span>
              <p className="text-sm font-semibold text-slate-700">Adam is taking a quick break</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
                He&apos;ll be back soon — check back in a little while.
              </p>
            </div>
          )}

          {available && loadingHistory && (
            <div className="flex justify-center py-10">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* First-run greeting + suggested prompts */}
          {showGreeting && (
            <div>
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(249,115,22,0.45)]">
                  <AdamMark className="w-4 h-4" />
                </div>
                <div className="max-w-[85%] bg-white rounded-2xl rounded-tl-md border border-slate-100 px-4 py-3 text-[13.5px] leading-relaxed text-slate-700 shadow-sm">
                  {GREETING}
                </div>
              </div>
              <div className="mt-4 space-y-2 pl-10">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
                  Try asking
                </p>
                {SUGGESTED_PROMPTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="block w-full text-left px-3.5 py-2.5 rounded-xl bg-white border border-slate-100 text-[13px] text-slate-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 transition-colors shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {available &&
            messages.map((msg, i) =>
              msg.role === 'assistant' ? (
                <div key={i} className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(249,115,22,0.45)]">
                    <AdamMark className="w-4 h-4" />
                  </div>
                  <div className="max-w-[85%] bg-white rounded-2xl rounded-tl-md border border-slate-100 px-4 py-3 text-[13.5px] leading-relaxed text-slate-700 shadow-sm">
                    {renderReply(msg.content)}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] bg-orange-500 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap shadow-sm">
                    {msg.content}
                  </div>
                </div>
              )
            )}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(249,115,22,0.45)]">
                <AdamMark className="w-4 h-4" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-md border border-slate-100 px-4 py-3 shadow-sm">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-[11px] text-slate-400 ml-1.5">Adam is thinking…</span>
                </div>
              </div>
            </div>
          )}

          {/* Transient status note (429 / network) */}
          {statusNote && (
            <div className="text-center">
              <span className="inline-block text-[12px] text-orange-700 bg-orange-100 border border-orange-200 rounded-full px-3.5 py-1.5">
                {statusNote}
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        {available && (
          <div className="p-3 border-t border-slate-100 flex-shrink-0 bg-white safe-area-pb">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Message Adam…"
                rows={1}
                disabled={loading}
                className="flex-1 px-3.5 py-2.5 text-[14px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-400 resize-none leading-relaxed disabled:opacity-60"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="p-2.5 bg-orange-500 text-white rounded-xl disabled:opacity-40 hover:bg-orange-600 transition-colors flex-shrink-0"
                aria-label="Send message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
