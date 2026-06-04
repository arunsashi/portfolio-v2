import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { clean, getDatabase } from '../cosmos';

/**
 * GET /api/news — returns the latest NewsReport stored by the news-refresh timer.
 *
 * The entire report lives as a single CosmosDB document (id: 'latest') so reads
 * are a cheap point-lookup. Cached for 1 hour — the timer only updates once daily.
 */
export async function news(
  _req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const container = getDatabase().container('news');

  try {
    const { resource } = await container
      .item('latest', 'latest')
      .read<Record<string, unknown>>();

    if (!resource) {
      return { status: 404, jsonBody: { error: 'No news report found.' } };
    }

    return {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=3600' },
      jsonBody: clean(resource),
    };
  } catch (err: unknown) {
    // CosmosDB throws a 404-coded error when the document doesn't exist yet.
    if ((err as { code?: number }).code === 404) {
      return { status: 404, jsonBody: { error: 'No news report found.' } };
    }
    throw err;
  }
}

app.http('news', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'news',
  handler: news,
});
