import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, tap } from 'rxjs';

import { LoadingService } from './loading.service';

/** Tracks every HTTP request (and its outcome) for the page loader. */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(
    tap({ error: () => loading.markFailure() }),
    finalize(() => loading.stop()),
  );
};
