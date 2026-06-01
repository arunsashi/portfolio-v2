import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { DataService } from '@core/data/data.service';

/**
 * Footer — a tilted yellow "Let's build something!" badge straddling the top
 * border, followed by the copyright and tagline lines, matching the design.
 */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = profile();
    <footer id="contact" class="relative mt-16 border-t-4 border-line">
      <a
        [href]="'mailto:' + (p?.email || '')"
        class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 -rotate-2 border-4 border-line bg-accent-yellow px-6 py-3 text-base font-extrabold uppercase tracking-tight text-ink shadow-[4px_4px_0_0_#000] transition-transform hover:-translate-y-[55%]"
      >
        Let's build something!
      </a>
      <div class="px-6 pb-10 pt-16 text-center">
        <p class="text-lg font-extrabold uppercase tracking-tight text-ink">
          &copy; 2026 Lead Software Eng. All Rights Reserved.
        </p>
        <p class="mt-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Built with <span aria-hidden="true">💖</span> and thick borders.
        </p>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  private readonly data = inject(DataService);
  protected readonly profile = toSignal(this.data.getProfile());
}
