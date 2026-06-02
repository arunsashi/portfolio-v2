import { CosmosClient, Database } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

/**
 * Singleton CosmosClient reused across function invocations.
 *
 * Production is KEYLESS: the Function App's managed identity (granted
 * Cosmos "Data Reader" by the infrastructure repo) authenticates against
 * COSMOS_ENDPOINT — no keys or connection strings in app settings.
 *
 * Local dev may fall back to COSMOS_CONNECTION_STRING (keys), which lives
 * only in the git-ignored local.settings.json — never in the repo.
 */
let db: Database | undefined;

export function getDatabase(): Database {
  if (!db) {
    const databaseName = process.env['COSMOS_DATABASE'] ?? 'portfolio';
    const endpoint = process.env['COSMOS_ENDPOINT'];
    const connectionString = process.env['COSMOS_CONNECTION_STRING'];

    let client: CosmosClient;
    if (endpoint) {
      // Keyless via managed identity (production) or local az/dev credentials.
      client = new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
    } else if (connectionString) {
      // Local dev fallback only.
      client = new CosmosClient(connectionString);
    } else {
      throw new Error(
        'Cosmos is not configured: set COSMOS_ENDPOINT (keyless) or COSMOS_CONNECTION_STRING (local dev).',
      );
    }

    db = client.database(databaseName);
  }
  return db;
}

/** Strip Cosmos system fields from a document before returning it. */
export function clean<T extends Record<string, unknown>>(doc: T): T {
  const { _rid, _self, _etag, _ts, _attachments, ...rest } = doc as Record<string, unknown>;
  return rest as T;
}
