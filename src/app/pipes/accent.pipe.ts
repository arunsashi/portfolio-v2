import { Pipe, type PipeTransform } from '@angular/core';

/**
 * Maps an accent token key to its global CSS custom property.
 * Usage: [style.background]="cat.accent | accent"  ->  var(--color-accent-teal)
 * Falls back to the brand colour for unknown/missing keys.
 */
@Pipe({ name: 'accent' })
export class AccentPipe implements PipeTransform {
  private static readonly known = new Set([
    'teal',
    'yellow',
    'mint',
    'pink',
    'magenta',
    'purple',
    'blue',
    'gold',
    'green',
    'skyblue',
    'lavender',
    'peach',
    'hotpink',
    'springgreen',
    'light-blue',
     'neon-green'
  ]);

  transform(key: string | undefined | null): string {
    if (key && AccentPipe.known.has(key)) {
      return `var(--color-accent-${key})`;
    }
    return 'var(--color-brand)';
  }
}
