import {ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection,} from '@angular/core';
import {provideRouter, withComponentInputBinding, withInMemoryScrolling} from '@angular/router';
import {provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';

import {routes} from './app.routes';
import {API_DATA_SOURCE,PLACEHOLDER_DATA_SOURCE, DATA_SOURCE} from '@core/data/data-source.config';
import {loadingInterceptor} from '@core/loading/loading.interceptor';
import {provideStatsig} from '@core/feature-flags/statsig.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'top' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([loadingInterceptor])),
    ...provideStatsig(),
    { provide: DATA_SOURCE, useValue: PLACEHOLDER_DATA_SOURCE},
  ],
};
