import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { clean, getDatabase } from '../cosmos';

/** GET /api/skills — all skill categories (front end sorts by `order`). */
export async function skills(
  _req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const container = getDatabase().container('skills');
  const { resources } = await container.items.query('SELECT * FROM c').fetchAll();

  return {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=300' },
    jsonBody: resources.map((doc: Record<string, unknown>) => clean(doc)),
  };
}

app.http('skills', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'skills',
  handler: skills,
});
