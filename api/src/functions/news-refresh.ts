import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
  Timer,
} from '@azure/functions';
import Anthropic from '@anthropic-ai/sdk';

import { getDatabase } from '../cosmos';

// ---------------------------------------------------------------------------
// Types (mirror src/app/entities/news.model.ts in the Angular app)
// ---------------------------------------------------------------------------

type NewsCategory = 'ui-ux' | 'api' | 'ai' | 'security' | 'investing';

interface NewsItem {
  id: string;
  category: NewsCategory;
  categoryLabel: string;
  title: string;
  summary: string;
  sourceUrl?: string;
  sourceName?: string;
  date: string;
  tags: string[];
  accent: string;
  tickerLabel: string;
}

interface NewsReport {
  generatedAt: string;
  items: NewsItem[];
}

// ---------------------------------------------------------------------------
// System prompt — static content marked for prompt caching.
// The anchor source list is pre-defined so Claude doesn't waste tokens
// re-discovering good sources on every run.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `\
You are a tech journalist generating a structured daily news briefing.

## Your output
You MUST call the \`publish_news_report\` tool with a complete NewsReport JSON object.
Do not write any prose. The tool call IS the output.

## Report structure — always 3 parts

### Part 1 — Dev Trends
Cover three sub-areas. Aim for 3-4 items each (9-12 total).
- **UI/UX** (category: "ui-ux", accent: "teal", categoryLabel: "UI/UX")
  Frameworks, design tooling, component libraries, accessibility trends.
- **API Dev** (category: "api", accent: "blue", categoryLabel: "API Dev")
  Protocols, specs, standards, API security patterns.
- **AI / AI Engineering** (category: "ai", accent: "purple", categoryLabel: "AI")
  LLMs, agent frameworks, coding tools, RAG, on-device inference.

### Part 2 — Security Incidents (4-6 items)
category: "security", accent: "pink", categoryLabel: "Security"
Recent supply chain attacks, compromised packages/extensions, CVEs, credential theft.
Prioritize incidents with clear attacker vectors and measurable impact.

### Part 3 — Markets (4-5 items)
category: "investing", accent: "gold", categoryLabel: "Markets"
Top tech/AI/semiconductor stocks worth watching. Include recent catalysts
(earnings, product launches, analyst upgrades). Do NOT include financial advice
in summaries — keep them factual with specific numbers.

## Anchor sources — draw on these first
These are high-signal, frequently updated sources per domain:

UI/UX: syncfusion.com/blogs · uxpin.com/studio/blog · zignuts.com/blog
API: apidog.com/blog · konghq.com/blog · pockit.tools/blog
AI: braiviq.com/blog · digitalapplied.com/blog · ragaboutit.com · edge-ai-vision.com · alicelabs.ai/insights
Security: kaspersky.com/blog · orca.security/resources/blog · huntress.com/blog · silobreaker.com/blog · unit42.paloaltonetworks.com
Markets: fool.com/investing · cnbc.com/technology · stocktitan.net · geekwire.com

Include real \`sourceUrl\` and \`sourceName\` values referencing these anchor sources wherever you
have knowledge of a specific article or piece of content from them.

## Field rules
- id: kebab-case slug, unique, descriptive (e.g. "axios-npm-compromise-2026")
- tickerLabel: ≤10 words, punchy, reads well in UPPERCASE — scrolls live in a portfolio ticker
- tags: 3-5 short tech terms, title-cased, no full sentences
- date: ISO date of the event/article, not today's date (unless the event is today)
- summary: 2-4 sentences — include specific numbers/stats where available
- sourceUrl: omit the field entirely if you don't have a real URL (never use null or placeholder)
`;

// ---------------------------------------------------------------------------
// Tool definition — forces structured JSON output
// ---------------------------------------------------------------------------

