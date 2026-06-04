import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
} from '@angular/core';

import { AnalyticsService } from '@core/analytics/analytics.service';
import { FeatureFlagService } from '@core/feature-flags/feature-flag.service';
import { HeroComponent } from '@features/hero/hero.component';
import { TickerComponent } from '@features/ticker/ticker.component';
import { LinklyComponent } from '@features/linkly/linkly.component';
import { SkillsComponent } from '@features/skills/skills.component';
import { BlogComponent } from '@features/blog/blog.component';
import { ExperienceComponent } from '@features/experience/experience.component';
import { ProjectsComponent } from '@features/projects/projects.component';
import { TestimonialsComponent } from '@features/testimonials/testimonials.component';
import { FooterComponent } from '@shared/layout/footer.component';

/**
 * Page composition mirrors the Figma design ("Desktop - 1", node 2-1345),
 * top to bottom:
 *   Hero → InterestsTicker → Linkly → Tech Arsenal (skills) →
 *   Publications (blog) → Work Archive (experience) → Side Quests (projects) →
 *   What People Say (testimonials) → footer (with "Let's build something!" CTA).
 */
@Component({
  selector: 'app-home',
  imports: [
    HeroComponent,
    TickerComponent,
    LinklyComponent,
    SkillsComponent,
    BlogComponent,
    ExperienceComponent,
    ProjectsComponent,
    TestimonialsComponent,
    FooterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-hero />
    <app-ticker />
    <app-linkly />
    <app-skills />
    <app-blog />
    <app-experience />
    <app-projects />
    @if (!flags.isEnabled('show_testimonials')) {
      <app-testimonials />
    }
    <app-footer />
  `,
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  // Gate "show_testimonials": when ON, hide the testimonials section.
  protected readonly flags = inject(FeatureFlagService);

  private readonly analytics = inject(AnalyticsService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).id;
          this.analytics.sectionView(id);
          this.observer?.unobserve(entry.target); // once per section
        }
      },
      // Fire when a section reaches the middle band of the viewport.
      { threshold: 0, rootMargin: '-20% 0px -20% 0px' },
    );

    this.host.nativeElement
      .querySelectorAll('section[id]')
      .forEach((el: Element) => this.observer?.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
