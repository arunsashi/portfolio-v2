import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DragScrollDirective } from '@core/directives/drag-scroll.directive';
import { MarqueeDirective } from '@core/directives/marquee.directive';
import type { NewsCategory, NewsItem } from '@core/entities';
import { DataService } from '@core/services/data.service';

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
  imports: [RouterLink, DragScrollDirective, MarqueeDirective],
  templateUrl: './ticker.component.html',
})
export class TickerComponent {
  private readonly data = inject(DataService);
  private readonly report = toSignal(this.data.getNews());

  protected readonly items = (): NewsItem[] => this.report()?.items ?? [];

  protected iconFor(cat: NewsCategory): string {
    return CATEGORY_ICONS[cat];
  }
}
