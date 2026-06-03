import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { clean, getDatabase } from '../cosmos';

/** GET /api/projects — all projects (professional + learning; front end filters by `type`). */
export async function projects(
  _req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const container = getDatabase().container('projects');
  const { resources } = await container.items.query('SELECT * FROM c').fetchAll();

  return {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=300' },
    jsonBody: resources.map((doc: Record<string, unknown>) => clean(doc)),
  };
}

app.http('projects', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'projects',
  handler: projects,
});
