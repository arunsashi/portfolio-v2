import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, type OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FEATURE_GATES } from '@core/const/feature-gates.const';
import { RevealDirective } from '@core/directives/reveal.directive';
import { VoteBurstDirective } from '@core/directives/vote-burst.directive';
import type { NewsCategory, NewsItem, NewsVoteDirection } from '@core/entities';
import { AccentPipe } from '@core/pipes/accent.pipe';
import { AnalyticsService } from '@core/services/analytics.service';
import { DataService } from '@core/services/data.service';
import { FeatureFlagService } from '@core/services/feature-flag.service';
import { NewsVoteService } from '@core/services/news-vote.service';

const VALID_CATEGORIES: string[] = ['ui-ux', 'api', 'ai', 'security', 'investing'];

const CATEGORY_ICONS: Record<NewsCategory | 'all', string> = {
  all: 'fa-solid fa-grip',
  'ui-ux': 'fa-solid fa-palette',
  api: 'fa-solid fa-plug',
  ai: 'fa-solid fa-robot',
  security: 'fa-solid fa-shield-halved',
  investing: 'fa-solid fa-chart-line',
};

@Component({
  selector: 'app-news',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, AccentPipe, RevealDirective, VoteBurstDirective],
  templateUrl: './news.component.html',
})
export class NewsComponent implements OnDestroy {
  readonly cat = input<string>('');

  private readonly data = inject(DataService);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly votesSvc = inject(NewsVoteService);
  protected readonly flags = inject(FeatureFlagService);
  protected readonly gates = FEATURE_GATES;

  // Dwell-time tracking (flushed on leave / archive close).
  private readonly pageEnteredAt = Date.now();
  private archiveEnteredAt: number | null = null;

  constructor() {
    this.analytics.newsPageView();
  }

  ngOnDestroy(): void {
    this.flushArchiveTime();
    this.analytics.newsPageTime(Math.round((Date.now() - this.pageEnteredAt) / 1000));
  }

  private flushArchiveTime(): void {
    if (this.archiveEnteredAt === null) return;
    this.analytics.archiveTime(Math.round((Date.now() - this.archiveEnteredAt) / 1000));
    this.archiveEnteredAt = null;
  }

  private readonly report = toSignal(this.data.getNews());

  // Archive mode: every item ever published (lazy-loaded on first toggle),
  // searchable, newest -> oldest (the API returns it pre-sorted).
  protected readonly showArchive = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly archiveLoading = signal(false);
  private readonly archiveItems = signal<NewsItem[]>([]);
  private readonly archiveLoaded = signal(false);

  protected readonly allItems = computed(() => this.report()?.items ?? []);

  /** Ids currently shown on the Latest view. */
  private readonly latestIds = computed(() => new Set(this.allItems().map((i) => i.id)));

  /** Archived items older than the current briefing — anything still on
   *  Latest is filtered out so the two views never repeat. */
  private readonly olderArchiveItems = computed<NewsItem[]>(() => {
    const current = this.latestIds();
    return this.archiveItems().filter((i) => !current.has(i.id));
  });

  /** Count for the Archive chip (null until the archive has been loaded). */
  protected readonly archiveCount = computed<number | null>(() =>
    this.archiveLoaded() && !this.archiveLoading() ? this.olderArchiveItems().length : null,
  );

  /** Items backing the current view. */
  private readonly baseItems = computed<NewsItem[]>(() =>
    this.showArchive() ? this.olderArchiveItems() : this.allItems(),
  );
  protected readonly generatedAt = computed(() => this.report()?.generatedAt ?? null);

  protected readonly activeFilter = computed<NewsCategory | 'all'>(() => {
    const c = this.cat();
    return VALID_CATEGORIES.includes(c) ? (c as NewsCategory) : 'all';
  });

  protected readonly filteredItems = computed(() => {
    const filter = this.activeFilter();
    const query = this.searchQuery().trim().toLowerCase();
    let items = this.baseItems();
    if (filter !== 'all') {
      items = items.filter((i) => i.category === filter);
    }
    if (this.showArchive() && query) {
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(query) ||
          i.summary.toLowerCase().includes(query) ||
          i.tags.some((t) => t.toLowerCase().includes(query)),
      );
    }
    return items;
  });

  protected readonly categoryCount = computed(() => {
    const items = this.baseItems();
    return {
      all: items.length,
      'ui-ux': items.filter((i) => i.category === 'ui-ux').length,
      api: items.filter((i) => i.category === 'api').length,
      ai: items.filter((i) => i.category === 'ai').length,
      security: items.filter((i) => i.category === 'security').length,
      investing: items.filter((i) => i.category === 'investing').length,
    };
  });

  protected readonly filterOptions = [
    { key: 'all' as const, label: 'All', icon: CATEGORY_ICONS.all },
    { key: 'ui-ux' as const, label: 'UI/UX', icon: CATEGORY_ICONS['ui-ux'] },
    { key: 'api' as const, label: 'API Dev', icon: CATEGORY_ICONS.api },
    { key: 'ai' as const, label: 'AI', icon: CATEGORY_ICONS.ai },
    { key: 'security' as const, label: 'Security', icon: CATEGORY_ICONS.security },
    { key: 'investing' as const, label: 'Markets', icon: CATEGORY_ICONS.investing },
  ];

  protected categoryIcon(cat: NewsCategory): string {
    return CATEGORY_ICONS[cat];
  }

  /** Switch between the latest report and the full archive. */
  protected setView(view: 'latest' | 'archive'): void {
    const archive = view === 'archive';
    if (archive === this.showArchive()) return;
    this.showArchive.set(archive);
    if (!archive) {
      this.searchQuery.set('');
      this.flushArchiveTime();
      return;
    }
    this.analytics.archiveOpened();
    this.archiveEnteredAt = Date.now();
    if (this.archiveLoaded()) return;
    this.archiveLoaded.set(true);
    this.archiveLoading.set(true);
    this.data.getNewsArchive().subscribe((items) => {
      this.archiveItems.set(items);
      this.archiveLoading.set(false);
    });
  }

  /** Opening the source counts as an implicit thumbs-up (never overrides). */
  protected onSourceClick(item: NewsItem): void {
    this.analytics.newsSourceClick(item.id);
    if (this.flags.isEnabled(this.gates.NEWS_VOTES)) {
      this.votesSvc.autoUpvote(item.id);
    }
  }

  protected castVote(item: NewsItem, dir: NewsVoteDirection): void {
    this.votesSvc.toggle(item.id, dir);
  }

  protected myVote(itemId: string): NewsVoteDirection | null {
    return this.votesSvc.myVote(itemId);
  }

  /** Server count + this session's optimistic adjustment, floored at 0.
   *  The visitor's own (localStorage) vote always counts as at least 1, so a
   *  refresh never shows a number that contradicts their pressed thumb while
   *  the cached server count catches up. */
  protected voteCount(item: NewsItem, dir: NewsVoteDirection): number {
    const base = (dir === 'up' ? item.votesUp : item.votesDown) ?? 0;
    const count = Math.max(0, base + this.votesSvc.delta(item.id, dir));
    return this.myVote(item.id) === dir ? Math.max(count, 1) : count;
  }

  protected onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected setFilter(cat: NewsCategory | 'all'): void {
    void this.router.navigate([], {
      queryParams: { cat: cat === 'all' ? null : cat },
      queryParamsHandling: 'merge',
    });
  }
}
