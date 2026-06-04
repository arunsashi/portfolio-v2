import {ChangeDetectionStrategy, Component, effect, inject} from '@angular/core';
import { AnalyticsService } from '@core/services/analytics.service';
import { LoadingService } from '@core/services/loading.service';

/**
 * Full-screen, neo-brutalist page loader with a failure state.
 *
 * - Loading: bouncing accent dots until the initial data load settles.
 * - Failed (initial batch produced zero successes): a themed, lightly funny
 *   error card with a retry button.
 * - Otherwise: fades out and stays gone.
 *
 * Motion is gated behind prefers-reduced-motion for accessibility.
 */
@Component({
  selector: 'app-page-loader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-hidden]': '!loading() && !failed()',
    '[attr.aria-hidden]': '!loading() && !failed() ? "true" : null',
  },
  templateUrl: './page-loader.component.html',
  styleUrl: './page-loader.component.scss',
})
export class PageLoaderComponent {
  private readonly state = inject(LoadingService);
  private readonly analytics = inject(AnalyticsService);
  protected readonly loading = this.state.loading;
  protected readonly failed = this.state.failed;

  private errorTracked = false;

  constructor() {
    // Report when a visitor actually sees the error page (once per load).
    effect(() => {
      if (this.failed() && !this.errorTracked) {
        this.errorTracked = true;
        this.analytics.errorPageView();
      }
    });
  }

  protected retry(): void {
    location.reload();
  }
}
