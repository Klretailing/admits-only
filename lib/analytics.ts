/**
 * Internal Analytics Tracker
 *
 * Captures page views, clicks, session duration, scroll depth, feature usage,
 * nav engagement, and custom events. Batches events in-memory and flushes
 * every 30 seconds or when the buffer hits 50 events. Uses sendBeacon on
 * page unload for reliable delivery.
 *
 * All events are tagged with a sessionId (UUID per tab) and optionally a
 * userId (set when auth state is known). No PII is captured — only
 * behavioral signals and interaction patterns.
 *
 * Usage:
 *   import { tracker } from '@/lib/analytics';
 *   tracker.event('essay_analyzed', { wordCount: 350 });
 *   tracker.feature('college-heatmap', 'slider_adjusted', { gpa: 3.8 });
 *   tracker.nav('sidebar', '/dashboard/essays');
 */

interface AnalyticsEvent {
  type: 'pageview' | 'click' | 'session' | 'event' | 'feature' | 'nav' | 'scroll';
  timestamp: number;
  path: string;
  sessionId: string;
  userId?: string;
  referrer?: string;
  meta?: Record<string, string | number | boolean>;
  deviceInfo?: {
    screenWidth: number;
    screenHeight: number;
    userAgent: string;
    platform: string;
    language: string;
    isMobile: boolean;
    connection?: string;
  };
}

const FLUSH_INTERVAL = 30_000;
const BUFFER_LIMIT = 50;
const SESSION_KEY = 'ao_session_id';

/* ─── session timing ───
   The old measurement recorded duration once, on `beforeunload`, as wall time
   since the script loaded. Three things made that read short and noisy:
     • phones rarely fire `beforeunload` (switching apps or swiping a tab away
       skips it), so most mobile sessions were never recorded at all;
     • the clock restarted on every full page load while the session id did
       not, so one visit with a reload became several short "sessions";
     • wall time counts a tab left open overnight the same as writing.
   Now: ENGAGED time only accrues while the tab is visible AND the student did
   something (typed, clicked, scrolled, moved) in the last two minutes. It is
   persisted per tab so reloads continue the same session, and cumulative
   snapshots go out on visibilitychange/pagehide — which mobile browsers do
   fire — plus once a minute while engaged. Readers take the MAX per session.
   After 30 minutes of inactivity the next action starts a new session, the
   usual definition, so returning to an old tab counts as a return visit. */
const TICK_MS = 5_000;
const ACTIVE_WINDOW_MS = 120_000;
const SESSION_TIMEOUT_MS = 30 * 60_000;
const SNAPSHOT_EVERY_MS = 60_000;
const K = { start: 'ao_session_start', engaged: 'ao_engaged_ms', last: 'ao_last_active', pv: 'ao_pageviews' };

