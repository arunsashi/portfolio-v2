import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DataService } from '@core/services/data.service';

/**
 * Footer — a tilted yellow "Let's build something!" badge straddling the top
 * border, followed by the copyright and tagline lines, matching the design.
 */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.component.html',
})
export class FooterComponent {
  private readonly data = inject(DataService);
  protected readonly profile = toSignal(this.data.getProfile());
}
