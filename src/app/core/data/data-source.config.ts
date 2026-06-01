import { InjectionToken } from '@angular/core';

/**
 * Where the DataService reads from.
 *
 * Placeholder phase (now): static JSON in `public/data/*.json`
 *   -> { baseUrl: 'data', jsonExt: true } gives `data/profile.json`.
 *
 * Live phase (playbook step 4): the managed Azure Functions API
 *   -> { baseUrl: '/api', jsonExt: false } gives `/api/profile`.
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
  jsonExt: false,
};

export const API_DATA_SOURCE: DataSourceConfig = {
  baseUrl: '/api',
  jsonExt: false,
};
