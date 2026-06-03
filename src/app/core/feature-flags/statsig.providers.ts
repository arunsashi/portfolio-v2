import { Provider } from '@angular/core';
import { STATSIG_INIT_CONFIG } from '@statsig/angular-bindings';
import type { StatsigOptions } from '@statsig/js-client';

import { environment } from '../../../environments/environment';
import { buildStatsigUser } from './statsig-user';

/**
 * Statsig providers — registered only when a CLIENT key is configured
 * (injected at build time from the STATSIG_CLIENT_KEY secret). When absent,
 * no providers are added and FeatureFlagService fails safe (every gate OFF).
 */
export function provideStatsig(): Provider[] {
  const sdkKey = environment.statsigClientKey;
  if (!sdkKey) return [];

  const options: StatsigOptions = {
    environment: { tier: environment.production ? 'production' : 'development' },
  };

  return [
    {
      provide: STATSIG_INIT_CONFIG,
      useValue: { sdkKey, user: buildStatsigUser(), options },
    },
  ];
}
