import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';

/**
 * POST /api/alert-relay?token=<secret>
 *
 * Bridges an Azure Monitor alert to a GitHub `repository_dispatch`. Azure
 * action-group webhooks can't attach a GitHub PAT, so the alert calls this
 * endpoint (guarded by a shared secret in the query string) and we forward to
 * GitHub with the token from server-side settings — kicking off the ai-triage
 * workflow (event_type `alert-2pct`).
 *
 * Settings: ALERT_RELAY_SECRET, GITHUB_DISPATCH_TOKEN, GITHUB_REPO ("owner/name").
 */
async function alertRelay(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const secret = process.env['ALERT_RELAY_SECRET'];
  const token = process.env['GITHUB_DISPATCH_TOKEN'];
  const repo = process.env['GITHUB_REPO'];

  if (!secret || req.query.get('token') !== secret) {
    return { status: 401, jsonBody: { error: 'unauthorized' }, headers: { 'Cache-Control': 'no-store' } };
  }
  if (!token || !repo) {
    ctx.error('alert-relay not configured (missing GITHUB_DISPATCH_TOKEN / GITHUB_REPO).');
    return { status: 500, jsonBody: { error: 'relay not configured' }, headers: { 'Cache-Control': 'no-store' } };
  }

  let payload: unknown = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'arunsudi-alert-relay',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event_type: 'alert-2pct', client_payload: payload }),
  });

  if (!res.ok) {
    const detail = await res.text();
    ctx.error(`repository_dispatch failed (${String(res.status)}): ${detail}`);
    return { status: 502, jsonBody: { error: 'dispatch failed', status: res.status }, headers: { 'Cache-Control': 'no-store' } };
  }

  return { status: 202, jsonBody: { ok: true }, headers: { 'Cache-Control': 'no-store' } };
}

app.http('alertRelay', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'alert-relay',
  handler: alertRelay,
});
