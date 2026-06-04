import { app, InvocationContext, Timer } from '@azure/functions';
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

async function newsRefresh(_timer: Timer, ctx: InvocationContext): Promise<void> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    ctx.error('ANTHROPIC_API_KEY is not configured — skipping news refresh.');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  ctx.log(`Daily news refresh starting for ${today}…`);

  const client = new Anthropic({ apiKey });

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
        content: `Generate today's daily news briefing. Today is ${today}. Draw on the most recent developments you know about, referencing anchor sources where you have specific article knowledge.`,
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
}

app.timer('newsRefresh', {
  schedule: '0 0 6 * * *',
  handler: newsRefresh,
});
