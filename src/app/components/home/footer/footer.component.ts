import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Footer — a tilted yellow "Let's build something!" badge straddling the top
 * border (decorative, non-interactive), followed by the copyright and tagline
 * lines, matching the design.
 */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.component.html',
})
export class FooterComponent {}
