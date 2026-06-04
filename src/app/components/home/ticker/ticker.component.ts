import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DataService } from '@core/services/data.service';

/**
 * "InterestsTicker" — a full-bleed, slightly tilted yellow marquee of current
 * interests (matches the Make design: bg-yellow, rotate-1, hard bottom shadow).
 * The list is duplicated so the -50% translate loop is seamless; motion pauses
 * on hover and under prefers-reduced-motion (see styles.scss .animate-marquee).
 */
@Component({
  selector: 'app-ticker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ticker.component.html',
})
export class TickerComponent {
  private readonly data = inject(DataService);
  private readonly profile = toSignal(this.data.getProfile());
  protected readonly items = (): string[] => this.profile()?.interests ?? [];
}
