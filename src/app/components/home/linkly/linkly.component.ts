import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RevealDirective } from '@core/directives/reveal.directive';
import { AccentPipe } from '@core/pipes/accent.pipe';
import { AnalyticsService } from '@core/services/analytics.service';
import { DataService } from '@core/services/data.service';

/**
 * "Linkly" (Social Link Card) — a tilted black title block followed by large,
 * colored, rounded link tiles. No outer container, matching node 12-3526.
 * Icons use Font Awesome (brands for social, outline-style for the rest).
 */
@Component({
  selector: 'app-linkly',
  imports: [AccentPipe, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './linkly.component.html',
})
export class LinklyComponent {
  private readonly data = inject(DataService);
  protected readonly analytics = inject(AnalyticsService);
  protected readonly profile = toSignal(this.data.getProfile());

  /** Map a link's icon key to a Font Awesome class. */
  protected iconClass(icon?: string): string {
    switch (icon) {
      case 'github':
        return 'fa-brands fa-github';
      case 'linkedin':
        return 'fa-brands fa-linkedin-in';
      case 'instagram':
        return 'fa-brands fa-instagram';
      case 'notion':
        return 'fa-regular fa-newspaper';
      case 'projects':
        return 'fa-regular fa-folder-open';
      default:
        return 'fa-solid fa-link';
    }
  }
}
