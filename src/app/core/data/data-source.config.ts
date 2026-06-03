import { InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';

/**
 * Where the DataService reads from.
 *
 * Placeholder phase: static JSON in `public/data/*.json`
 *   -> { baseUrl: 'data', jsonExt: true } gives `data/profile.json`.
 *
 * Live phase (current): the Azure Functions API at environment.apiBaseUrl.
 *   - dev:  '/api'  (proxied to the local Functions host)
 *   - prod: the standalone Function App's absolute URL (cross-origin)
 *   -> gives `<apiBaseUrl>/profile`.
 *
 * Swapping data sources is a one-line provider change in app.config.ts.
 */
export interface DataSourceConfig {
  baseUrl: string;
  jsonExt: boolean;
}

export const DATA_SOURCE = new InjectionToken<DataSourceConfig>('DATA_SOURCE');

export const PLACEHOLDER_DATA_SOURCE: DataSourceConfig = {
  baseUrl: 'data',
  jsonExt: true,
};

export const API_DATA_SOURCE: DataSourceConfig = {
  baseUrl: environment.apiBaseUrl,
  jsonExt: false,
};
