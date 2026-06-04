import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { RevealDirective } from '@core/directives/reveal.directive';
import type { NewsCategory } from '@core/entities';
import { AccentPipe } from '@core/pipes/accent.pipe';
import { DataService } from '@core/services/data.service';

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
  imports: [RouterLink, DatePipe, AccentPipe, RevealDirective],
  templateUrl: './news.component.html',
})
export class NewsComponent {
  readonly cat = input<string>('');

  private readonly data = inject(DataService);
  private readonly router = inject(Router);

  private readonly report = toSignal(this.data.getNews());

  protected readonly allItems = computed(() => this.report()?.items ?? []);
  protected readonly generatedAt = computed(() => this.report()?.generatedAt ?? null);

  protected readonly activeFilter = computed<NewsCategory | 'all'>(() => {
    const c = this.cat();
    return VALID_CATEGORIES.includes(c) ? (c as NewsCategory) : 'all';
  });

  protected readonly filteredItems = computed(() => {
    const filter = this.activeFilter();
    const items = this.allItems();
    return filter === 'all' ? items : items.filter((i) => i.category === filter);
  });

  protected readonly categoryCount = computed(() => {
    const items = this.allItems();
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

  protected setFilter(cat: NewsCategory | 'all'): void {
    void this.router.navigate([], {
      queryParams: { cat: cat === 'all' ? null : cat },
      queryParamsHandling: 'merge',
    });
  }
}
