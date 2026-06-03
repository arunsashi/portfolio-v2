// Production environment.
// On the Free SWA tier the API is a SEPARATE origin (the standalone Function
// App), so the front end calls it by absolute URL. This origin must be allowed
// by the Function App's CORS list (infra) and the site's CSP connect-src.
export const environment = {
  production: true,
  apiBaseUrl: 'https://func-arunsudi-prod.azurewebsites.net/api',
};