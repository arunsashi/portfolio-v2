import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { clean, getDatabase } from '../cosmos';

/**
 * GET /api/news/archive — every news item ever published (the news-refresh
 * timer appends items as individual documents), newest first. Capped at 500
 * to keep the payload sane; search/filtering happens client-side.
 */
export async function newsArchive(
  _req: HttpRequest,
  _ctx: InvocationContext,
): Promise<HttpResponseInit> {
  const container = getDatabase().container('news');

  const { resources } = await container.items
    .query({
      query: 'SELECT TOP 500 * FROM c WHERE c.docType = @type ORDER BY c.reportDate DESC',
      parameters: [{ name: '@type', value: 'item' }],
    })
    .fetchAll();

  // Newest report first; event date as the tiebreaker within a report.
  // (reportDate stays in the payload — it's the archive's sort/display key.)
  const items = resources
    .map((doc: Record<string, unknown>) => {
      const { docType: _docType, ...rest } = clean(doc);
      return rest as { reportDate?: string; date?: string };
    })
    .sort(
      (a, b) =>
        String(b.reportDate ?? '').localeCompare(String(a.reportDate ?? '')) ||
        String(b.date ?? '').localeCompare(String(a.date ?? '')),
    );

  return {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=900' },
    jsonBody: items,
  };
}

app.http('newsArchive', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'news/archive',
  handler: newsArchive,
});
