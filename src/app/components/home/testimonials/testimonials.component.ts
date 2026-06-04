import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DragScrollDirective } from '@core/directives/drag-scroll.directive';
import { MarqueeDirective } from '@core/directives/marquee.directive';
import { RevealDirective } from '@core/directives/reveal.directive';
import { DataService } from '@core/services/data.service';
import { SectionHeadingComponent } from '@shared/section-heading/section-heading.component';

/**
 * "What People Say" — matches the Make design's Testimonials.tsx:
 *   a horizontal row of NeoCards (quote icon, testimony, divider, yellow
 *   avatar bubble, name/role, black company pill) that auto-scrolls like the
 *   ticker. Hover/focus pauses it; drag or wheel browses freely.
 */
@Component({
  selector: 'app-testimonials',
  imports: [SectionHeadingComponent, RevealDirective, DragScrollDirective, MarqueeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './testimonials.component.html',
})
export class TestimonialsComponent {
  private readonly data = inject(DataService);
  protected readonly testimonials = toSignal(this.data.getTestimonials(), { initialValue: [] });

  /** How many real (non-clone) cards there are — clones are aria-hidden. */
  protected readonly realCount = computed(() => this.testimonials().length);

  /** Two identical copies back to back — required by the marquee's seamless
   *  wrap (it jumps between the halves while they're pixel-identical). */
  protected readonly doubled = computed(() => {
    const items = this.testimonials();
    return [...items, ...items];
  });
}
