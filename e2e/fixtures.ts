import { test as base, type Page } from '@playwright/test';
import type {
  BlogPost,
  Experience,
  NewsItem,
  NewsReport,
  Profile,
  Project,
  SkillCategory,
  Testimonial,
} from '../src/app/entities';

/**
 * Deterministic e2e fixtures.
 *
 * The app gates its first paint on the initial content batch and falls to a
 * global error page if every request fails (or hangs past its deadline — a real
 * risk on the CI dev server). We intercept the content source — `/data/*.json`
 * under `ng serve`/e2e, or `/api/*` in production — and serve fixed responses so
 * the app always boots and specs assert against known data.
 */

const profile: Profile = {
  id: 'profile',
  name: 'Arun Sudi',
  headline: "Hey, I'm Arun Sudi. Software Engineer.",
  role: 'Senior Software Engineer',
  funFact: "When I'm not coding, I'm traveling the world!",
  availableForWork: true,
  photoUrl: null,
  interests: ['Angular', 'Azure', 'Coffee'],
  email: 'hello@arunsudi.dev',
  resumeUrl: null,
  socials: [{ label: 'GitHub', url: 'https://github.com/arunsashi', icon: 'github', accent: 'lavender' }],
};

const skills: SkillCategory[] = [
  {
    id: 'frontend',
    category: 'Frontend',
    description: 'UI engineering',
    content: { title: 'Frontend', subtitle: 'Frameworks & Libraries' },
    languages: ['TypeScript'],
    order: 1,
    accent: 'teal',
    skills: [{ id: 1, name: 'Angular', category: 'Frontend', display: true, order: 1 }],
  },
];

/** A learning project WITH `details` — drives the internal /projects/:slug card link. */
export const detailedProject: Project = {
  id: 'anibox',
  type: 'learning',
  slug: 'anibox',
  name: 'Anibox',
  order: 1,
  description: 'A cozy anime tracker.',
  tech: ['Angular', 'Azure'],
  accent: 'purple',
  url: 'https://example.com/anibox',
  inDevelopment: true,
  details: {
    summary: 'Anibox is a personal anime watchlist with a neo-brutalist UI.',
    responsibilities: ['Designed the watchlist UX', 'Built the Azure Functions API'],
    techStack: ['Angular', 'Azure Functions', 'Cosmos DB'],
    images: [],
    links: [{ label: 'Live', url: 'https://example.com/anibox' }],
  },
};

const projects: Project[] = [detailedProject];

const experience: Experience[] = [
  {
    id: 'exp-1',
    type: 'fulltime',
    order: 1,
    name: 'Acme Corp',
    position: 'Senior Software Engineer',
    from: '2021-01-01',
    to: null,
  },
];

const testimonials: Testimonial[] = [
  {
    id: 't-1',
    quote: 'A pleasure to work with.',
    author: 'Jane Doe',
    role: 'Engineering Manager',
    company: 'Acme Corp',
    initials: 'JD',
    accent: 'teal',
  },
];

const newsItems: NewsItem[] = [
  {
    id: 'n-1',
    category: 'ai',
    categoryLabel: 'AI',
    title: 'A calm week in AI',
    summary: 'Nothing exploded.',
    date: '2026-06-18',
    tags: ['ai'],
    accent: 'mint',
    tickerLabel: 'AI',
  },
];

const news: NewsReport = { generatedAt: '2026-06-18T00:00:00.000Z', items: newsItems };
const blog: BlogPost[] = [];

/** GET responses keyed by the path after `/api/` (the `.json` suffix is stripped). */
const RESPONSES: Record<string, unknown> = {
  profile,
  skills,
  projects,
  experience,
  testimonials,
  news,
  'news/archive': newsItems,
  blog,
};

async function mockData(page: Page): Promise<void> {
  // The app reads its content from either the static placeholder source
  // (`/data/<name>.json`, used by `ng serve` / e2e) or the live API
  // (`/api/<name>`, used in production). Intercept both by regex — Playwright's
  // `**` glob doesn't reliably match an interior path segment.
  await page.route(/\/(data|api)\//, async (route) => {
    const request = route.request();
    if (request.method() !== 'GET') {
      await route.fulfill({ status: 200, json: {} });
      return;
    }
    const resource = new URL(request.url())
      .pathname.replace(/^.*\/(data|api)\//, '')
      .replace(/\.json$/, '');
    const body = RESPONSES[resource];
    if (body === undefined) {
      await route.fulfill({ status: 404, json: { error: 'not found' } });
      return;
    }
    await route.fulfill({ json: body });
  });
}

/** `test` with the content source (placeholder + API) mocked before navigation. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await mockData(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
