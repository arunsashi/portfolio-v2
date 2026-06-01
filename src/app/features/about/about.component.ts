import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Unused in the current design — the Figma layout folds the intro into the
 * hero, so there is no standalone About section. Kept as a valid, importable
 * stub so it can be reintroduced later without breaking the build.
 */
@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
})
export class AboutComponent {}
