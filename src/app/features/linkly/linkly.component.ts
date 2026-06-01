import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { DataService } from '@core/data/data.service';
import { AccentPipe } from '@shared/ui/accent.pipe';
import { RevealDirective } from '@shared/ui/reveal.directive';

/**
 * "Linkly" (Social Link Card) — a tilted black title block followed by large,
 * colored, rounded link tiles. No outer container, matching node 12-3526.
 * Icons use Font Awesome (brands for social, outline-style for the rest).
 */
@Component({
  selector: 'app-linkly',
  imports: [AccentPipe, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = profile();
    <section id="links" class="container-page py-10" aria-labelledby="linkly-heading">
      <h2 id="linkly-heading" class="mb-7 inline-block rotate-1">
        <span
          class="inline-block border-4 border-line bg-ink px-5 py-2.5 text-2xl font-black uppercase tracking-tight text-white shadow-[5px_5px_0_0_var(--color-accent-hotpink)] sm:text-3xl"
        >
          Linkly
        </span>
      </h2>
      @if (p) {
        <ul class="grid grid-cols-2 gap-5 sm:grid-cols-4">
          @for (s of p.socials; track s.url; let i = $index) {
            <li appReveal="scale" [revealDelay]="(i % 4) + 1">
              <a
                [href]="s.url"
                target="_blank"
                rel="noopener noreferrer"
                class="hover-lift flex flex-col items-center gap-3 rounded-2xl border-4 border-line px-4 py-8 font-bold uppercase tracking-tight text-ink shadow-[5px_5px_0_0_#1a1a1a]"
                [style.background]="s.accent | accent"
              >
                <i class="text-3xl text-ink {{ iconClass(s.icon) }}" aria-hidden="true"></i>
                <span>{{ s.label }}</span>
              </a>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class LinklyComponent {
  private readonly data = inject(DataService);
  protected readonly profile = toSignal(this.data.getProfile());

  /** Map a link's icon key to a Font Awesome class. */
  protected iconClass(icon?: string): string {
    switch (icon) {
      case 'github':
        return 'fa-brands fa-github';
      case 'linkedin':
        return 'fa-brands fa-linkedin-in';
      case 'notion':
        return 'fa-regular fa-newspaper';
      case 'projects':
        return 'fa-regular fa-folder-open';
      default:
        return 'fa-solid fa-link';
    }
  }
}
