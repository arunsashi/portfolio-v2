import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from '@core/services/analytics.service';
import { BackgroundService } from '@core/services/background.service';
import { FeatureFlagService } from '@core/services/feature-flag.service';
import { PageLoaderComponent } from '@shared/page-loader/page-loader.component';

/**
 * App shell for the Figma design ("Desktop - 1"): the page has no top nav —
 * it stacks the hero, ticker, and content sections in a centered column.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PageLoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  // Touch the flag service at startup so Statsig initializes once, early.
  private readonly flags = inject(FeatureFlagService);

  constructor() {
    // Enable autocapture + log the visit (referral source) once at startup.
    inject(AnalyticsService).init();
    // Per-visitor randomized glyph background (seeded by the visitor id).
    inject(BackgroundService).init();
  }
}
