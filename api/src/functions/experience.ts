import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { clean, getDatabase } from '../cosmos';

/** GET /api/experience — work experience entries (front end sorts by end date). */
export async function experience(
  _req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const container = getDatabase().container('experience');
  const { resources } = await container.items.query('SELECT * FROM c').fetchAll();

  return {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=300' },
    jsonBody: resources.map((doc: Record<string, unknown>) => clean(doc)),
  };
}

app.http('experience', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'experience',
  handler: experience,
});
