import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { DataService } from '@core/data/data.service';

/**
 * "InterestsTicker" — a full-bleed, slightly tilted yellow marquee of current
 * interests (matches the Make design: bg-yellow, rotate-1, hard bottom shadow).
 * The list is duplicated so the -50% translate loop is seamless; motion pauses
 * on hover and under prefers-reduced-motion (see styles.scss .animate-marquee).
 */
@Component({
  selector: 'app-ticker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative left-1/2 my-4 w-screen -translate-x-1/2 rotate-1 overflow-hidden border-y-4 border-line bg-accent-yellow py-5 shadow-[0_8px_0_0_#1a1a1a]"
      role="group"
      aria-label="Current interests"
    >
      <div class="flex w-max animate-marquee">
        @for (loop of [0, 1]; track loop) {
          <ul class="flex shrink-0 items-center" [attr.aria-hidden]="loop === 1 ? 'true' : null">
            @for (item of items(); track $index) {
              <li class="flex items-center whitespace-nowrap px-8 text-xl font-black uppercase tracking-wide text-ink">
                <i class="fa-solid fa-star mr-3 text-brand" aria-hidden="true"></i>{{ item }}
                <span class="ml-8 text-2xl text-ink/20" aria-hidden="true">•</span>
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class TickerComponent {
  private readonly data = inject(DataService);
  private readonly profile = toSignal(this.data.getProfile());
  protected readonly items = () => this.profile()?.interests ?? [];
}
