/**
 * Internal Analytics Tracker
 *
 * Captures page views, clicks, session duration, and custom events.
 * Stores events in-memory for now — swap the `flush` function for
 * a real endpoint (e.g. POST /api/analytics) when you connect a database.
 *
 * Usage:
 *   import { tracker } from '@/lib/analytics';
 *   tracker.event('cta_click', { button: 'Start Free Trial' });
 */

interface AnalyticsEvent {
  type: 'pageview' | 'click' | 'session' | 'event';
  timestamp: number;
  path: string;
  referrer?: string;
  meta?: Record<string, string | number | boolean>;
}

const FLUSH_INTERVAL = 30_000; // 30 seconds
const BUFFER_LIMIT = 50;

class Analytics {
  private buffer: AnalyticsEvent[] = [];
  private sessionStart: number = 0;
  private currentPath: string = '';
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  /** Call once from _app.tsx on mount */
  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;
    this.sessionStart = Date.now();
    this.currentPath = window.location.pathname;

    // Record initial pageview
    this.pageview(this.currentPath);

    // Global click tracking (delegated)
    document.addEventListener('click', this.handleClick);

    // Session end tracking
    window.addEventListener('beforeunload', this.handleUnload);

    // Periodic flush
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);
  }

  /** Record a pageview */
  pageview(path: string) {
    this.push({
      type: 'pageview',
      timestamp: Date.now(),
      path,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    });
    this.currentPath = path;
  }

  /** Record a custom event */
  event(name: string, meta?: Record<string, string | number | boolean>) {
    this.push({
      type: 'event',
      timestamp: Date.now(),
      path: this.currentPath,
      meta: { name, ...meta },
    });
  }

  /** Delegated click handler — captures button/link text and data attributes */
  private handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const el = target.closest('a, button, [data-track]') as HTMLElement | null;
    if (!el) return;

    const trackLabel =
      el.getAttribute('data-track') ||
      el.getAttribute('aria-label') ||
      el.textContent?.trim().slice(0, 60) ||
      '';

    const href = (el as HTMLAnchorElement).href || '';

    this.push({
      type: 'click',
      timestamp: Date.now(),
      path: this.currentPath,
      meta: {
        tag: el.tagName.toLowerCase(),
        label: trackLabel,
        ...(href ? { href } : {}),
      },
    });
  };

  /** Record session duration on page unload */
  private handleUnload = () => {
    const duration = Math.round((Date.now() - this.sessionStart) / 1000);
    this.push({
      type: 'session',
      timestamp: Date.now(),
      path: this.currentPath,
      meta: { duration_seconds: duration },
    });
    this.flush(true); // sync flush
  };

  private push(evt: AnalyticsEvent) {
    this.buffer.push(evt);
    if (this.buffer.length >= BUFFER_LIMIT) this.flush();
  }

  /**
   * Flush buffered events.
   * Replace the body of this method with a real API call when ready:
   *   await fetch('/api/analytics', { method: 'POST', body: JSON.stringify(events) });
   */
  private flush(sync = false) {
    if (this.buffer.length === 0) return;
    const events = [...this.buffer];
    this.buffer = [];

    const body = JSON.stringify(events);
    if (sync && navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', body);
    } else {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => {
        // silent fail — analytics should never block the user
      });
    }
  }

  destroy() {
    if (typeof window === 'undefined') return;
    document.removeEventListener('click', this.handleClick);
    window.removeEventListener('beforeunload', this.handleUnload);
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush();
    this.initialized = false;
  }
}

export const tracker = new Analytics();
