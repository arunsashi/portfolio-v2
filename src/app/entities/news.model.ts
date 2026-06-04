export type NewsCategory = 'ui-ux' | 'api' | 'ai' | 'security' | 'investing';

export interface NewsItem {
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

export interface NewsReport {
  generatedAt: string;
  items: NewsItem[];
}
