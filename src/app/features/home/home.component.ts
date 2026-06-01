import { ChangeDetectionStrategy, Component } from '@angular/core';

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
    <app-testimonials />
    <app-footer />
  `,
})
export class HomeComponent {}
