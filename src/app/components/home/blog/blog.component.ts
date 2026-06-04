import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RevealDirective } from '@core/directives/reveal.directive';
import { AccentPipe } from '@core/pipes/accent.pipe';
import { DataService } from '@core/services/data.service';
import { SectionHeadingComponent } from '@shared/section-heading/section-heading.component';

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
  templateUrl: './blog.component.html',
})
export class BlogComponent {
  private readonly data = inject(DataService);
  protected readonly posts = toSignal(this.data.getBlog(), { initialValue: [] });
}
