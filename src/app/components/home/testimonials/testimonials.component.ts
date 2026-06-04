import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DragScrollDirective } from '@core/directives/drag-scroll.directive';
import { RevealDirective } from '@core/directives/reveal.directive';
import { DataService } from '@core/services/data.service';
import { SectionHeadingComponent } from '@shared/section-heading/section-heading.component';

/**
 * "What People Say" — matches the Make design's Testimonials.tsx:
 *   a horizontally swipeable row of NeoCards (quote icon, testimony, divider,
 *   yellow avatar bubble, name/role, black company pill) + a "Swipe to read
 *   more" hint. Native scroll-snap replaces embla; arrow keys also work.
 */
@Component({
  selector: 'app-testimonials',
  imports: [SectionHeadingComponent, RevealDirective, DragScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './testimonials.component.html',
})
export class TestimonialsComponent {
  private readonly data = inject(DataService);
  protected readonly testimonials = toSignal(this.data.getTestimonials(), { initialValue: [] });
}
