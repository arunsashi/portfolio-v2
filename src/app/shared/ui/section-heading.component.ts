import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { AccentPipe } from './accent.pipe';
import { RevealDirective } from './reveal.directive';

/**
 * Tilted, bold section title in a colored block with a hard offset shadow,
 * matching the design (TECH ARSENAL, PUBLICATIONS, WORK ARCHIVE, …).
 * Some headings carry a leading icon (emoji) and a colored shadow.
 */
@Component({
  selector: 'app-section-heading',
  imports: [AccentPipe, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-8" appReveal="left">
      <h2 [id]="headingId()" class="inline-block -rotate-1">
        <span
          class="inline-flex items-center gap-2 border-4 border-line px-5 py-2.5 text-2xl font-black uppercase tracking-tight sm:text-3xl"
          [style.background]="bg() | accent"
          [style.color]="text()"
          [style.box-shadow]="shadow()"
        >
          @if (icon()) {
            <span aria-hidden="true" class="{{icon()}}"></span>
          }
          {{ title() }}
        </span>
      </h2>
      @if (subtitle()) {
        <p class="mt-3 text-muted">{{ subtitle() }}</p>
      }
    </div>
  `,
})
export class SectionHeadingComponent {
  readonly title = input.required<string>();
  readonly headingId = input.required<string>();
  /** Accent token key for the block background. */
  readonly bg = input<string>('yellow');
  /** Text color (ink by default; white for the dark LINKLY block). */
  readonly text = input<string>('var(--color-ink)');
  /** Accent token key for the offset shadow color (defaults to black). */
  readonly shadowAccent = input<string>('');
  /** Optional leading emoji icon. */
  readonly icon = input<string>('');
  /** Optional subtitle below the block. */
  readonly subtitle = input<string>('');

  private static readonly accentVar: Record<string, string> = {
    teal: 'var(--color-accent-teal)',
    yellow: 'var(--color-accent-yellow)',
    mint: 'var(--color-accent-mint)',
    pink: 'var(--color-accent-pink)',
    magenta: 'var(--color-accent-magenta)',
    purple: 'var(--color-accent-purple)',
    blue: 'var(--color-accent-blue)',
    gold: 'var(--color-accent-gold)',
    green: 'var(--color-accent-green)',
    skyblue: 'var(--color-accent-skyblue)',
    lavender: 'var(--color-accent-lavender)',
    peach: 'var(--color-accent-peach)',
    springgreen: 'var(--color-accent-springgreen)',
    neongreen: 'var(--color-accent-neon-green)',
  };

  protected readonly shadow = computed(() => {
    const key = this.shadowAccent();
    const color = key ? (SectionHeadingComponent.accentVar[key] ?? '#000') : '#000';
    return `5px 5px 0 0 ${color}`;
  });
}
