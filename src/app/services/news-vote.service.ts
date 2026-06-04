import { inject, Injectable, signal } from '@angular/core';
import { STORAGE_KEYS } from '@core/const/storage.const';
import type { NewsVoteDirection } from '@core/entities';

import { AnalyticsService } from './analytics.service';
import { DataService } from './data.service';

/**
 * Thumbs up/down state for news items.
 *
 * - One vote per item per visitor, enforced client-side (localStorage) — a
 *   pragmatic dedupe for a portfolio, not a ballot box.
 * - Counts are updated optimistically via session-only deltas; the server
 *   counters (Cosmos) are the durable source and arrive with the next fetch.
 * - The API call is fire-and-forget: a lost vote costs nothing user-visible.
 */
@Injectable({ providedIn: 'root' })
export class NewsVoteService {
  private readonly data = inject(DataService);
  private readonly analytics = inject(AnalyticsService);

  private readonly votes = signal<Partial<Record<string, NewsVoteDirection>>>(this.load());
  private readonly deltas = signal<Partial<Record<string, { up: number; down: number }>>>({});

  /** The visitor's current vote on an item, if any. */
  myVote(itemId: string): NewsVoteDirection | null {
    return this.votes()[itemId] ?? null;
  }

  /** Session-only optimistic adjustment for a counter. */
  delta(itemId: string, dir: NewsVoteDirection): number {
    return this.deltas()[itemId]?.[dir] ?? 0;
  }

  /** Cast, switch or retract (same direction twice) a vote. */
  toggle(itemId: string, dir: NewsVoteDirection): void {
    const previous = this.myVote(itemId);
    const vote: NewsVoteDirection | null = previous === dir ? null : dir;
    this.apply(itemId, vote, previous, vote ?? 'retract');
  }

  /** Implicit thumbs-up when the visitor opens an item's source link.
   *  Never overrides an existing explicit vote (up OR down). */
  autoUpvote(itemId: string): void {
    if (this.myVote(itemId) !== null) return;
    this.apply(itemId, 'up', null, 'auto-up');
  }

  private apply(
    itemId: string,
    vote: NewsVoteDirection | null,
    previous: NewsVoteDirection | null,
    analyticsAction: string,
  ): void {
    this.votes.update((all) => {
      if (vote === null) {
        const { [itemId]: _removed, ...rest } = all;
        return rest;
      }
      return { ...all, [itemId]: vote };
    });
    this.persist();

    this.deltas.update((all) => {
      const current = all[itemId] ?? { up: 0, down: 0 };
      const next = { ...current };
      if (previous) next[previous] -= 1;
      if (vote) next[vote] += 1;
      return { ...all, [itemId]: next };
    });

    this.data.voteNews({ itemId, vote, previous }).subscribe();
    this.analytics.newsVote(itemId, analyticsAction);
  }

  private load(): Record<string, NewsVoteDirection> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.NEWS_VOTES);
      return raw ? (JSON.parse(raw) as Record<string, NewsVoteDirection>) : {};
    } catch {
      return {};
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NEWS_VOTES, JSON.stringify(this.votes()));
    } catch {
      /* storage unavailable — votes just won't persist across visits */
    }
  }
}
