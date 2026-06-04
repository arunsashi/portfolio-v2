export type BlogSource = 'medium' | 'devto';

/** A "Publications" article card. */
export interface BlogPost {
  source: BlogSource;
  title: string;
  url: string;
  publishedAt: string;
  excerpt: string;
  image: string | null;
  tags: string[];
  /** Accent token key for the card tag/border highlight. */
  accent?: string;
  /** Optional read-time label, e.g. "5 min read". */
  readingTime?: string;
}
