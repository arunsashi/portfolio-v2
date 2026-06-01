import {
  AfterViewInit,
  Directive,
  ElementRef,
  inject,
  input,
  OnDestroy,
  PLATFORM_ID,
  Renderer2,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Scroll-triggered entrance animation — the Angular equivalent of the Make
 * project's framer-motion `whileInView`. Adds `is-visible` (which fires the
 * CSS keyframe from styles.scss) the first time the host scrolls into view.
 *
 * Usage:
 *   <div appReveal>…</div>                 // fade-in-up (default)
 *   <li appReveal="scale" [revealDelay]="2">…</li>   // scale-in, 0.2s stagger
 *
 * Variants: '' | 'left' | 'right' | 'scale' | 'rotate' (set via data-reveal).
 * Respects prefers-reduced-motion (the CSS no-ops the animation there).
 */
@Directive({
  selector: '[appReveal]',
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  /** Animation variant; maps to the data-reveal attribute value. */
  readonly appReveal = input<'' | 'left' | 'right' | 'scale' | 'rotate'>('');
  /** Stagger index 1–6 → adds .stagger-N (0.1s steps). */
  readonly revealDelay = input<number>(0);

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    const node = this.el.nativeElement as HTMLElement;
    this.renderer.setAttribute(node, 'data-reveal', this.appReveal());

    const delay = this.revealDelay();
    if (delay >= 1 && delay <= 6) {
      this.renderer.addClass(node, `stagger-${Math.floor(delay)}`);
    }

    // SSR / no IntersectionObserver: show immediately.
    if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') {
      this.renderer.addClass(node, 'is-visible');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.renderer.addClass(node, 'is-visible');
            this.observer?.unobserve(node);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
