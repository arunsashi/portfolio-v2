# Portfolio-v2 — `arunsudi.dev`

A responsive, accessible personal portfolio for Arun Sudi. The front end is an Angular app styled with Tailwind v4. All content is data-driven from Azure Cosmos DB, served through a read-only Azure Functions API, with the front end hosted on Azure Static Web Apps at **[arunsudi.dev](https://arunsudi.dev)**.

Content domains: profile/about, skills, professional projects, learning projects, work experience, blog (Medium + dev.to aggregation), and contact.

## Repos: app vs. infrastructure

This repo owns **application code and CI/CD**. All **Azure provisioning** (creating the Cosmos account, Function App, Static Web App, networking, RBAC) lives in the separate [`infrastructure`](../infrastructure) repo as Bicep.

| Concern | Lives in |
|---------|----------|
| Angular front end, Functions API code | **this repo** (`Portfolio-v2`) |
| Build & deploy pipelines (GitHub Actions) | **this repo** (`.github/workflows/`) |
| Cosmos DB, Function App, Static Web App, RBAC, custom domain | **`infrastructure`** (Bicep modules + per-project deploy) |
| Cosmos seed data + seeder script (personal content) | **`infrastructure`** (private) — `app/projects/portfolio/seed/` |

The contract between them: `infrastructure` creates the resources and exposes their identifiers (SWA deployment token, Function App name, OIDC identity); this repo consumes them as repo secrets/variables and ships code into the already-provisioned resources. CI/CD here never creates or modifies Azure resources.

## Architecture

```
Browser
  ├─▶ Azure Static Web Apps (Free)         ← front end (Angular SPA, static assets)
  │
  └─▶ Azure Function App (Consumption)      ← read-only API (Node v4), called cross-origin via CORS
        │  authenticates keyless via managed identity
        ├── Cosmos DB (profile, skills, projects, experience)
        ├── Medium RSS + dev.to API (blog aggregation)
        └── Resend / Twilio (contact notifications)
```

The front end and the API are **deployed separately** to **two different resources**: the SPA to the Static Web App, the API to a standalone Function App. With the Free SWA tier the browser calls the Function App at its own hostname, so that hostname must be in the Function App's CORS allow-list (configured in the infrastructure repo). Switching the SWA to Standard (~$9/mo) would instead link the Function App as a same-origin `/api` backend and drop the CORS requirement.

Key constraints (see `AGENTS.md` for the full set of guardrails):

- **No direct browser-to-Cosmos access.** SWA Database Connections was retired (Nov 30, 2025), so all data flows through the Functions API, which is read-only.
- **Keyless Cosmos in production.** The Function App's system-assigned managed identity is granted Cosmos *Data Reader* (by the infrastructure repo). The API authenticates via `COSMOS_ENDPOINT` + `DefaultAzureCredential` — no keys or connection strings in production app settings.
- **Secrets stay server-side.** Medium/dev.to handles and email/WhatsApp credentials live only in the Function App's Application Settings — never in client code or the repo. The Statsig *client* key is the only key allowed in the front end.
- **Cosmos containers:** `profile`, `skills`, `projects` (professional + learning distinguished by `type`), `experience`, optional `companies`. `company`/`details` are denormalized into project docs. Editing is manual via the Cosmos Data Explorer.
- The API returns clean DTOs (Cosmos system fields `_rid/_self/_etag/_ts` stripped) and sets sensible `Cache-Control` headers.

### Coding conventions

Templates and styles are always separate files (`.html` / `.scss`, never inline). Tailwind-first: repeated patterns get named utilities in the `@theme` block of `styles.scss` (e.g. `shadow-hard*`) instead of arbitrary `[...]` values. Custom SCSS uses `@use` partials from `src/styles/` (on `includePaths`, so `@use 'functions' as *;` works anywhere) and never raw px — use `rem($px)` (1rem = 16px). Path aliases: `@core/*` → `app/*`, `@features/*` → `app/components/*`, `@shared/*` → `app/components/shared/*`, `@env` → environment.

### Tech stack

- **Front end:** Angular 21 (standalone components, Signals, zoneless, `OnPush`, new control flow, lazy routes, `@defer`), Tailwind v4 via PostCSS.
- **API:** Azure Functions Node v4 programming model, `@azure/cosmos`, `@azure/identity`, singleton `CosmosClient`.
- **Feature flags:** Statsig (`@statsig/js-client`), gates default OFF and fail safe.
- **Hosting:** Azure Static Web Apps (Free) + Azure Function App (Consumption) + Azure Cosmos DB (Free tier). Target cost ≈ $0/month aside from the `.dev` domain.

### API endpoints

Rooted at `/api`, all anonymous:

| Route | Method | Source | Notes |
|-------|--------|--------|-------|
| `/api/profile` | GET | Cosmos `profile` container | Template endpoint; skills/projects/experience follow the same shape |
| `/api/blog` | GET | Medium RSS + dev.to API | Merged and sorted, cached 15 min |
| `/api/contact` | POST | Resend (email) + Twilio (WhatsApp) | Honeypot + rate limit + optional Cloudflare Turnstile |

## Project layout

```
.
├── src/                      Angular app
│   ├── app/
│   │   ├── services/         data, loading, feature-flag, analytics
│   │   ├── interceptors/     HTTP interceptors
│   │   ├── config/           data-source + Statsig config
│   │   ├── const/            feature gates, storage keys
│   │   ├── entities/         models + enums
│   │   ├── pipes/  directives/
│   │   └── components/       layered: sub-components nest in their parent's folder
│   │       ├── shared/       page-loader, section-heading, …
│   │       ├── home/         hero (hire-me-modal inside), ticker, linkly, skills, …
│   │       └── project-detail/
│   └── styles/               _tokens, _functions (rem()), _mixins (SCSS @use)
├── api/                      Azure Functions API
│   └── src/
│       ├── cosmos.ts         singleton CosmosClient (keyless) + DTO cleaning
│       └── functions/        profile.ts, blog.ts, contact.ts
├── public/                   static assets
├── staticwebapp.config.json  SWA routing, headers, CSP
├── proxy.conf.json           dev proxy: /api → localhost:7071
└── .github/workflows/
    ├── deploy-web.yml        front end → Static Web App
    └── deploy-api.yml        API → Function App (OIDC)
```

## Running locally

### Prerequisites

- Node.js 20+
- Azure Functions Core Tools v4 (`func`) — `npm i -g azure-functions-core-tools@4`
- For live data: a Cosmos account you can reach. Keyless works locally too — `az login` with an account that has Cosmos *Data Reader* lets `DefaultAzureCredential` authenticate against `COSMOS_ENDPOINT`. A `COSMOS_CONNECTION_STRING` fallback is also supported for local-only use.

### Front end

```bash
npm install
npm start          # ng serve at http://localhost:4200
```

`ng serve` proxies `/api/*` to the Functions host at `http://localhost:7071` via `proxy.conf.json`, so run the API alongside it for live data. (In production the SPA calls the Function App's hostname directly — see the open item below.)

### API

```bash
cd api
npm install
cp local.settings.json.example local.settings.json   # then fill in real values
npm run build       # tsc → dist/
npm start           # func start at http://localhost:7071
```

`local.settings.json` is git-ignored. Set `COSMOS_ENDPOINT` (keyless, preferred) or `COSMOS_CONNECTION_STRING` (local-only fallback) for `/api/profile`; set `MEDIUM_USER` / `DEVTO_USER` for `/api/blog`; set the Resend and/or Twilio variables for `/api/contact` (each channel is skipped gracefully if its config is missing). Use `npm run watch` in the `api` folder to recompile TypeScript on change.

With both running, the app is at `http://localhost:4200` and the API at `http://localhost:7071/api/*`.

## Build

```bash
npm run build              # front end → dist/portfolio/browser
cd api && npm run build    # API → api/dist
```

## CI/CD

Two path-scoped GitHub Actions workflows in `.github/workflows/`, each triggered only when its part of the tree changes (and manually via `workflow_dispatch`):

- **`deploy-web.yml`** — builds the Angular app (`npm run build --configuration production`) and uploads `dist/portfolio/browser` to the Static Web App via the SWA deploy action.
- **`deploy-api.yml`** — builds `api/` (`tsc`, prunes dev deps), logs in to Azure with **OIDC** (federated credential, no stored cloud secrets), and deploys to the Function App.

Neither workflow provisions infrastructure — they ship code into resources the `infrastructure` repo already created.

### Required GitHub configuration

Set these on the repo (Settings → Secrets and variables → Actions). Values come from the `infrastructure` deploy outputs and its OIDC setup:

| Name | Kind | Used by | Source |
|------|------|---------|--------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | secret | deploy-web | SWA deployment token (`az staticwebapp secrets list …`) |
| `AZURE_CLIENT_ID` | secret | deploy-api | OIDC app/identity client ID |
| `AZURE_TENANT_ID` | secret | deploy-api | Azure tenant ID |
| `AZURE_SUBSCRIPTION_ID` | secret | deploy-api | Azure subscription ID |
| `AZURE_FUNCTIONAPP_NAME` | variable | deploy-api | Function App name from infra outputs |

The OIDC identity needs a federated credential whose subject matches this repo (e.g. `repo:<owner>/Portfolio-v2:ref:refs/heads/main`) and the appropriate role on the Function App's resource group — configured in the `infrastructure` repo.

## Deployment & hosting

- **Front end:** Azure **Static Web Apps (Free)**, served at **[arunsudi.dev](https://arunsudi.dev)** over HTTPS (SWA issues the `.dev` certificate automatically once the custom domain is validated).
- **API:** Azure **Function App (Consumption)**, reached cross-origin by the SPA via CORS.

Resource creation, app settings, CORS allow-list, and the custom domain are managed in the `infrastructure` repo; this repo only deploys code into them on push to `main`.

> Confirm before anything irreversible or costly — creating/deleting Azure resources, DNS changes, deploying to production, or rotating secrets.

## Open items

- **Front-end API base URL.** The app currently reads placeholder JSON (`DATA_SOURCE` → `PLACEHOLDER_DATA_SOURCE` in `app.config.ts`). When switching to the live API, because the standalone Function App is a **different origin** under the Free SWA tier, the `API_DATA_SOURCE.baseUrl` (and the two hard-coded `/api/...` calls in `data.service.ts` and `hire-me-modal.component.ts`) must point at the Function App hostname rather than `/api`. Wire this via an Angular environment value before going live, and confirm that hostname is in the Function App's CORS allow-list.

## License

See [LICENSE](LICENSE).
