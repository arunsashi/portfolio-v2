// Default (development) environment.
// `ng serve` proxies /api -> the local Functions host (see proxy.conf.json),
// so a relative base works locally. The production file replaces this.
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  // Cloudflare Turnstile site key (public client key). Empty = widget disabled.
  turnstileSiteKey: '',
  // Statsig CLIENT key. Empty in dev = feature flags disabled (fail safe).
  statsigClientKey: '',
};
