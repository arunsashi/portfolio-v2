import { Directive, ElementRef, inject, input, Renderer2 } from '@angular/core';

const SPARK_COUNT = 7;
const UP_COLORS = [
  'var(--color-accent-neon-green)',
  'var(--color-accent-yellow)',
  'var(--color-accent-teal)',
];
const DOWN_COLORS = ['var(--color-accent-pink)', 'var(--color-accent-hotpink)'];

/**
 * Neo-brutalist vote feedback: on click, the host pops and a burst of small
 * ink-bordered squares flies out — fanning upward for 'up', dripping downward
 * for 'down'. Decorative only (aria-hidden), and a no-op when the visitor
 * prefers reduced motion. Styles live in the animation library (styles.scss).
 */
@Directive({
  selector: '[appVoteBurst]',
  host: {
    '(click)': 'burst()',
    '[style.position]': '"relative"',
  },
})
export class VoteBurstDirective {
  /** Burst variant. */
  readonly appVoteBurst = input<'up' | 'down'>('up');

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  protected burst(): void {
    if (
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const host = this.el.nativeElement;
    const isUp = this.appVoteBurst() === 'up';
    const colors = isUp ? UP_COLORS : DOWN_COLORS;

    // Re-triggerable pop on the button itself.
    host.classList.remove('vote-pop');
    host.getBoundingClientRect(); // force reflow so the animation restarts
    host.classList.add('vote-pop');

    const container = this.renderer.createElement('span') as HTMLElement;
    this.renderer.addClass(container, 'vote-burst');
    this.renderer.setAttribute(container, 'aria-hidden', 'true');

    for (let i = 0; i < SPARK_COUNT; i++) {
      const spark = this.renderer.createElement('span') as HTMLElement;
      this.renderer.addClass(spark, 'vote-spark');
      const angle = isUp
        ? -Math.PI / 2 + (Math.random() - 0.5) * Math.PI // fan upward
        : Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 2); // drip downward
      const dist = 24 + Math.random() * 26;
      spark.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      spark.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      spark.style.setProperty('--rot', `${Math.round((Math.random() - 0.5) * 360)}deg`);
      spark.style.setProperty('--spark-color', colors[i % colors.length]);
      this.renderer.appendChild(container, spark);
    }

    this.renderer.appendChild(host, container);
    setTimeout(() => {
      this.renderer.removeChild(host, container);
    }, 650);
  }
}
