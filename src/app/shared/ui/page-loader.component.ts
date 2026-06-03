import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { LoadingService } from '@core/loading/loading.service';

/**
 * Full-screen, neo-brutalist page loader. Visible until the initial data load
 * settles (see LoadingService), then fades out. Motion is gated behind
 * prefers-reduced-motion for accessibility.
 */
@Component({
  selector: 'app-page-loader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-hidden]': '!loading()',
    '[attr.aria-hidden]': '!loading() ? "true" : null',
  },
  template: `
    <div class="pl" role="status" aria-live="polite">
      <div class="pl__card">
        <div class="pl__dots" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        <p class="pl__text">Loading</p>
        <span class="pl__sr">Loading content, please wait.</span>
      </div>
    </div>
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
      }
    `,
  ],
})
export class PageLoaderComponent {
  protected readonly loading = inject(LoadingService).loading;
}