function ssGet(key: string): number {
  try { return Number(sessionStorage.getItem(key)) || 0; } catch { return 0; }
}
function ssSet(key: string, v: number) {
  try { sessionStorage.setItem(key, String(Math.round(v))); } catch { /* private mode */ }
}

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function getOrCreateSessionId(): string {
  if (typeof sessionStorage === 'undefined') return generateSessionId();
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getDeviceInfo(): AnalyticsEvent['deviceInfo'] {
  if (typeof window === 'undefined') return undefined;
  const nav = navigator as any;
  return {
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    userAgent: navigator.userAgent,
    platform: navigator.platform || '',
    language: navigator.language || '',
    isMobile: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
    connection: nav.connection?.effectiveType || undefined,
  };
}

class Analytics {
  private buffer: AnalyticsEvent[] = [];
  private sessionStart = 0;
  private currentPath = '';
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;
  private sessionId = '';
  private userId: string | undefined;
  private deviceInfo: AnalyticsEvent['deviceInfo'];
  private pageviewCount = 0;
  private clickCount = 0;
  private featureUseCount = 0;
  private maxScrollDepth = 0;
  private lastScrollPath = '';
  private featuresUsed = new Set<string>();
  private deviceInfoSent = false;
  private engagedMs = 0;
  private lastActivity = 0;
  private lastTick = 0;
  private lastSnapshotEngaged = -1;
  private lastSnapshotAt = 0;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private moveThrottle = 0;

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;
    this.sessionId = getOrCreateSessionId();
    const now = Date.now();
    const last = ssGet(K.last);
    if (last && now - last > SESSION_TIMEOUT_MS) {
      // Came back to an old tab: that is a new visit, not a 9-hour session.
      this.startNewSession(now, false);
    } else {
      // A reload continues the same session instead of restarting its clock.
      this.sessionStart = ssGet(K.start) || now;
      this.engagedMs = ssGet(K.engaged);
      this.pageviewCount = ssGet(K.pv);
    }
    this.lastActivity = now;
    this.lastTick = now;
    ssSet(K.start, this.sessionStart);
    ssSet(K.last, now);
    this.currentPath = window.location.pathname;
    this.deviceInfo = getDeviceInfo();

    this.pageview(this.currentPath);

    document.addEventListener('click', this.handleClick);
    window.addEventListener('beforeunload', this.handleUnload);
    window.addEventListener('pagehide', this.handleUnload);
    document.addEventListener('visibilitychange', this.handleVisibility);
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    for (const ev of ['keydown', 'pointerdown', 'touchstart', 'input', 'wheel'] as const) {
      window.addEventListener(ev, this.markActive, { passive: true, capture: true });
    }
    window.addEventListener('mousemove', this.handleMove, { passive: true });

    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);
    this.tickTimer = setInterval(this.tick, TICK_MS);
  }

  setUserId(id: string | undefined) {
    this.userId = id;
  }

  pageview(path: string) {
    this.pageviewCount++;
    if (typeof window !== 'undefined') ssSet(K.pv, this.pageviewCount);
    this.markActive();

    if (this.maxScrollDepth > 0 && this.lastScrollPath) {
      this.push({
        type: 'scroll',
        timestamp: Date.now(),
        path: this.lastScrollPath,
        sessionId: this.sessionId,
        userId: this.userId,
        meta: { maxDepthPercent: this.maxScrollDepth },
      });
    }
    this.maxScrollDepth = 0;
    this.lastScrollPath = path;

    const evt: AnalyticsEvent = {
      type: 'pageview',
      timestamp: Date.now(),
      path,
      sessionId: this.sessionId,
      userId: this.userId,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    };

    if (!this.deviceInfoSent) {
      evt.deviceInfo = this.deviceInfo;
      this.deviceInfoSent = true;
    }

    this.push(evt);
    this.currentPath = path;
  }

  event(name: string, meta?: Record<string, string | number | boolean>) {
    this.push({
      type: 'event',
      timestamp: Date.now(),
      path: this.currentPath,
      sessionId: this.sessionId,
      userId: this.userId,
      meta: { name, ...meta },
    });
  }

  feature(featureId: string, action: string, meta?: Record<string, string | number | boolean>) {
    this.featureUseCount++;
    this.featuresUsed.add(featureId);
    this.push({
      type: 'feature',
      timestamp: Date.now(),
      path: this.currentPath,
      sessionId: this.sessionId,
      userId: this.userId,
      meta: { featureId, action, ...meta },
    });
  }

  nav(source: 'sidebar' | 'mobile_tab' | 'breadcrumb' | 'in_page', targetPath: string) {
    this.push({
      type: 'nav',
      timestamp: Date.now(),
      path: this.currentPath,
      sessionId: this.sessionId,
      userId: this.userId,
      meta: { source, targetPath },
    });
  }

  private handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const el = target.closest('a, button, [data-track]') as HTMLElement | null;
    if (!el) return;

    this.clickCount++;

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
      sessionId: this.sessionId,
      userId: this.userId,
      meta: {
        tag: el.tagName.toLowerCase(),
        label: trackLabel,
        ...(href ? { href } : {}),
      },
    });
  };

  private handleScroll = () => {
    if (this.scrollTimer) clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const depth = Math.round((scrollTop / docHeight) * 100);
        if (depth > this.maxScrollDepth) this.maxScrollDepth = depth;
      }
    }, 150);
  };

  /* ─── engaged-time machinery ─── */

  private startNewSession(now: number, emitPrevious: boolean) {
    if (emitPrevious) { this.snapshot(true); this.flush(true); }
    this.sessionId = generateSessionId();
    try { sessionStorage.setItem(SESSION_KEY, this.sessionId); } catch { /* ignore */ }
    this.sessionStart = now;
    this.engagedMs = 0;
    this.pageviewCount = 0;
    this.clickCount = 0;
    this.featureUseCount = 0;
    this.featuresUsed.clear();
    this.lastSnapshotEngaged = -1;
    ssSet(K.start, now); ssSet(K.engaged, 0); ssSet(K.pv, 0);
  }

  private markActive = () => {
    const now = Date.now();
    if (this.lastActivity && now - this.lastActivity > SESSION_TIMEOUT_MS) {
      this.tick();                       // close out the old session's time
      this.startNewSession(now, true);
      this.lastTick = now;
    }
    this.lastActivity = now;
    ssSet(K.last, now);
  };

  private handleMove = () => {
    const now = Date.now();
    if (now - this.moveThrottle < 5_000) return;
    this.moveThrottle = now;
    this.markActive();
  };

  /** Accrue engaged time since the last tick, if the student was present for it. */
  private tick = () => {
    const now = Date.now();
    const elapsed = Math.min(now - this.lastTick, TICK_MS * 2); // a throttled/suspended tab can't bank hours
    this.lastTick = now;
    const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
    if (visible && now - this.lastActivity < ACTIVE_WINDOW_MS) {
      this.engagedMs += elapsed;
      ssSet(K.engaged, this.engagedMs);
    }
    if (now - this.lastSnapshotAt >= SNAPSHOT_EVERY_MS && Math.round(this.engagedMs / 1000) !== this.lastSnapshotEngaged) {
      this.snapshot(false);
    }
  };

  /** Cumulative state of this session. Several per session is expected;
      readers take the MAX per sessionId. */
  private snapshot(final: boolean) {
    const engagedSeconds = Math.round(this.engagedMs / 1000);
    this.lastSnapshotEngaged = engagedSeconds;
    this.lastSnapshotAt = Date.now();
    this.push({
      type: 'session',
      timestamp: Date.now(),
      path: this.currentPath,
      sessionId: this.sessionId,
      userId: this.userId,
      meta: {
        v: 2,
        engagedSeconds,
        durationSeconds: Math.round((Date.now() - this.sessionStart) / 1000),
        pageviewCount: this.pageviewCount,
        clickCount: this.clickCount,
        featureUseCount: this.featureUseCount,
        uniqueFeaturesUsed: this.featuresUsed.size,
        featuresUsedList: Array.from(this.featuresUsed).join(','),
        final,
      },
    });
  }

  private handleVisibility = () => {
    if (document.visibilityState === 'hidden') {
      this.tick();
      this.flushScroll();
      this.snapshot(true);
      this.flush(true);
    } else {
      this.lastTick = Date.now();
      this.markActive();
    }
  };

  private handleUnload = () => {
    this.tick();
    this.flushScroll();
    this.snapshot(true);
    this.flush(true);
  };

  private flushScroll() {
    if (this.maxScrollDepth > 0 && this.lastScrollPath) {
      this.push({
        type: 'scroll',
        timestamp: Date.now(),
        path: this.lastScrollPath,
        sessionId: this.sessionId,
        userId: this.userId,
        meta: { maxDepthPercent: this.maxScrollDepth },
      });
      this.maxScrollDepth = 0;
    }
  }

  private push(evt: AnalyticsEvent) {
    this.buffer.push(evt);
    if (this.buffer.length >= BUFFER_LIMIT) this.flush();
  }

  private flush(sync = false) {
    if (this.buffer.length === 0) return;
    const events = [...this.buffer];
    this.buffer = [];

    const body = JSON.stringify(events);
    if (sync && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', body);
    } else {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }

  destroy() {
    if (typeof window === 'undefined') return;
    document.removeEventListener('click', this.handleClick);
    window.removeEventListener('beforeunload', this.handleUnload);
    window.removeEventListener('pagehide', this.handleUnload);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    window.removeEventListener('scroll', this.handleScroll);
    for (const ev of ['keydown', 'pointerdown', 'touchstart', 'input', 'wheel'] as const) {
      window.removeEventListener(ev, this.markActive, { capture: true } as any);
    }
    window.removeEventListener('mousemove', this.handleMove);
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.scrollTimer) clearTimeout(this.scrollTimer);
    this.flush();
    this.initialized = false;
  }
}

export const tracker = new Analytics();
