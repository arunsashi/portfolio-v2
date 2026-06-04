import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  type OnDestroy,
} from '@angular/core';
import { FEATURE_GATES } from '@core/const/feature-gates.const';
import { AnalyticsService } from '@core/services/analytics.service';
import { FeatureFlagService } from '@core/services/feature-flag.service';
import { BlogComponent } from '@features/home/blog/blog.component';
import { ExperienceComponent } from '@features/home/experience/experience.component';
import { FooterComponent } from '@features/home/footer/footer.component';
import { HeroComponent } from '@features/home/hero/hero.component';
import { LinklyComponent } from '@features/home/linkly/linkly.component';
import { ProjectsComponent } from '@features/home/projects/projects.component';
import { SkillsComponent } from '@features/home/skills/skills.component';
import { TestimonialsComponent } from '@features/home/testimonials/testimonials.component';
import { TickerComponent } from '@features/home/ticker/ticker.component';

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
  templateUrl: './home.component.html',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  // Gate "show_testimonials": when ON, hide the testimonials section.
  protected readonly flags = inject(FeatureFlagService);
  protected readonly gates = FEATURE_GATES;

  private readonly analytics = inject(AnalyticsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
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
