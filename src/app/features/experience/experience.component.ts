import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { format, parseISO } from 'date-fns';

import { DataService } from '@core/data/data.service';
import { SectionHeadingComponent } from '@shared/ui/section-heading.component';
import { AccentPipe } from '@shared/ui/accent.pipe';
import { RevealDirective } from '@shared/ui/reveal.directive';
import type { Client, Experience } from '@core/models';

/**
 * "Work Archive" — a vertical timeline of employers. Each employer node
 * expands to show its clients (grouped), each client lists its projects, and
 * each project expands to a business / technical / tools breakdown.
 * Periods are computed from from/to dates ("Present" when there's no end).
 */
@Component({
  selector: 'app-experience',
  imports: [SectionHeadingComponent, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="experience" class="container-page py-12" aria-labelledby="experience-heading">
      <app-section-heading title="Career Changelog" headingId="experience-heading" bg="neongreen" />

      <ol class="relative">
        <span class="pointer-events-none absolute bottom-0 left-[18px] top-0 w-1 border-l-4 border-line" aria-hidden="true"></span>
        @for (job of roles(); track job.id; let i = $index) {
          <li appReveal="right" [revealDelay]="(i % 3) + 1" class="relative mb-8 grid grid-cols-[40px_1fr] gap-4 last:mb-0">
            <span
              class="relative z-10 mt-4 grid h-9 w-9 place-items-center rounded-full border-4 border-line"
              [class.bg-accent-pink]="job.type !== 'education'"
              [class.bg-accent-blue]="job.type === 'education'"
              aria-hidden="true"
            >
              <i class="text-xs text-ink" [class]="timelineIconClass(job.type)"></i>
            </span>

            <article
              [id]="'job-card-' + i"
              class="hover-lift rounded-xl border-4 border-line bg-surface shadow-[6px_6px_0_0_#000]"
              [class.grey-area]="job.type === 'education'"
              [class.border-dashed]="job.type === 'education'"
              [class.shadow-none]="job.type === 'education'"
              [style.background]="job.type === 'education' ? '#E5E7EB' : null"
            >
              <!-- employer header -->
              <header class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 p-5">
                <button
                  type="button"
                  class="flex flex-1 items-start gap-3 text-left"
                  [class.cursor-default]="!clientCount(job)"
                  [attr.aria-expanded]="clientCount(job) ? isJobOpen(i) : null"
                  [attr.aria-controls]="clientCount(job) ? 'job-panel-' + i : null"
                  (click)="toggleJob(i, job)"
                >
                  <span class="min-w-0">
                    <span class="block text-base font-extrabold uppercase tracking-tight text-ink sm:text-lg">
                      {{ job.position }}
                    </span>
                    <span class="block text-base font-semibold text-[#364153] underline decoration-2 underline-offset-2 sm:text-lg">
                      {{ job.name }}
                    </span>
                  </span>
                </button>

                <div class="flex shrink-0 flex-col items-end gap-2">
                  <span
                    class="rounded-full border-2 border-line bg-ink px-4 py-1.5 text-xs font-bold uppercase text-white shadow-[3px_3px_0_0_var(--color-accent-hotpink)]"
                  >
                    {{ period(job.from, job.to) }}
                  </span>
                  @if (clientCount(job); as count) {
                    <button
                      type="button"
                      class="inline-flex items-center gap-2 rounded-md border-2 border-line bg-accent-pink px-3 py-1 text-xs font-bold text-ink"
                      [attr.aria-expanded]="isJobOpen(i)"
                      [attr.aria-controls]="'job-panel-' + i"
                      (click)="toggleJob(i, job)"
                    >
                      {{ count }} {{ count === 1 ? 'Client' : 'Clients' }}
                      <i
                        class="fa-solid fa-chevron-down transition-transform"
                        [class.rotate-180]="isJobOpen(i)"
                        aria-hidden="true"
                      ></i>
                    </button>
                  }
                </div>
              </header>

              <!-- clients (grouped), shown when the employer is expanded -->
              @if (clientCount(job) && isJobOpen(i)) {
                <div [id]="'job-panel-' + i" class="border-t-4 border-dashed border-line p-4 sm:p-5">
                  <h4 class="mb-4 text-md font-black uppercase text-brand">Client(s)</h4>
                  <div class="space-y-5">
                  @for (client of job.clients; track client.company) {
                    <div
                      class="hover-lift rounded-lg border-4 border-line p-4 shadow-[4px_4px_0_0_#000]"
                      [style.background]="'var(--color-accent-light-blue)'"
                    >
                      <h5
                        class="mb-3 flex items-center gap-2 border-b-4 border-line pb-2 text-xl font-black uppercase tracking-tight text-ink"
                      >
                        {{ client.company }}
                      </h5>

                      <ul class="space-y-3 p-4">
                        @for (proj of client.projects; track proj.name; let pi = $index) {
                          <li class="rounded-md border-2 border-line bg-surface">
                            <button
                              type="button"
                              class="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-left"
                              [attr.aria-expanded]="isProjOpen(i, client, pi)"
                              [attr.aria-controls]="panelId(i, client, pi)"
                              (click)="toggleProj(i, client, pi)"
                            >
                              <span class="flex min-w-0 items-center gap-2 font-bold text-ink">
                                @if (proj.detail) {
                                  <i
                                    class="fa-solid fa-chevron-right text-xs text-muted transition-transform"
                                    [class.rotate-90]="isProjOpen(i, client, pi)"
                                    aria-hidden="true"
                                  ></i>
                                }
                                {{ proj.name }}
                              </span>
                              <span class="shrink-0 border-2 border-line bg-accent-pink px-2 py-1 text-xs font-bold uppercase text-ink">
                                {{ period(proj.from, proj.to) }}
                              </span>
                            </button>

                            @if (proj.detail && isProjOpen(i, client, pi)) {
                              <dl [id]="panelId(i, client, pi)" class="space-y-3 border-t-2 border-line px-4 py-4 text-sm">
                                <div>
                                  <dt class="font-bold uppercase tracking-wide text-brand">Business</dt>
                                  <dd class="mt-1 leading-relaxed text-muted">{{ proj.detail.business }}</dd>
                                </div>
                                <div>
                                  <dt class="font-bold uppercase tracking-wide text-brand">Technical</dt>
                                  <dd class="mt-1 leading-relaxed text-muted">{{ proj.detail.technical }}</dd>
                                </div>
                                <div>
                                  <dt class="font-bold uppercase tracking-wide text-brand">Tools &amp; Frameworks</dt>
                                  <dd class="mt-2 flex flex-wrap gap-2">
                                    @for (tool of proj.detail.tools; track tool) {
                                      <span class="rounded-md border-2 border-line bg-canvas px-2.5 py-1 font-mono text-xs text-ink">{{ tool }}</span>
                                    }
                                  </dd>
                                </div>
                              </dl>
                            }
                          </li>
                        }
                      </ul>
                    </div>
                  }
                  </div>
                </div>
              }
            </article>
          </li>
        }
      </ol>
    </section>
  `,
})
export class ExperienceComponent {
  private readonly data = inject(DataService);
  protected readonly roles = toSignal(this.data.getExperience(), { initialValue: [] });

  private readonly openJob = signal(-1);
  private readonly openProjects = signal<ReadonlySet<string>>(new Set());

  /** "Mon YYYY - Mon YYYY", or "Mon YYYY - Present" when there's no end date. */
  protected period(from: string, to?: string | null): string {
    const start = this.fmt(from);
    const end = to ? this.fmt(to) : 'Present';
    return `${start} - ${end}`;
  }

  private fmt(iso: string): string {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return format(d, 'MMM yyyy');
  }

  /** Number of clients (label only shows when > 0). */
  protected clientCount(job: Experience): number {
    return job.clients?.length ?? 0;
  }

  protected timelineIconClass(type: string): string {
    return type === 'education' ? 'fa-solid fa-graduation-cap' : 'fa-solid fa-briefcase';
  }

  protected isJobOpen(i: number): boolean {
    return this.openJob() === i;
  }

  protected toggleJob(i: number, job: Experience): void {
    if (!this.clientCount(job)) return;
    const wasOpen = this.openJob() === i;
    this.openJob.set(wasOpen ? -1 : i);

    if (!wasOpen) {
      this.centerElementInView(`job-card-${i}`);
    }
  }

  private centerElementInView(id: string): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const targetTop = window.scrollY + rect.top - (window.innerHeight - rect.height) / 2;
        const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const clampedTop = Math.min(Math.max(0, targetTop), maxTop);

        window.scrollTo({ top: clampedTop, behavior: 'smooth' });
      });
    });
  }

  protected panelId(jobIndex: number, client: Client, projIndex: number): string {
    return `proj-${jobIndex}-${this.slug(client.company)}-${projIndex}`;
  }

  protected isProjOpen(jobIndex: number, client: Client, projIndex: number): boolean {
    return this.openProjects().has(this.panelId(jobIndex, client, projIndex));
  }

  protected toggleProj(jobIndex: number, client: Client, projIndex: number): void {
    const key = this.panelId(jobIndex, client, projIndex);
    const isOpening = !this.openProjects().has(key);

    this.openProjects.update((set) => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

    if (isOpening) {
      this.centerElementInView(key);
    }
  }

  private slug(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
}
