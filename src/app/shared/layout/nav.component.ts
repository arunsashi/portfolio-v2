import { ChangeDetectionStrategy, Component } from '@angular/core';

interface NavItem {
  label: string;
  fragment: string;
}

/** Sticky top navigation from the Figma design: brand + section links. */
@Component({
  selector: 'app-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="sticky top-0 z-50 border-b-2 border-line bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/75"
    >
      <nav
        aria-label="Primary"
        class="container-page flex min-h-[64px] flex-wrap items-center justify-between gap-3 py-3"
      >
        <a href="#hero" class="text-lg font-bold tracking-tight text-ink">ARUN SUDI</a>
        <ul class="flex flex-wrap items-center gap-1 text-sm font-medium">
          @for (item of nav; track item.fragment) {
            <li>
              <a
                [href]="'#' + item.fragment"
                class="rounded-md px-3 py-2 text-ink transition-colors hover:text-brand"
                >{{ item.label }}</a
              >
            </li>
          }
        </ul>
      </nav>
    </header>
  `,
})
export class NavComponent {
  protected readonly nav: NavItem[] = [
    { label: 'Home', fragment: 'hero' },
    { label: 'About', fragment: 'about' },
    { label: 'Skills', fragment: 'skills' },
    { label: 'Projects', fragment: 'work' },
    { label: 'Contact', fragment: 'contact' },
  ];
}
