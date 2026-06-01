import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

type BlogSource = 'medium' | 'devto';

type BlogPost = {
  source: BlogSource;
  title: string;
  url: string;
  publishedAt: string;
  excerpt: string;
  image: string | null;
  tags: string[];
  accent?: string;
  readingTime?: string;
};

const MAX_POSTS = 12;

export async function blog(_req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const mediumUser = (process.env['MEDIUM_USER'] ?? '').trim();
  const devtoUser = (process.env['DEVTO_USER'] ?? '').trim();

  const [medium, devto] = await Promise.all([
    mediumUser ? getMediumPosts(mediumUser, ctx) : Promise.resolve<BlogPost[]>([]),
    devtoUser ? getDevToPosts(devtoUser, ctx) : Promise.resolve<BlogPost[]>([]),
  ]);

  const posts = [...medium, ...devto]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, MAX_POSTS);

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=900',
    },
    jsonBody: posts,
  };
}

async function getDevToPosts(username: string, ctx: InvocationContext): Promise<BlogPost[]> {
  try {
    const res = await fetch(`https://dev.to/api/articles?username=${encodeURIComponent(username)}&per_page=20`);
    if (!res.ok) {
      ctx.warn(`dev.to fetch failed (${res.status}) for ${username}`);
      return [];
    }

    const json = (await res.json()) as Array<{
      title?: string;
      url?: string;
      published_at?: string;
      description?: string;
      cover_image?: string | null;
      tag_list?: string[];
      reading_time_minutes?: number;
    }>;

    return json
      .filter((x) => x.title && x.url && x.published_at)
      .map((x) => ({
        source: 'devto' as const,
        title: x.title as string,
        url: x.url as string,
        publishedAt: toIso(x.published_at as string),
        excerpt: limit(cleanText(x.description ?? ''), 220),
        image: x.cover_image ?? null,
        tags: (x.tag_list ?? []).slice(0, 5),
        accent: 'pink',
        readingTime: x.reading_time_minutes ? `${x.reading_time_minutes} min read` : undefined,
      }));
  } catch (error) {
    ctx.error('dev.to fetch exception', error);
    return [];
  }
}

async function getMediumPosts(username: string, ctx: InvocationContext): Promise<BlogPost[]> {
  try {
    const feedUrl = `https://medium.com/feed/@${username}`;
    const res = await fetch(feedUrl);
    if (!res.ok) {
      ctx.warn(`Medium RSS fetch failed (${res.status}) for ${username}`);
      return [];
    }

    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);

    return items.map((item) => {
      const title = decodeHtml(stripCdata(extractTag(item, 'title')));
      const url = decodeHtml(stripCdata(extractTag(item, 'link')));
      const publishedAt = toIso(extractTag(item, 'pubDate'));
      const contentEncoded = stripCdata(extractTag(item, 'content:encoded'));
      const description = decodeHtml(stripCdata(extractTag(item, 'description')));

      const image = extractFirstImage(contentEncoded);
      const excerpt = limit(cleanText(stripHtml(contentEncoded || description)), 220);
      const tags = [...item.matchAll(/<category>([\s\S]*?)<\/category>/g)]
        .map((m) => decodeHtml(stripCdata(m[1])).trim())
        .filter(Boolean)
        .slice(0, 5);

      return {
        source: 'medium' as const,
        title,
        url,
        publishedAt,
        excerpt,
        image,
        tags,
        accent: 'teal',
      };
    }).filter((p) => p.title && p.url && p.publishedAt);
  } catch (error) {
    ctx.error('Medium fetch exception', error);
    return [];
  }
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  return re.exec(xml)?.[1]?.trim() ?? '';
}

function stripCdata(v: string): string {
  return v.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function stripHtml(v: string): string {
  return v.replace(/<[^>]+>/g, ' ');
}

function cleanText(v: string): string {
  return v.replace(/\s+/g, ' ').trim();
}

function extractFirstImage(html: string): string | null {
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m?.[1] ?? null;
}

function decodeHtml(v: string): string {
  return v
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function limit(v: string, n: number): string {
  return v.length <= n ? v : `${v.slice(0, n - 1)}…`;
}

function toIso(v: string): string {
  const t = Date.parse(v);
  if (Number.isNaN(t)) return new Date().toISOString();
  return new Date(t).toISOString();
}

app.http('blog', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'blog',
  handler: blog,
});

