# Seed scripts

One-off Cosmos seeder (`seed.mjs`). Reads the JSON in `../../public/data/` and
upserts each document into its container in the `portfolio` database:

| File | Container | Partition key |
|------|-----------|---------------|
| `profile.json` | `profile` | `/id` |
| `skills.json` | `skills` | `/category` |
| `projects.json` | `projects` | `/type` |
| `experience.json` | `experience` | `/type` |
| `testimonials.json` | `testimonials` | `/id` |

Safe to re-run — `upsert` overwrites by `id`. The script coerces each `id` to a
string (Cosmos requires it).

## Seeding with keys (while `disableLocalAuth = false`)

```bash
npm install
export COSMOS_CONNECTION_STRING="$(az cosmosdb keys list \
  -n cosmos-arunsudi-prod -g rg-portfolio-prod \
  --type connection-strings --query 'connectionStrings[0].connectionString' -o tsv)"
npm run seed
unset COSMOS_CONNECTION_STRING
```

## Seeding keyless (while `disableLocalAuth = true`)

With keys disabled, Cosmos only accepts Azure AD identities that hold a Cosmos
**data-plane** role. This is separate from being subscription Owner — control-plane
roles do not grant data access. Your identity needs the **Cosmos DB Built-in Data
Contributor** role, which the infra grants to `seederPrincipalId`
(`PORTFOLIO_SEEDER_OBJECT_ID`).

Confirm (or grant) the role:

```bash
MY_ID=$(az ad signed-in-user show --query id -o tsv)

# Check
az cosmosdb sql role assignment list \
  --account-name cosmos-arunsudi-prod -g rg-portfolio-prod -o table

# Grant if missing (...0002 = Data Contributor, ...0001 = read-only)
az cosmosdb sql role assignment create \
  --account-name cosmos-arunsudi-prod -g rg-portfolio-prod \
  --role-definition-id 00000000-0000-0000-0000-000000000002 \
  --principal-id "$MY_ID" --scope "/"
```

Then seed via the endpoint (no keys). The script uses `DefaultAzureCredential`,
which locally falls through to your `az login` session:

```bash
npm install
unset COSMOS_CONNECTION_STRING            # must be absent, or it takes precedence
export COSMOS_ENDPOINT="https://cosmos-arunsudi-prod.documents.azure.com:443/"
npm run seed
unset COSMOS_ENDPOINT
```

### Troubleshooting

- **403 / blocked by auth** — identity lacks the data role, or it hasn't propagated
  (wait a few minutes).
- **Credential errors** — `az account show`; make sure you're in the subscription/
  tenant that owns the Cosmos account.
- **NotFound on a container** — it doesn't exist yet; deploy the infra first
  (`testimonials` is the newest container).

## Notes (playbook)

- Editing data after seeding is manual via the Cosmos Data Explorer (also needs the
  data-plane role when keyless).
- Denormalize: embed `company` / rich `details` inside each project doc.
- Re-key duplicate skill ids; add `slug` / `order` where useful.
