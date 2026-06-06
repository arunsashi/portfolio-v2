# Coding standards — `arunsudi.dev` portfolio

The single rubric for writing and **reviewing** code in this repo. The PR-Review
agent checks every PR against this file; the Developer agent must conform from the
start. It encodes both repo-specific conventions and the general industry standards
we hold to. If a rule here ever conflicts with `AGENTS.md` or the project
instructions, flag it — don't silently diverge.

## 0. Golden rules

- **No secrets in the repo or client code.** Cosmos connection strings, Anthropic /
  Resend / Twilio / Turnstile-secret keys live only in server-side settings (GitHub
  secrets → Function App app settings). The Statsig **client** key is the only key
  allowed in the front end. Never log a secret, never paste one into a file.
- **The `/api` is read-only for content.** It only writes to the `news` container
  (votes + daily refresh). No write paths to profile/skills/projects/etc.
- **Accessibility (WCAG 2.x AA) is non-negotiable** — see §6.
- **Lint must pass.** Strict ESLint is the CI gate; zero errors before a PR is ready.
- **Small, reviewable changes** with clear conventional-commit messages.

## 1. Linting & TypeScript (hard gate)

Strict flat config at `eslint.config.js`: typescript-eslint **strict-type-checked**
+ **stylistic-type-checked**, Angular TS + template + **accessibility** rules,
`simple-import-sort`, `unused-imports`. `tsconfig` is `strict` with
`strictTemplates`, `noImplicitReturns`, `noImplicitOverride`.

- No `any`. Use precise types or `unknown` + narrowing. Catch clauses are `unknown`.
- **Explicit return types** on functions (expressions may infer).
- **Strong interfaces for all data** — every API DTO and entity is typed; front-end
  entities mirror the API shapes.
- `import type` for types, **inline** (`import { type Foo }`); imports are
  **sorted** (auto-fixed via `npm run lint:fix`); no unused imports/vars (prefix
  intentional unused with `_`).
- No empty functions, no dead code. `no-unnecessary-condition` flags fallbacks the
  types make impossible — remove them, don't appease them.
- Fire-and-forget promises are `void`-ed; never floating.
- Run `npm run lint` after **every** change. If your environment can't execute
  eslint, say so explicitly — never assume it passes.

## 2. Angular conventions

- **Standalone components only** (no NgModules). **Signals** for state; **zoneless**;
  `ChangeDetectionStrategy.OnPush` everywhere.
- **New control flow** (`@if` / `@for` / `@switch`) — never the legacy `*ngIf`/
  `*ngFor`. `@for` must have `track`.
- Inputs/outputs via `input()` / `output()`; queries via `viewChild()` etc.;
  `inject()` over constructor params.
- Lazy routes; `@defer` for heavy / below-the-fold sections.
- Selectors: components `app-` kebab-case element; directives `app` camelCase
  attribute.
- **Minimal dependencies** — prefer the platform and CSS over libraries. No new
  runtime dependency (especially animation/UI frameworks) without sign-off.

## 3. Files & structure

- **Always separate HTML and SCSS** — no inline `template`/`styles`. One component =
  `.ts` + `.html` + `.scss`.
- Directory layout: `app/services`, `app/config`, `app/const`, `app/entities`,
  `app/components` (layered — sub-components nest in their parent's folder),
  `app/pipes`, `app/directives` (split by functionality).
- Path aliases: `@core/*`, `@features/*`, `@shared/*` — use them instead of deep
  relative paths.
- Reusable behavior → a directive (see `MarqueeDirective`, `DragScrollDirective`,
  `VoteBurstDirective`); reusable transforms → a pipe. Don't duplicate logic across
  components.

## 4. Styling (Tailwind v4 + SCSS)

- **Tailwind-first.** Use utility classes in templates. Tailwind v4 has **no JS
  config** — custom utilities/tokens live in the `@theme` block in `src/styles.scss`.
- **Design tokens, not hardcoded values.** Colors/spacing/shadows come from `@theme`
  custom properties (e.g. `--color-*`, `--shadow-hard*`). No ad-hoc hex or
  `shadow-[...]` arbitrary values; mirror tokens kept in `src/styles/_tokens.scss`.
- **No raw px.** Use the `rem()` SCSS function (`@use 'functions' as *;` —
  `1rem = 16px`) in component SCSS. Tailwind spacing scale otherwise.
- SCSS uses `@use` (never `@import`); shared partials (`_functions`, `_mixins`,
  `_tokens`) are on `includePaths`.
- All non-essential motion gated behind `prefers-reduced-motion`.

## 5. Azure Functions (API)

- Node v4 programming model (`app.http(...)` / `app.timer(...)`).
- **Singleton CosmosClient**; keyless auth via managed identity
  (`DefaultAzureCredential` + `COSMOS_ENDPOINT`) — never connection strings in code.
- Return **clean DTOs** — strip Cosmos system fields (`_rid/_self/_etag/_ts`).
- Set sensible `Cache-Control` per endpoint (e.g. news 5 min, votes/refresh
  `no-store`).
- Validate and bound all input; rate-limit write endpoints. Surface useful error
  detail in logs (`ctx.error`) without leaking internals or secrets to clients.

## 6. Accessibility (WCAG 2.x AA — hard requirement)

- Semantic HTML, correct heading order, landmarks, a skip link, visible focus,
  full keyboard operability, labeled images/controls (the Angular template a11y
  lint rules enforce much of this).
- Contrast ≥ 4.5:1 — adjust tokens if a combination fails.
- Reduced-motion honored for every animation.
- Reviews include a keyboard pass; CI should run axe + Lighthouse and fail on
  regressions.

## 7. Feature flags (Statsig)

- `@statsig/*` initialized once at startup with the client key + stable anonymous
  visitor id. **Gates default OFF and must fail safe** — if Statsig is blocked, the
  UI degrades gracefully. No code-level gate overrides; manage gates in the Statsig
  console. CSP allows `featureassets.org` / `prodregistryv2.org`.

## 8. Git, branches & commits

- Branch off latest `main`, prefixed by type: `feature/…`, `bugfix/…`, `chore/…`,
  `hotfix/…` (monitor-driven). One change per branch.
- **Conventional commits.** The CI version bump reads them: `feat:` → minor,
  `major:`/`overhaul:` → major, anything else → patch. The **API always majors**.
- Small, focused commits with clear messages; rebase on `main` before the PR is
  marked ready.
- Never commit secrets, `local.settings.json`, or build output.

## 9. PR review checklist (what the PR-Review agent enforces)

A PR is approvable only when all hold:

- [ ] `npm run lint` clean; `tsc` clean (app + api); build succeeds.
- [ ] No `any`, explicit return types, sorted/inline type imports, no dead code.
- [ ] HTML/SCSS separated; tokens + `rem()` used (no hardcoded px/hex/arbitrary
      shadows); Tailwind-first.
- [ ] Angular: standalone, signals, OnPush, new control flow, `@for` tracked.
- [ ] No new runtime dependency without justification.
- [ ] Accessibility: semantics, focus, labels, contrast, reduced-motion.
- [ ] No secrets added; `/api` stays read-only except `news`; DTOs cleaned;
      `Cache-Control` sensible.
- [ ] Feature-flagged work defaults OFF and fails safe.
- [ ] Conventional-commit title; branch named by type; scoped, reviewable diff.
- [ ] QA e2e specs for the change are present and green.
- [ ] Change matches Figma intent where visual; no invented sections/data.
