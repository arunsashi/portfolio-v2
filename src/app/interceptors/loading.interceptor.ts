import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoadingService } from '@core/services/loading.service';
import { finalize, tap } from 'rxjs';

/** Tracks every HTTP request (and its outcome) for the page loader. */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(
    tap({ error: () => { loading.markFailure(); } }),
    finalize(() => { loading.stop(); }),
  );
};
