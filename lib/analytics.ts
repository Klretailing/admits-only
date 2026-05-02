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

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;
    this.sessionId = getOrCreateSessionId();
    this.sessionStart = Date.now();
    this.currentPath = window.location.pathname;
    this.deviceInfo = getDeviceInfo();

    this.pageview(this.currentPath);

    document.addEventListener('click', this.handleClick);
    window.addEventListener('beforeunload', this.handleUnload);
    window.addEventListener('scroll', this.handleScroll, { passive: true });

    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);
  }

  setUserId(id: string | undefined) {
    this.userId = id;
  }

  pageview(path: string) {
    this.pageviewCount++;

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

  private handleUnload = () => {
    const durationSeconds = Math.round((Date.now() - this.sessionStart) / 1000);

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

    this.push({
      type: 'session',
      timestamp: Date.now(),
      path: this.currentPath,
      sessionId: this.sessionId,
      userId: this.userId,
      meta: {
        durationSeconds,
        pageviewCount: this.pageviewCount,
        clickCount: this.clickCount,
        featureUseCount: this.featureUseCount,
        uniqueFeaturesUsed: this.featuresUsed.size,
        featuresUsedList: Array.from(this.featuresUsed).join(','),
      },
    });

    this.flush(true);
  };

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
    window.removeEventListener('scroll', this.handleScroll);
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.scrollTimer) clearTimeout(this.scrollTimer);
    this.flush();
    this.initialized = false;
  }
}

export const tracker = new Analytics();
