import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { DataService } from '@core/data/data.service';
import { SectionHeadingComponent } from '@shared/ui/section-heading.component';
import { RevealDirective } from '@shared/ui/reveal.directive';

/**
 * "Side Quests" — matches the Make design's Projects.tsx:
 *   purple NeoCard → title + rotated yellow "In Dev" badge → description →
 *   device chips on a top-bordered footer → full-width blue "Explore" button.
 */
@Component({
  selector: 'app-projects',
  imports: [SectionHeadingComponent, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="work" class="container-page py-12" aria-labelledby="work-heading">
      <app-section-heading title="Side Quests" headingId="work-heading" bg="purple" />
      <ul class="grid gap-8 md:grid-cols-2">
        @for (project of projects(); track project.id; let i = $index) {
          <li
            appReveal="scale"
            [revealDelay]="(i % 4) + 1"
            class="hover-lift flex h-full flex-col rounded-2xl border-4 border-line p-6 shadow-[6px_6px_0_0_#000]"
            style="background: color-mix(in srgb, var(--color-accent-purple) 45%, white)"
          >
            <div class="mb-4 flex items-start justify-between gap-2">
              <h3 class="text-2xl font-black leading-tight text-ink">{{ project.name }}</h3>
              @if (project.inDevelopment) {
                <span
                  class="rotate-3 border-2 border-line bg-accent-yellow px-3 py-1 text-xs font-black uppercase text-ink shadow-[2px_2px_0_0_#000]"
                >
                  In Dev
                </span>
              } @else if (project.completed) {
                <span
                  class="rotate-3 border-2 border-line bg-accent-teal px-3 py-1 text-xs font-black uppercase text-ink shadow-[2px_2px_0_0_#000]"
                >
                  Shipped
                </span>
              }
            </div>

            @if (project.description) {
              <p class="mb-6 flex-1 text-lg font-bold text-ink/80">{{ project.description }}</p>
            }

            @if (project.tech?.length) {
              <div class="mt-auto flex flex-wrap gap-2 border-t-4 border-line pt-4">
                @for (t of project.tech; track t) {
                  <span class="border-2 border-line bg-surface px-2 py-1 text-xs font-black text-ink shadow-[2px_2px_0_0_#000]">
                    {{ t }}
                  </span>
                }
              </div>
            }

            @if (project.url) {
              <a
                [href]="project.url"
                target="_blank"
                rel="noopener noreferrer"
                class="hover-lift mt-6 flex items-center justify-center gap-2 border-2 border-line bg-accent-blue px-4 py-3 font-black uppercase text-ink shadow-[4px_4px_0_0_#000]"
                >Explore <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i
              ></a>
            }
          </li>
        }
      </ul>
    </section>
  `,
})
export class ProjectsComponent {
  private readonly data = inject(DataService);
  protected readonly projects = toSignal(this.data.getProjects('learning'), { initialValue: [] });
}
