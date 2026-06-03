// One-off Cosmos seeder for the portfolio database.
//
// Reads the placeholder JSON in public/data/ and upserts each document into
// its container. Safe to re-run (upsert overwrites by id).
//
// Auth (pick one):
//   - COSMOS_CONNECTION_STRING   keys, simplest while disableLocalAuth = false
//   - COSMOS_ENDPOINT            keyless; uses your `az login` identity, which
//                                must hold Cosmos "Data Contributor" on the account
//
// Usage:
//   cd data/seed
//   npm install
//   COSMOS_CONNECTION_STRING="<primary connection string>" npm run seed
//
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', '..', 'public', 'data');
const DATABASE = process.env.COSMOS_DATABASE ?? 'portfolio';

// file -> container. The partition key of each container is set in the Bicep:
// profile=/id, skills=/category, projects=/type, experience=/type.
const SOURCES = [
  { file: 'profile.json', container: 'profile' },
  { file: 'skills.json', container: 'skills' },
  { file: 'projects.json', container: 'projects' },
  { file: 'experience.json', container: 'experience' },
  { file: 'testimonials.json', container: 'testimonials' },
];

function getClient() {
  const conn = process.env.COSMOS_CONNECTION_STRING;
  const endpoint = process.env.COSMOS_ENDPOINT;
  if (conn) return new CosmosClient(conn);
  if (endpoint) return new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
  throw new Error('Set COSMOS_CONNECTION_STRING or COSMOS_ENDPOINT before running.');
}

async function loadDocs(file) {
  const raw = JSON.parse(await readFile(join(dataDir, file), 'utf8'));
  const list = Array.isArray(raw) ? raw : [raw];
  // Cosmos requires a string `id`.
  return list.map((doc) => ({ ...doc, id: String(doc.id) }));
}

async function main() {
  const db = getClient().database(DATABASE);
  let total = 0;
  for (const { file, container } of SOURCES) {
    const docs = await loadDocs(file);
    const c = db.container(container);
    for (const doc of docs) {
      await c.items.upsert(doc);
    }
    total += docs.length;
    console.log(`  ${container}: upserted ${docs.length}`);
  }
  console.log(`Done. ${total} documents seeded into "${DATABASE}".`);
}

main().catch((err) => {
  console.error('Seed failed:', err.message ?? err);
  process.exit(1);
});
