import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RevealDirective } from '@core/directives/reveal.directive';
import type { Skill } from '@core/entities';
import { AccentPipe } from '@core/pipes/accent.pipe';
import { DataService } from '@core/services/data.service';
import { SectionHeadingComponent } from '@shared/section-heading/section-heading.component';

/**
 * "Tech Arsenal" — matches the Make design's Skills card:
 *   white NeoCard → small rotated colored title badge → wrench + description →
 *   "Languages:" group (dark chips) → "Frameworks & Tools:" group (light chips).
 */
@Component({
  selector: 'app-skills',
  imports: [SectionHeadingComponent, AccentPipe, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skills.component.html',
})
export class SkillsComponent {
  private readonly data = inject(DataService);
  protected readonly categories = toSignal(this.data.getSkills(), { initialValue: [] });

  protected visibleSkills(skills: Skill[]): Skill[] {
    return [...skills].filter((s) => s.display).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
}
