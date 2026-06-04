import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { getDatabase } from '../cosmos';

/**
 * POST /api/news/vote — thumbs up/down on a news item.
 *
 * Counters live on the archived item document (votesUp / votesDown) and are
 * updated with atomic Cosmos PATCH increments. The client sends its previous
 * vote so switching/retracting adjusts both counters in one call.
 *
 * Dedupe is client-side (stable visitor id + localStorage) — good enough for
 * a portfolio; the per-IP rate limit blunts abuse.
 */

type VoteDirection = 'up' | 'down';

interface VoteRequest {
  itemId: string;
  /** The new vote; null retracts. */
  vote: VoteDirection | null;
  /** The visitor's previous vote on this item, if any. */
  previous: VoteDirection | null;
}

const ITEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,119}$/;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const inMemoryRateLimit = new Map<string, number[]>();

export async function newsVote(
  req: HttpRequest,
  ctx: InvocationContext,
): Promise<HttpResponseInit> {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!consumeRateLimit(ip)) {
    return json(429, { error: 'Too many votes. Please slow down.' });
  }

  const body = (await req.json().catch(() => null)) as Partial<VoteRequest> | null;
  const parsed = validate(body);
  if (!parsed) {
    return json(400, { error: 'Invalid vote payload.' });
  }

  const deltas = computeDeltas(parsed);
  if (deltas.up === 0 && deltas.down === 0) {
    return json(200, { ok: true, counted: false });
  }

  const operations = [];
  if (deltas.up !== 0) operations.push({ op: 'incr' as const, path: '/votesUp', value: deltas.up });
  if (deltas.down !== 0) operations.push({ op: 'incr' as const, path: '/votesDown', value: deltas.down });

  const container = getDatabase().container('news');
  try {
    await container.item(parsed.itemId, parsed.itemId).patch(operations);
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code === 404) {
      // No archive doc yet (item only exists inside the 'latest' report —
      // e.g. before the first refresh run after the archive feature shipped).
      // Materialize the doc from the latest report so the vote is never lost.
      const created = await materializeFromLatest(container, parsed.itemId, deltas);
      return json(200, { ok: true, counted: created });
    }
    ctx.error('news vote failed', err);
    return json(500, { error: 'Could not record the vote.' });
  }

  return json(200, { ok: true, counted: true });
}

/** Create the archive doc for an item that so far only exists in 'latest'. */
async function materializeFromLatest(
  container: ReturnType<ReturnType<typeof getDatabase>['container']>,
  itemId: string,
  deltas: { up: number; down: number },
): Promise<boolean> {
  try {
    const { resource } = await container
      .item('latest', 'latest')
      .read<{ generatedAt?: string; items?: { id?: string }[] }>();
    const item = resource?.items?.find((i) => String(i.id) === itemId);
    if (!item) return false; // unknown id — reject quietly (abuse surface)

    await container.items.upsert({
      ...item,
      docType: 'item',
      reportDate: resource?.generatedAt ?? new Date().toISOString().slice(0, 10),
      votesUp: Math.max(0, deltas.up),
      votesDown: Math.max(0, deltas.down),
    });
    return true;
  } catch {
    return false;
  }
}

function validate(body: Partial<VoteRequest> | null): VoteRequest | null {
  if (!body || typeof body.itemId !== 'string' || !ITEM_ID_PATTERN.test(body.itemId)) {
    return null;
  }
  const isVote = (v: unknown): v is VoteDirection | null =>
    v === 'up' || v === 'down' || v === null;
  const vote = body.vote ?? null;
  const previous = body.previous ?? null;
  if (!isVote(vote) || !isVote(previous)) return null;
  if (vote === previous) return null; // no-op or malformed
  return { itemId: body.itemId, vote, previous };
}

/** Per-counter deltas, each clamped to [-1, 1] by construction. */
function computeDeltas(v: VoteRequest): { up: number; down: number } {
  let up = 0;
  let down = 0;
  if (v.previous === 'up') up -= 1;
  if (v.previous === 'down') down -= 1;
  if (v.vote === 'up') up += 1;
  if (v.vote === 'down') down += 1;
  return { up, down };
}

function consumeRateLimit(key: string): boolean {
  const now = Date.now();
  const next = (inMemoryRateLimit.get(key) ?? []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
  );
  if (next.length >= RATE_LIMIT_MAX) {
    inMemoryRateLimit.set(key, next);
    return false;
  }
  next.push(now);
  inMemoryRateLimit.set(key, next);
  return true;
}

function json(status: number, jsonBody: unknown): HttpResponseInit {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    jsonBody,
  };
}

app.http('newsVote', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'news/vote',
  handler: newsVote,
});
