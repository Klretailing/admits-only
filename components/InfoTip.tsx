/* ──────────────────────────────────────────────────────────────────────
   InfoTip: a small "i" button that explains a label on demand.

   Explanations a student needs once ("what does Reflection measure?")
   live behind this button instead of sitting as grey text under every
   score. What to DO next stays on screen; what a thing MEANS goes here.

   Behaviour
   • Click or tap toggles it; Escape or a click elsewhere closes it, and
     so does scrolling the button off screen. Opening one closes any other.
   • The bubble is rendered into <body> with fixed positioning, so the
     scrolling side panels on the essays page never clip it, and it is
     kept inside the viewport on phones.
   • Screen readers: the button says what it explains and whether it is
     open; the text is announced through a polite live region (the
     "toggletip" pattern), and the visual bubble is hidden from them so
     nothing is read twice.
   ────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const OPEN_EVENT = 'infotip:open';
const WIDTH = 288; // px, before clamping to the viewport

export default function InfoTip({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; above: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLDivElement>(null);

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  }, []);

  // Place the bubble under the button (or above it near the bottom of the
  // screen), centred on the button and clamped to the viewport.
  const place = useCallback(() => {
    const b = btn.current?.getBoundingClientRect();
    if (!b) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const width = Math.min(WIDTH, vw - 24);
    const left = Math.max(12, Math.min(b.left + b.width / 2 - width / 2, vw - width - 12));
    const h = bubble.current?.offsetHeight ?? 120;
    const above = b.bottom + 8 + h > vh - 8 && b.top - 8 - h > 8;
    setPos({ top: above ? b.top - 8 - h : b.bottom + 8, left, width, above });
  }, []);

  useEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onOther = (e: Event) => { if ((e as CustomEvent).detail !== id) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(true); } };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btn.current?.contains(t) || bubble.current?.contains(t)) return;
      setOpen(false);
    };
    // Follow the button while the page or a side panel scrolls; close only
    // once the button itself has left the screen. (Closing on any scroll
    // shut a tip the moment the browser scrolled a panel to show it.)
    let frame = 0;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = btn.current?.getBoundingClientRect();
        if (!r || r.bottom < 0 || r.top > window.innerHeight) setOpen(false);
        else place();
      });
    };
    window.addEventListener(OPEN_EVENT, onOther);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOther);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      cancelAnimationFrame(frame);
    };
  }, [open, id, close, place]);

  const toggle = () => {
    setOpen((o) => {
      if (!o) window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
      return !o;
    });
  };

  return (
    <span className={`relative inline-flex align-middle ${className}`}>
      <button
        ref={btn}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`What "${label}" means`}
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 ${open ? 'text-primary' : 'text-slate-500 hover:text-primary'}`}
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 9v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="10" cy="6.2" r="1.05" fill="currentColor" />
        </svg>
      </button>
      {/* What screen readers hear: filled only while open. */}
      <span role="status" className="sr-only">{open ? <>{label}: {children}</> : null}</span>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={bubble}
          aria-hidden
          className="fixed z-[200] rounded-xl border-[1.5px] border-ink bg-white p-3 text-left text-sm font-normal normal-case tracking-normal leading-snug text-slate-700 shadow-md"
          style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width ?? WIDTH, visibility: pos ? 'visible' : 'hidden' }}
        >
          <p className="font-semibold text-primary mb-1">{label}</p>
          <div className="space-y-1.5">{children}</div>
        </div>,
        document.body,
      )}
    </span>
  );
}
