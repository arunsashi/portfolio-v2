import { CosmosClient, Database } from '@azure/cosmos';

/**
 * Singleton CosmosClient reused across function invocations (playbook §4).
 * The connection string lives ONLY in SWA Application Settings
 * (COSMOS_CONNECTION_STRING) — never in the repo or client code.
 */
let db: Database | undefined;

export function getDatabase(): Database {
  if (!db) {
    const connectionString = process.env['COSMOS_CONNECTION_STRING'];
    if (!connectionString) {
      throw new Error('COSMOS_CONNECTION_STRING is not configured.');
    }
    const client = new CosmosClient(connectionString);
    db = client.database('portfolio');
  }
  return db;
}

/** Strip Cosmos system fields from a document before returning it. */
export function clean<T extends Record<string, unknown>>(doc: T): T {
  const { _rid, _self, _etag, _ts, _attachments, ...rest } = doc as Record<string, unknown>;
  return rest as T;
}
