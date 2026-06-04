import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
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
  readonly slug = input.required<string>();
  protected readonly project = toSignal(
    toObservable(this.slug).pipe(switchMap((slug) => this.data.getProject(slug))),
  );
}
