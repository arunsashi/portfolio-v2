import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { clean, getDatabase } from '../cosmos';

/** GET /api/testimonials — testimonial entries. */
export async function testimonials(
  _req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const container = getDatabase().container('testimonials');
  const { resources } = await container.items.query('SELECT * FROM c').fetchAll();

  return {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=300' },
    jsonBody: resources.map((doc: Record<string, unknown>) => clean(doc)),
  };
}

app.http('testimonials', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'testimonials',
  handler: testimonials,
});
