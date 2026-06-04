// Default (development) environment.
// `ng serve` proxies /api -> the local Functions host (see proxy.conf.json),
// so a relative base works locally. The production file replaces this.

/**
 * DEV-ONLY Statsig key, read from the browser instead of the repo so it can
 * never be committed. Set it once in the DevTools console and reload:
 *
 *   localStorage.setItem('dev_statsig_key', 'client-XXXXXXXX')
 *
 * Dev builds report Statsig environment tier 'development', so gates can be
 * enabled for local preview via console rules without touching production.
 * Empty/unset = Statsig disabled, all gates fail safe (OFF).
 */
function readDevStatsigKey(): string {
  try {
    return localStorage.getItem('dev_statsig_key') ?? '';
  } catch {
    return '';
  }
}

export const environment = {
  production: false,
  apiBaseUrl: '/api',
  // Cloudflare Turnstile site key (public client key). Empty = widget disabled.
  turnstileSiteKey: '',
  statsigClientKey: readDevStatsigKey(),
};
