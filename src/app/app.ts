import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * App shell for the Figma design ("Desktop - 1"): the page has no top nav —
 * it stacks the hero, ticker, and content sections in a centered column.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main">Skip to content</a>
    <main id="main" tabindex="-1">
      <router-outlet />
    </main>
  `,
})
export class App {}
