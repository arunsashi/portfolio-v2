import { Directive, ElementRef, inject, type OnDestroy, Renderer2 } from '@angular/core';

/**
 * Click-and-drag horizontal scrolling for a scroll container (the Make design's
 * embla "cursor-grab" behaviour, without the dependency). Touch/trackpad already
 * scroll natively; this adds mouse drag. Keyboard scrolling is unaffected.
 */
@Directive({
  selector: '[appDragScroll]',
  host: {
    '(pointerdown)': 'onDown($event)',
    '(pointermove)': 'onMove($event)',
    '(pointerup)': 'onUp($event)',
    '(pointercancel)': 'onUp($event)',
    '(pointerleave)': 'onUp($event)',
    '(dragstart)': 'onDragStart($event)',
    '[style.cursor]': '"grab"',
    '[style.touch-action]': '"pan-x"',
  },
})
export class DragScrollDirective implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  // Capture-phase guard: a click released at the end of a drag must not
  // activate the link/button under the pointer.
  private readonly suppressClick = (e: MouseEvent): void => {
    if (!this.moved) return;
    e.preventDefault();
    e.stopPropagation();
    this.moved = false;
  };

  constructor() {
    this.el.nativeElement.addEventListener('click', this.suppressClick, { capture: true });
  }

  ngOnDestroy(): void {
    this.el.nativeElement.removeEventListener('click', this.suppressClick, { capture: true });
  }

  private dragging = false;
  private moved = false;
  private startX = 0;
  private startScroll = 0;

  protected onDown(e: PointerEvent): void {
    // Only primary mouse button; let touch use native scrolling.
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType !== 'mouse') return;
    this.dragging = true;
    this.moved = false;
    this.startX = e.clientX;
    this.startScroll = this.el.nativeElement.scrollLeft;
    this.renderer.setStyle(this.el.nativeElement, 'cursor', 'grabbing');
  }

  protected onMove(e: PointerEvent): void {
    if (!this.dragging) return;
    const dx = e.clientX - this.startX;
    if (Math.abs(dx) > 3) this.moved = true;
    this.el.nativeElement.scrollLeft = this.startScroll - dx;
  }

  protected onUp(_e: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.renderer.setStyle(this.el.nativeElement, 'cursor', 'grab');
  }

  // Suppress accidental link/image drags while swiping.
  protected onDragStart(e: DragEvent): void {
    if (this.moved) e.preventDefault();
  }
}
