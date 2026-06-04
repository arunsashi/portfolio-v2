import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';

import { AnalyticsService } from '@core/analytics/analytics.service';
import { LoadingService } from '@core/loading/loading.service';

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
  template: `
    @if (failed()) {
      <div class="pl__card pl__card--error" role="alert">
        <span class="pl__sticker" aria-hidden="true">Oops!</span>
        <span class="pl__emoji" aria-hidden="true">🚀💥</span>
        <h1 class="pl__title">Houston, we have a problem.</h1>
        <p class="pl__body">
          My data API appears to be taking an unscheduled nap. It's not you —
          it's my cloud. Give it a minute, then try again.
        </p>
        <button type="button" class="pl__retry" (click)="retry()">
          <span aria-hidden="true">🔄</span> Try again
        </button>
        <p class="pl__small">Still broken? The hamsters have been notified. 🐹</p>
      </div>
    } @else {
      <div class="pl__card" role="status" aria-live="polite">
        <div class="pl__dots" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        <p class="pl__text">Loading</p>
        <span class="pl__sr">Loading content, please wait.</span>
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: grid;
        place-items: center;
        background: var(--color-canvas, #f5f5dc);
        opacity: 1;
        transition: opacity 0.45s ease;
      }

      :host(.is-hidden) {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }

      .pl__card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.25rem;
        padding: 2rem 2.5rem;
        background: var(--color-surface, #fff);
        border: 4px solid var(--color-ink, #1a1a1a);
        border-radius: 1rem;
        box-shadow: 8px 8px 0 0 var(--color-ink, #000);
      }

      /* ---- loading state ---- */

      .pl__dots {
        display: flex;
        gap: 0.75rem;
      }

      .pl__dots span {
        width: 1rem;
        height: 1rem;
        border: 3px solid var(--color-ink, #1a1a1a);
        background: var(--color-accent-pink, #ff5da2);
        animation: pl-bounce 0.9s infinite ease-in-out;
      }

      .pl__dots span:nth-child(2) {
        background: var(--color-accent-teal, #2ec4b6);
        animation-delay: 0.15s;
      }

      .pl__dots span:nth-child(3) {
        background: var(--color-accent-yellow, #ffd23f);
        animation-delay: 0.3s;
      }

      .pl__text {
        margin: 0;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--color-ink, #1a1a1a);
        font-family: 'Space Mono', ui-monospace, monospace;
      }

      /* ---- error state ---- */

      .pl__card--error {
        max-width: 26rem;
        margin: 1rem;
        gap: 0.9rem;
        text-align: center;
      }

      .pl__sticker {
        display: inline-block;
        transform: rotate(-3deg);
        background: var(--color-ink, #1a1a1a);
        color: #fff;
        border: 3px solid var(--color-ink, #1a1a1a);
        box-shadow: 4px 4px 0 0 var(--color-accent-pink, #ff5da2);
        padding: 0.35rem 1rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-family: 'Space Mono', ui-monospace, monospace;
      }

      .pl__emoji {
        font-size: 2.6rem;
        line-height: 1;
      }

      .pl__title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 900;
        text-transform: uppercase;
        color: var(--color-ink, #1a1a1a);
      }

      .pl__body {
        margin: 0;
        font-weight: 600;
        line-height: 1.5;
        color: var(--color-ink, #1a1a1a);
        opacity: 0.85;
      }

      .pl__retry {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.25rem;
        padding: 0.8rem 1.6rem;
        background: var(--color-accent-pink, #ff5da2);
        border: 4px solid var(--color-ink, #1a1a1a);
        box-shadow: 4px 4px 0 0 var(--color-ink, #000);
        font-weight: 900;
        text-transform: uppercase;
        color: var(--color-ink, #1a1a1a);
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }

      .pl__retry:hover,
      .pl__retry:focus-visible {
        transform: translate(-2px, -2px);
        box-shadow: 6px 6px 0 0 var(--color-ink, #000);
      }

      .pl__retry:active {
        transform: translate(2px, 2px);
        box-shadow: 2px 2px 0 0 var(--color-ink, #000);
      }

      .pl__small {
        margin: 0;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-ink, #1a1a1a);
        opacity: 0.6;
      }

      .pl__sr {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      @keyframes pl-bounce {
        0%,
        80%,
        100% {
          transform: translateY(0);
        }
        40% {
          transform: translateY(-0.75rem);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        :host {
          transition: none;
        }
        .pl__dots span {
          animation: none;
        }
        .pl__retry {
          transition: none;
        }
      }
    `,
  ],
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
