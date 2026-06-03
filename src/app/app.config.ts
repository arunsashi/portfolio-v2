import {ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection,} from '@angular/core';
import {provideRouter, withComponentInputBinding, withInMemoryScrolling} from '@angular/router';
import {provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';

import {routes} from './app.routes';
import {API_DATA_SOURCE, DATA_SOURCE} from '@core/data/data-source.config';
import {loadingInterceptor} from '@core/loading/loading.interceptor';

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
    { provide: DATA_SOURCE, useValue: API_DATA_SOURCE},
  ],
};