const PUBLISH_TOOL: Anthropic.Tool = {
  name: 'publish_news_report',
  description: 'Publish the complete daily news report. Call this once with all items gathered.',
  input_schema: {
    type: 'object',
    required: ['generatedAt', 'items'],
    properties: {
      generatedAt: {
        type: 'string',
        description: 'ISO date of this report, e.g. "2026-06-03"',
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'category', 'categoryLabel', 'title', 'summary', 'date', 'tags', 'accent', 'tickerLabel'],
          properties: {
            id:            { type: 'string' },
            category:      { type: 'string', enum: ['ui-ux', 'api', 'ai', 'security', 'investing'] },
            categoryLabel: { type: 'string' },
            title:         { type: 'string' },
            summary:       { type: 'string' },
            sourceUrl:     { type: 'string' },
            sourceName:    { type: 'string' },
            date:          { type: 'string' },
            tags:          { type: 'array', items: { type: 'string' } },
            accent:        { type: 'string', enum: ['teal', 'blue', 'purple', 'pink', 'gold'] },
            tickerLabel:   { type: 'string' },
          },
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Timer trigger — runs daily at 06:00 UTC
// ---------------------------------------------------------------------------

/**
 * Aggregate net reader votes (last 30 days) by category and tag into a
 * soft-steer prompt block. Empty string when there's no meaningful signal.
 */
async function buildAudienceSignal(ctx: InvocationContext): Promise<string> {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const container = getDatabase().container('news');
    const { resources } = await container.items
      .query({
        query:
          'SELECT c.category, c.tags, c.votesUp, c.votesDown FROM c WHERE c.docType = @type AND c.reportDate >= @cutoff AND (IS_DEFINED(c.votesUp) OR IS_DEFINED(c.votesDown))',
        parameters: [
          { name: '@type', value: 'item' },
          { name: '@cutoff', value: cutoff },
        ],
      })
      .fetchAll();

    if (resources.length === 0) return '';

    const catNet = new Map<string, number>();
    const tagNet = new Map<string, number>();
    for (const r of resources as {
      category?: string;
      tags?: string[];
      votesUp?: number;
      votesDown?: number;
    }[]) {
      const net = (r.votesUp ?? 0) - (r.votesDown ?? 0);
      if (net === 0) continue;
      if (r.category) catNet.set(r.category, (catNet.get(r.category) ?? 0) + net);
      for (const tag of r.tags ?? []) tagNet.set(tag, (tagNet.get(tag) ?? 0) + net);
    }

    // Ignore noise below a net of ±2.
    const fmt = (m: Map<string, number>, dir: 1 | -1, max: number): string =>
      [...m.entries()]
        .filter(([, n]) => dir * n >= 2)
        .sort((a, b) => dir * (b[1] - a[1]))
        .slice(0, max)
        .map(([k, n]) => `${k} (${n > 0 ? '+' : ''}${n})`)
        .join(', ');

    const lines: string[] = [];
    const upCats = fmt(catNet, 1, 5);
    const upTags = fmt(tagNet, 1, 8);
    const downCats = fmt(catNet, -1, 5);
    const downTags = fmt(tagNet, -1, 5);
    if (upCats) lines.push(`Most approved categories: ${upCats}`);
    if (upTags) lines.push(`Most approved topics: ${upTags}`);
    if (downCats) lines.push(`Least approved categories: ${downCats}`);
    if (downTags) lines.push(`Least approved topics: ${downTags}`);
    if (lines.length === 0) return '';

    ctx.log(`Audience signal: ${lines.join(' | ')}`);
    return [
      '',
      '',
      '## Audience signal (reader votes, last 30 days)',
      ...lines,
      'Guidance: keep the standard report structure and per-category item counts,',
      'but WITHIN each category prefer stories on approved themes and de-emphasize',
      'less-approved ones. This is a soft signal — genuine newsworthiness still wins.',
    ].join('\n');
  } catch (err) {
    ctx.warn('Audience signal skipped:', err);
    return '';
  }
}

/**
 * Generate today's briefing and persist it (latest doc + archive items).
 * Returns the item count. Throws if the API key is missing or Claude doesn't
 * return the expected tool call, so callers can surface the failure.
 */
async function runNewsRefresh(ctx: InvocationContext): Promise<number> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured.');
  }

  const today = new Date().toISOString().split('T')[0];
  ctx.log(`Daily news refresh starting for ${today}…`);

  const client = new Anthropic({ apiKey });

  // Soft steer from reader votes — appended to the USER message so the cached
  // static system prompt is never invalidated.
  const audienceSignal = await buildAudienceSignal(ctx);

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    // Prompt caching: the static system prompt (anchor sources + instructions)
    // is cached for 5 minutes — saves input tokens on retries and re-runs.
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [PUBLISH_TOOL],
    // Force a single structured output — no prose, no multi-turn needed.
    tool_choice: { type: 'tool', name: 'publish_news_report' },
    messages: [
      {
        role: 'user',
        content: `Generate today's daily news briefing. Today is ${today}. Draw on the most recent developments you know about, referencing anchor sources where you have specific article knowledge.${audienceSignal}`,
      },
    ],
  });

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === 'tool_use' && b.name === 'publish_news_report',
  );

  if (!toolBlock) {
    throw new Error(
      `Unexpected response: no publish_news_report tool call. stop_reason=${response.stop_reason}`,
    );
  }

  const report = toolBlock.input as NewsReport;

  // Upsert the full report as a single CosmosDB document.
  // The Angular app reads it with one point-lookup (id='latest').
  const container = getDatabase().container('news');
  await container.items.upsert({ id: 'latest', ...report });

  // Append every item to the archive as its own document. Item ids are
  // stable kebab-case slugs, so a story that runs on consecutive days
  // upserts onto itself instead of duplicating. `docType` separates
  // archive items from the 'latest' report doc in queries.
  for (const item of report.items) {
    await container.items.upsert({
      ...item,
      docType: 'item',
      reportDate: report.generatedAt,
    });
  }

  ctx.log(
    `News refresh complete — ${report.items.length} items stored (+archived), generatedAt=${report.generatedAt}`,
  );
  ctx.log(
    `Prompt cache: ${response.usage.cache_read_input_tokens ?? 0} read / ${response.usage.cache_creation_input_tokens ?? 0} created`,
  );

  return report.items.length;
}

