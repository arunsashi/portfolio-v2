import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RevealDirective } from '@core/directives/reveal.directive';
import { DataService } from '@core/services/data.service';

import { HireMeModalComponent } from './hire-me-modal/hire-me-modal.component';

@Component({
  selector: 'app-hero',
  imports: [RevealDirective, HireMeModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.component.html',
})
export class HeroComponent {
  private readonly data = inject(DataService);
  protected readonly profile = toSignal(this.data.getProfile());

  protected initials(name: string): string {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
