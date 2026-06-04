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
  /** ISO date of the report run that generated/last refreshed this item
   *  (archive sort key). Absent on items read from the 'latest' report. */
  reportDate?: string;
  tags: string[];
  accent: string;
  tickerLabel: string;
}

export interface NewsReport {
  generatedAt: string;
  items: NewsItem[];
}
