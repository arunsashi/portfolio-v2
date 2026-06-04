import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RevealDirective } from '@core/directives/reveal.directive';
import { DataService } from '@core/services/data.service';
import { SectionHeadingComponent } from '@shared/section-heading/section-heading.component';

/**
 * "Side Quests" — matches the Make design's Projects.tsx:
 *   purple NeoCard → title + rotated yellow "In Dev" badge → description →
 *   device chips on a top-bordered footer → full-width blue "Explore" button.
 */
@Component({
  selector: 'app-projects',
  imports: [SectionHeadingComponent, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projects.component.html',
})
export class ProjectsComponent {
  private readonly data = inject(DataService);
  protected readonly projects = toSignal(this.data.getProjects('learning'), { initialValue: [] });
}
