// Production environment.
// On the Free SWA tier the API is a SEPARATE origin (the standalone Function
// App), so the front end calls it by absolute URL. This origin must be allowed
// by the Function App's CORS list (infra) and the site's CSP connect-src.
export const environment = {
  production: true,
  apiBaseUrl: 'https://func-arunsudi-prod.azurewebsites.net/api',
  // Cloudflare Turnstile site key (public client key), injected at build time
  // from the TURNSTILE_SITE_KEY secret (deploy-web). Must pair with
  // TURNSTILE_SECRET_KEY on the Function App. Empty secret = widget disabled.
  turnstileSiteKey: '__TURNSTILE_SITE_KEY__',
  // Statsig CLIENT key. The deploy-web workflow replaces this placeholder with
  // the STATSIG_CLIENT_KEY secret at build time. If left as-is / empty, feature
  // flags are disabled and all gates fail safe (OFF).
  statsigClientKey: '__STATSIG_CLIENT_KEY__',
};