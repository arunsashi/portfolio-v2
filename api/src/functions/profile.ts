import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { clean, getDatabase } from '../cosmos';

/**
 * GET /api/profile — returns the single profile document.
 *
 * Template endpoint for the read-only API. The other endpoints
 * (skills, projects, experience, blog) follow the same shape.
 */
export async function profile(
  _req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const container = getDatabase().container('profile');
  const { resources } = await container.items
    .query('SELECT * FROM c')
    .fetchAll();

  if (!resources.length) {
    return { status: 404, jsonBody: { error: 'Profile not found' } };
  }

  return {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=300' },
    jsonBody: clean(resources[0]),
  };
}

app.http('profile', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'profile',
  handler: profile,
});
