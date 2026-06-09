import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '@core/services/analytics.service';
import { DataService } from '@core/services/data.service';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-detail.component.html',
})
export class ProjectDetailComponent {
  private readonly data = inject(DataService);
  private readonly analytics = inject(AnalyticsService);
  readonly slug = input.required<string>();
  protected readonly project = toSignal(
    toObservable(this.slug).pipe(switchMap((slug) => this.data.getProject(slug))),
  );

  constructor() {
    effect(() => {
      this.analytics.projectDetailView(this.slug());
    });
  }
}
