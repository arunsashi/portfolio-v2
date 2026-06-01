import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

import { DataService } from '@core/data/data.service';
import { SectionHeadingComponent } from '@shared/ui/section-heading.component';
import { AccentPipe } from '@shared/ui/accent.pipe';
import { RevealDirective } from '@shared/ui/reveal.directive';

/**
 * "Publications" — matches the Make design's Articles.tsx:
 *   colored NeoCard → image header with platform badge (top-left) →
 *   white body with date pill + book icon, uppercase title, excerpt, and a
 *   full-width pink "Read Article" button. Aggregated later via /api/blog.
 */
@Component({
  selector: 'app-blog',
  imports: [DatePipe, SectionHeadingComponent, AccentPipe, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="publications" class="container-page py-12" aria-labelledby="publications-heading">
      <app-section-heading
        title="Publications"
        headingId="publications-heading"
        bg="skyblue"
        icon="fa-solid fa-pen"
      />
      <ul class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        @for (post of posts(); track post.url; let i = $index) {
          <li
            appReveal
            [revealDelay]="(i % 3) + 1"
            class="hover-lift flex h-full flex-col overflow-hidden rounded-2xl border-4 border-line shadow-[6px_6px_0_0_#000]"
            [style.background]="post.accent | accent"
          >
            <!-- image / colored header with platform badge -->
            <div class="relative h-48 w-full overflow-hidden border-b-4 border-line">
              @if (post.image) {
                <img
                  [src]="post.image"
                  [alt]="post.title"
                  class="h-full w-full object-cover contrast-125 grayscale-[0.2]"
                />
              } @else {
                <div class="h-full w-full" [style.background]="post.accent | accent" aria-hidden="true"></div>
              }
              <span
                class="absolute left-4 top-4 border-2 border-white bg-ink px-3 py-1 text-sm font-black uppercase text-white shadow-[2px_2px_0_0_#fff]"
              >
                {{ post.source }}
              </span>
            </div>

            <!-- white body -->
            <div class="flex flex-1 flex-col bg-surface p-6">
              <div class="mb-4 flex items-center justify-between">
                <span class="border-2 border-line bg-canvas px-2 py-1 text-sm font-bold text-ink">
                  {{ post.publishedAt | date: 'MMM yyyy' }}
                </span>
                <i class="fa-solid fa-bookmark" aria-hidden="true"></i>
              </div>

              <h3 class="mb-3 text-2xl font-black uppercase leading-tight text-ink" [title]="post.title">
                {{ post.title }}
              </h3>

              <p class="mb-6 flex-grow text-sm font-bold leading-relaxed text-muted">{{ post.excerpt }}</p>

              <a
                [href]="post.url"
                target="_blank"
                rel="noopener noreferrer"
                class="hover-lift mt-auto flex w-full items-center justify-center gap-2 border-4 border-line bg-accent-pink px-4 py-3 text-sm font-black uppercase text-ink shadow-[4px_4px_0_0_#000]"
              >
                Read Article <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
              </a>
            </div>
          </li>
        }
      </ul>
    </section>
  `,
})
export class BlogComponent {
  private readonly data = inject(DataService);
  protected readonly posts = toSignal(this.data.getBlog(), { initialValue: [] });
}
