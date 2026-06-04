import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, type OnDestroy, signal } from '@angular/core';
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
  /** Item id to scroll to + highlight (set by ticker links). */
  readonly item = input<string>('');

  private readonly data = inject(DataService);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly votesSvc = inject(NewsVoteService);
  protected readonly flags = inject(FeatureFlagService);
  protected readonly gates = FEATURE_GATES;

  // Deep-link highlight (?item=<id> from the ticker): once the data is in,
  // scroll the card into view and pulse it briefly.
  protected readonly highlightId = signal<string | null>(null);
  private highlightDone = false;
  private readonly highlightEffect = effect(() => {
    const target = this.item();
    const items = this.allItems();
    if (!target || this.highlightDone || items.length === 0) return;
    if (!items.some((i) => i.id === target)) return;
    this.highlightDone = true;

    const reduced =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    setTimeout(() => {
      const card = document.getElementById(`news-${target}`);
      card?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      // Set once and keep it: the animation plays a single iteration and
      // goes quiet. Removing the class later would hand the animation slot
      // back to the reveal directive's fade-in-up, replaying the entrance.
      this.highlightId.set(target);
      if (card && !reduced) {
        // Let the smooth scroll mostly land before the confetti pops.
        setTimeout(() => {
          this.spawnHighlightSparks(card);
        }, 350);
      }
    }, 150);
  });

  /** Card-scale confetti: theme-colored squares pop off the card's edges. */
  private spawnHighlightSparks(card: HTMLElement): void {
    const colors = [
      'var(--color-accent-yellow)',
      'var(--color-accent-neon-green)',
      'var(--color-accent-teal)',
      'var(--color-accent-hotpink)',
    ];
    const container = document.createElement('span');
    container.className = 'card-burst';
    container.setAttribute('aria-hidden', 'true');

    for (let i = 0; i < 12; i++) {
      const spark = document.createElement('span');
      spark.className = 'card-spark';
      const side = i % 4; // top / right / bottom / left
      const along = `${10 + Math.random() * 80}%`;
      const dist = 26 + Math.random() * 30;
      const drift = (Math.random() - 0.5) * 30;
      let dx = drift;
      let dy = drift;
      if (side === 0) { spark.style.left = along; spark.style.top = '0%'; dy = -dist; }
      if (side === 1) { spark.style.left = '100%'; spark.style.top = along; dx = dist; }
      if (side === 2) { spark.style.left = along; spark.style.top = '100%'; dy = dist; }
      if (side === 3) { spark.style.left = '0%'; spark.style.top = along; dx = -dist; }
      spark.style.setProperty('--dx', `${dx}px`);
      spark.style.setProperty('--dy', `${dy}px`);
      spark.style.setProperty('--rot', `${Math.round((Math.random() - 0.5) * 360)}deg`);
      spark.style.setProperty('--spark-color', colors[i % colors.length]);
      spark.style.animationDelay = `${Math.round(Math.random() * 180)}ms`;
      container.appendChild(spark);
    }

    card.appendChild(container);
    setTimeout(() => {
      container.remove();
    }, 1100);
  }

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

  /** The 6:00 UTC daily refresh expressed in the visitor's local time zone.
   *  Anchored to today's date so DST shifts are reflected correctly
   *  (DatePipe formats instants in the browser's zone). */
  protected readonly refreshLocalTime = ((): Date => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6));
  })();

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
