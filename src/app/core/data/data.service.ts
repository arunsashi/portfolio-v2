import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { DATA_SOURCE } from './data-source.config';
import type {
  BlogPost,
  Experience,
  Profile,
  Project,
  ProjectType,
  SkillCategory,
  Testimonial,
} from '@core/models';

/**
 * Read-only access to portfolio content.
 *
 * The shape of every method here is identical whether it reads the
 * placeholder JSON or the live /api endpoints — only the injected
 * DATA_SOURCE differs (see data-source.config.ts).
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly source = inject(DATA_SOURCE);

  private url(resource: string): string {
    return `${this.source.baseUrl}/${resource}${this.source.jsonExt ? '.json' : ''}`;
  }

  getProfile(): Observable<Profile> {
    return this.http.get<Profile>(this.url('profile'));
  }

  getSkills(): Observable<SkillCategory[]> {
    return this.http
      .get<SkillCategory[]>(this.url('skills'))
      .pipe(map((cats) => [...cats].sort(byOrder)));
  }

  getProjects(type?: ProjectType): Observable<Project[]> {
    return this.http.get<Project[]>(this.url('projects')).pipe(
      map((projects) => (type ? projects.filter((p) => p.type === type) : projects)),
      map((projects) => [...projects].sort(byOrder)),
    );
  }

  getProject(slug: string): Observable<Project | undefined> {
    return this.getProjects().pipe(map((projects) => projects.find((p) => p.slug === slug)));
  }

  getExperience(): Observable<Experience[]> {
    return this.http.get<Experience[]>(this.url('experience')).pipe(
      map((x) => [...x].sort(byExperienceEndDateDesc)),
    );
  }

  getBlog(): Observable<BlogPost[]> {
    return this.http.get<BlogPost[]>(this.url('blog'));
  }

  getTestimonials(): Observable<Testimonial[]> {
    return this.http.get<Testimonial[]>(this.url('testimonials'));
  }
}

function byOrder(a: { order?: number }, b: { order?: number }): number {
  return (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
}

function byExperienceEndDateDesc(a: Experience, b: Experience): number {
  const aEnd = a.to ? Date.parse(a.to) : Number.POSITIVE_INFINITY;
  const bEnd = b.to ? Date.parse(b.to) : Number.POSITIVE_INFINITY;

  if (aEnd !== bEnd) return bEnd - aEnd;

  const aStart = Date.parse(a.from);
  const bStart = Date.parse(b.from);
  if (!Number.isNaN(aStart) && !Number.isNaN(bStart) && aStart !== bStart) return bStart - aStart;

  return byOrder(a, b);
}