// ---------------------------------------------------------------------------
// Timer trigger — runs daily at 06:00 UTC
// ---------------------------------------------------------------------------

async function newsRefreshTimer(_timer: Timer, ctx: InvocationContext): Promise<void> {
  ctx.log('Daily news refresh (timer) starting…');
  try {
    await runNewsRefresh(ctx);
  } catch (err) {
    // Don't throw from the timer — a missing key or transient API error
    // shouldn't spam the runtime with unhandled failures; the next run retries.
    ctx.error('Scheduled news refresh failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Manual trigger — POST /api/news/refresh, protected by Azure's admin key.
// Lets us force a refresh out of band (e.g. right after wiring the API key)
// instead of waiting for 06:00 UTC. authLevel 'admin' requires the Function
// App master key (?code=… or x-functions-key header) — no custom secret.
// ---------------------------------------------------------------------------

async function newsRefreshHttp(
  _req: HttpRequest,
  ctx: InvocationContext,
): Promise<HttpResponseInit> {
  ctx.log('Manual news refresh (HTTP) starting…');
  try {
    const count = await runNewsRefresh(ctx);
    return {
      status: 200,
      jsonBody: { ok: true, items: count },
      headers: { 'Cache-Control': 'no-store' },
    };
  } catch (err) {
    ctx.error('Manual news refresh failed:', err);
    const message = err instanceof Error ? err.message : 'Refresh failed.';
    return {
      status: 500,
      jsonBody: { ok: false, error: message },
      headers: { 'Cache-Control': 'no-store' },
    };
  }
}

app.timer('newsRefresh', {
  schedule: '0 0 6 * * *',
  handler: newsRefreshTimer,
});

app.http('newsRefreshManual', {
  methods: ['POST'],
  authLevel: 'admin',
  route: 'news/refresh',
  handler: newsRefreshHttp,
});
