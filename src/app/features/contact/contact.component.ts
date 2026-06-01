import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { DataService } from '@core/data/data.service';

/** Closing call-to-action / contact block. */
@Component({
  selector: 'app-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = profile();
    <section id="contact" class="container-page py-16" aria-labelledby="contact-heading">
      <div
        class="rounded-md border-4 border-line bg-brand p-10 text-center shadow-[8px_8px_0_0_#000]"
      >
        <h2 id="contact-heading" class="text-3xl font-bold text-brand-ink sm:text-4xl">
          Let's build something!
        </h2>
        <p class="mx-auto mt-4 max-w-md text-lg text-brand-ink/90">
          I'm open to new projects and opportunities. Say hello!
        </p>
        @if (p) {
          <a
            [href]="'mailto:' + p.email"
            class="mt-8 inline-block rounded-md border-2 border-line bg-surface px-7 py-3 font-bold text-ink shadow-[4px_4px_0_0_#000] transition-transform hover:-translate-y-0.5"
            >Get In Touch 🚀</a
          >
        }
      </div>
    </section>
  `,
})
export class ContactComponent {
  private readonly data = inject(DataService);
  protected readonly profile = toSignal(this.data.getProfile());
}
