import { inject, Injectable } from '@angular/core';
import { environment } from '@env';
import { StatsigService } from '@statsig/angular-bindings';
import { runStatsigAutoCapture } from '@statsig/web-analytics';

/**
 * Site analytics, powered by Statsig.
 *
 * `init()` turns on autocapture (page views, session duration / time-on-page,
 * clicks, web vitals) and logs a visit event tagged with the referral source.
 * Custom events cover the specific funnels: section views, Hire-Me click and
 * submit, and Linkly button clicks.
 *
 * All methods are no-ops when Statsig isn't configured (no key) or blocked, so
 * the site never depends on analytics being available.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly statsig = environment.statsigClientKey
    ? inject(StatsigService, { optional: true })
    : null;

  private started = false;
  private readonly seenSections = new Set<string>();

  init(): void {
    if (!this.statsig || this.started) return;
    this.started = true;

    try {
      runStatsigAutoCapture(this.statsig.getClient());
    } catch {
      /* best-effort */
    }

    const referrer = typeof document !== 'undefined' ? document.referrer : '';
    this.log('site_visit', undefined, {
      referrer: referrer || '(direct)',
      source: this.classifyReferrer(referrer),
    });
  }

  /** First time a section scrolls into view (once per session). */
  sectionView(section: string): void {
    if (!section || this.seenSections.has(section)) return;
    this.seenSections.add(section);
    this.log('section_view', section);
  }

  hireMeClick(source = 'modal'): void {
    this.log('hire_me_click', source);
  }

  hireMeSubmit(): void {
    this.log('hire_me_submit');
  }

  linklyClick(label: string, url: string): void {
    this.log('linkly_click', label, { url });
  }

  /** A project detail page was opened (route visit), keyed by slug. */
  projectDetailView(slug: string): void {
    this.log('project_detail_view', slug);
  }

  /** News page opened (route visit). */
  newsPageView(): void {
    this.log('news_page_view');
  }

  /** Seconds spent on the news page (logged when leaving via in-app nav). */
  newsPageTime(seconds: number): void {
    this.log('news_page_time', seconds);
  }

  /** Archive view opened within the news page. */
  archiveOpened(): void {
    this.log('archive_opened');
  }

  /** Seconds spent in the archive view. */
  archiveTime(seconds: number): void {
    this.log('archive_time', seconds);
  }

  /** A visitor opened a news item's source link. */
  newsSourceClick(itemId: string): void {
    this.log('news_source_click', undefined, { itemId });
  }

  /** A thumbs vote on a news item ('up' | 'down' | 'retract' | 'auto-up'). */
  newsVote(itemId: string, action: string): void {
    this.log('news_vote', action, { itemId });
  }

  /** The initial-load error page was shown (API outage as seen by a visitor). */
  errorPageView(): void {
    this.log('error_page_view', undefined, {
      path: globalThis.location.pathname,
    });
  }

  private classifyReferrer(ref: string): string {
    if (!ref) return 'Direct';
    let host = '';
    try {
      host = new URL(ref).hostname.replace(/^www\./, '');
    } catch {
      return 'Direct';
    }
    const self = globalThis.location.hostname;
    if (self && host.endsWith(self)) return 'Internal';
    if (host.includes('linkedin')) return 'LinkedIn';
    if (host.includes('instagram')) return 'Instagram';
    if (host.includes('github')) return 'GitHub';
    if (host.includes('t.co') || host.includes('twitter') || host.includes('x.com')) return 'X/Twitter';
    if (host.includes('google')) return 'Google';
    return host || 'Direct';
  }

  private log(name: string, value?: string | number, metadata?: Record<string, string>): void {
    if (!this.statsig) return;
    try {
      this.statsig.logEvent(name, value, metadata);
    } catch {
      /* best-effort */
    }
  }
}
