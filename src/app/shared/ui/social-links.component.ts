import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { SocialLink } from '@core/models';

/** Inline-SVG social icon row (no icon library — keeps deps minimal). */
@Component({
  selector: 'app-social-links',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="flex items-center gap-3" [attr.aria-label]="ariaLabel()">
      @for (s of links(); track s.url) {
        <li>
          <a
            [href]="s.url"
            target="_blank"
            rel="noopener noreferrer"
            class="grid h-10 w-10 place-items-center rounded-md border-2 border-line bg-surface text-ink transition-colors hover:bg-brand hover:text-brand-ink"
            [attr.aria-label]="s.label"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
              <path [attr.d]="iconPath(s.icon)" />
            </svg>
          </a>
        </li>
      }
    </ul>
  `,
})
export class SocialLinksComponent {
  readonly links = input.required<SocialLink[]>();
  readonly ariaLabel = input<string>('Social links');

  protected iconPath(icon?: string): string {
    switch (icon) {
      case 'github':
        return 'M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6a11.5 11.5 0 0 0 7.9-10.9C23.5 5.7 18.3.5 12 .5z';
      case 'linkedin':
        return 'M20.45 20.45h-3.56v-5.57c0-1.33 0-3.04-1.85-3.04s-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05a3.75 3.75 0 0 1 3.38-1.85c3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z';
      case 'twitter':
        return 'M23.95 4.57a10 10 0 0 1-2.82.77 4.96 4.96 0 0 0 2.16-2.72c-.95.56-2 .96-3.13 1.18a4.92 4.92 0 0 0-8.39 4.49A13.98 13.98 0 0 1 1.64 3.16a4.92 4.92 0 0 0 1.52 6.57 4.9 4.9 0 0 1-2.23-.62v.06a4.93 4.93 0 0 0 3.95 4.83 4.96 4.96 0 0 1-2.22.08 4.93 4.93 0 0 0 4.6 3.42A9.87 9.87 0 0 1 0 19.54a13.94 13.94 0 0 0 7.55 2.21c9.05 0 14-7.5 14-14 0-.21 0-.42-.02-.63A9.94 9.94 0 0 0 24 4.59z';
      case 'email':
        return 'M2 4h20a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm10 7.5L4.2 6.2 3 7l9 6 9-6-1.2-.8L12 11.5z';
      default:
        return 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z';
    }
  }
}
