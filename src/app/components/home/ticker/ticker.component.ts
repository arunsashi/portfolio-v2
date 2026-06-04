import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DataService } from '@core/services/data.service';
import type { NewsCategory, NewsItem } from '@core/entities';

const CATEGORY_ICONS: Record<NewsCategory, string> = {
  'ui-ux': 'fa-solid fa-palette',
  api: 'fa-solid fa-plug',
  ai: 'fa-solid fa-robot',
  security: 'fa-solid fa-shield-halved',
  investing: 'fa-solid fa-chart-line',
};

@Component({
  selector: 'app-ticker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './ticker.component.html',
})
export class TickerComponent {
  private readonly data = inject(DataService);
  private readonly report = toSignal(this.data.getNews());

  protected readonly items = (): NewsItem[] => this.report()?.items ?? [];

  protected iconFor(cat: NewsCategory): string {
    return CATEGORY_ICONS[cat] ?? 'fa-solid fa-star';
  }
}
