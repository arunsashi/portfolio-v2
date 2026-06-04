import {
  type AfterViewInit,
  Directive,
  ElementRef,
  inject,
  input,
  type OnDestroy,
} from '@angular/core';

/**
 * Auto-scrolling marquee for a horizontal scroll container (the ticker and
 * the testimonials row).
 *
 * Requirements on the host:
 * - It is the horizontal scroll container (overflow-x: auto).
 * - Its content is TWO identical copies back to back — the infinite loop
 *   wraps the scroll position between the copies, so the jump is invisible.
 *
 * Behaviour: advances at `appMarqueeSpeed` px/s; pauses on hover/focus;
 * yields to user input (drag via DragScrollDirective, wheel, touch) and
 * resumes from wherever the user left off; respects prefers-reduced-motion
 * (no auto-advance — manual scrolling still works).
 */
@Directive({
  selector: '[appMarquee]',
  host: {
    '(pointerenter)': 'pause()',
    '(pointerleave)': 'resume()',
    '(pointerdown)': 'dragStart()',
    '(pointerup)': 'dragEnd()',
    '(pointercancel)': 'dragEnd()',
    '(focusin)': 'pause()',
    '(focusout)': 'resume()',
    '(touchstart)': 'pause(); dragStart()',
    '(touchend)': 'resume()',
    '(touchcancel)': 'resume()',
    '(wheel)': 'onWheel($event)',
  },
})
export class MarqueeDirective implements AfterViewInit, OnDestroy {
  /** Auto-scroll speed in px/second. */
  readonly appMarqueeSpeed = input(60);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  private rafId = 0;
  private paused = false;
  private dragging = false;

  ngAfterViewInit(): void {
    const el = this.el.nativeElement;
    if (typeof requestAnimationFrame === 'undefined') return;

    const reducedMotion =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Track the marquee position as a float: browsers round scrollLeft on
    // read, so sub-pixel per-frame increments (high-refresh displays) would
    // otherwise round away to zero movement.
    let pos = -1;
    let applied = -1;
    let last = performance.now();

    const tick = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.1); // clamp tab-restore spikes
      last = now;
      const half = el.scrollWidth / 2;

      if (half > 0) {
        // Start in the middle band so there's always room to drag both ways.
        if (pos < 0) {
          pos = half;
          applied = -1;
        }

        // The user scrolled (drag / wheel / touch momentum) — resync.
        if (Math.abs(el.scrollLeft - applied) > 1) {
          pos = el.scrollLeft;
        }

        if (!this.paused && !this.dragging && !reducedMotion) {
          pos += this.appMarqueeSpeed() * dt;
        }

        // Infinite loop: keep position within [0.5·half, 1.5·half). The two
        // content copies are identical, so the jump is invisible. Never wrap
        // mid-drag — the drag anchors to its start position and would fight.
        if (!this.dragging) {
          if (pos >= half * 1.5) pos -= half;
          else if (pos < half * 0.5) pos += half;
        }

        applied = Math.round(pos);
        if (Math.round(el.scrollLeft) !== applied) {
          el.scrollLeft = applied;
        }
      }

      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  protected pause(): void {
    this.paused = true;
  }

  protected resume(): void {
    this.paused = false;
    this.dragging = false;
  }

  protected dragStart(): void {
    this.dragging = true;
  }

  protected dragEnd(): void {
    this.dragging = false;
  }

  /** Let a vertical mouse wheel browse the row horizontally. */
  protected onWheel(event: WheelEvent): void {
    const el = this.el.nativeElement;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    el.scrollLeft += delta;
    event.preventDefault();
  }
}
