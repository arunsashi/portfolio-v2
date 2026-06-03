// Production environment.
// On the Free SWA tier the API is a SEPARATE origin (the standalone Function
// App), so the front end calls it by absolute URL. This origin must be allowed
// by the Function App's CORS list (infra) and the site's CSP connect-src.
export const environment = {
  production: true,
  apiBaseUrl: 'https://func-arunsudi-prod.azurewebsites.net/api',
  // Cloudflare Turnstile site key (public client key). Fill with your real key to
  // enable the widget; must pair with TURNSTILE_SECRET_KEY on the Function App.
  // Empty = widget disabled (and the API must also leave the secret empty).
  turnstileSiteKey: '0x4AAAAAADeLwq5pZ3UmaYGN',
};