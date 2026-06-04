import {provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {type ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection,} from '@angular/core';
import {provideRouter, withComponentInputBinding, withInMemoryScrolling} from '@angular/router';
import {API_DATA_SOURCE, DATA_SOURCE, PLACEHOLDER_DATA_SOURCE} from '@core/config/data-source.config';
import {provideStatsig} from '@core/config/statsig.providers';
import {loadingInterceptor} from '@core/interceptors/loading.interceptor';
import {environment} from '@env';

import {routes} from './app.routes';

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
    // Production ALWAYS uses the live API (placeholder JSON is gitignored and
    // never deployed). Dev defaults to local placeholder JSON; switch to
    // API_DATA_SOURCE locally when testing against `func start` via the proxy.
    {
      provide: DATA_SOURCE,
      useValue: environment.production ? API_DATA_SOURCE : PLACEHOLDER_DATA_SOURCE,
    },
  ],
};
