import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FEATURE_GATES } from '@core/const/feature-gates.const';
import { RevealDirective } from '@core/directives/reveal.directive';
import type { Client, Experience } from '@core/entities';
import { DataService } from '@core/services/data.service';
import { FeatureFlagService } from '@core/services/feature-flag.service';
import { SectionHeadingComponent } from '@shared/section-heading/section-heading.component';
import { format, parseISO } from 'date-fns';

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
  templateUrl: './experience.component.html',
})
export class ExperienceComponent {
  private readonly data = inject(DataService);
  private readonly flags = inject(FeatureFlagService);
  protected readonly roles = toSignal(this.data.getExperience(), { initialValue: [] });

  /** Gate "alternative_work_archive": when ON, hide the clients pill and
   *  disable expanding the employer cards. */
  protected altArchive(): boolean {
    return this.flags.isEnabled(FEATURE_GATES.ALTERNATIVE_WORK_ARCHIVE);
  }

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
    if (!this.clientCount(job) || this.altArchive()) return;
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
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
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
