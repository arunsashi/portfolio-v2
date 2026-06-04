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

    // Vote counters live on the archived item docs (written by /news/vote);
    // merge them into the report items so the Latest view shows counts.
    const report = clean(resource) as {
      items?: { id?: unknown; votesUp?: number; votesDown?: number }[];
    };
    if (Array.isArray(report.items) && report.items.length > 0) {
      const ids = report.items.map((i) => String(i.id));
      const { resources: counts } = await container.items
        .query({
          query:
            'SELECT c.id, c.votesUp, c.votesDown FROM c WHERE c.docType = @type AND ARRAY_CONTAINS(@ids, c.id)',
          parameters: [
            { name: '@type', value: 'item' },
            { name: '@ids', value: ids },
          ],
        })
        .fetchAll();

      const byId = new Map<string, { votesUp?: number; votesDown?: number }>(
        counts.map((c: { id: string; votesUp?: number; votesDown?: number }) => [c.id, c]),
      );
      for (const item of report.items) {
        const c = byId.get(String(item.id));
        if (typeof c?.votesUp === 'number') item.votesUp = c.votesUp;
        if (typeof c?.votesDown === 'number') item.votesDown = c.votesDown;
      }
    }

    return {
      status: 200,
      // 5 min — vote counts are visitor-facing social proof; keep them fresh.
      headers: { 'Cache-Control': 'public, max-age=300' },
      jsonBody: report,
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
