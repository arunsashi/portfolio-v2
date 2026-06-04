/** localStorage keys used by the app. */
export const STORAGE_KEYS = {
  /** Stable anonymous visitor id (Statsig user). */
  VISITOR_ID: 'sg_visitor_id',
  /** The visitor's news votes: { [itemId]: 'up' | 'down' }. */
  NEWS_VOTES: 'news_votes_v1',
} as const;
