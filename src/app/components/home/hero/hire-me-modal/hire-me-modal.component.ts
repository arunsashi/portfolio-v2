import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import type { ContactRequest } from '@core/entities';
import { AnalyticsService } from '@core/services/analytics.service';
import { DataService } from '@core/services/data.service';
import { environment } from '@env';
import { firstValueFrom } from 'rxjs';

interface TurnstileApi {
  render(
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback?: (token: string) => void;
      'error-callback'?: () => void;
      'expired-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
    },
  ): string;
  reset(id?: string): void;
  remove(id?: string): void;
}

function turnstileApi(): TurnstileApi | undefined {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile;
}

/**
 * "Hire Me!" modal — ports the Make design's HireMeModal.tsx to Angular.
 * A yellow neo-brutalist dialog with a contact form (Subject, Project Details,
 * Attachments) over a blurred backdrop. Submission is mocked (no network).
 *
 * Built as a native <dialog>-style overlay with a focus trap, Escape-to-close,
 * and backdrop-click-to-close for full keyboard accessibility (WCAG AA).
 */
@Component({
  selector: 'app-hire-me-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './hire-me-modal.component.scss',
  templateUrl: './hire-me-modal.component.html',
})
export class HireMeModalComponent {
  private readonly data = inject(DataService);
  private readonly analytics = inject(AnalyticsService);

  protected readonly isOpen = signal(false);
  protected readonly sent = signal(false);
  protected readonly fileCount = signal(0);
  protected readonly sending = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  private readonly modal = viewChild<ElementRef<HTMLDialogElement>>('modal');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');
  private lastFocused: HTMLElement | null = null;

  // Cloudflare Turnstile (anti-spam). Disabled when the site key is empty.
  protected readonly turnstileSiteKey = environment.turnstileSiteKey;
  private readonly turnstileEl = viewChild<ElementRef<HTMLElement>>('turnstileEl');
  private readonly turnstileToken = signal<string | null>(null);
  private turnstileWidgetId: string | null = null;
  private turnstileScript: Promise<void> | null = null;

  protected fileLabel(): string {
    const n = this.fileCount();
    return n > 0 ? `${n} file(s) selected` : 'Click to upload files or concepts';
  }

  protected open(): void {
    this.analytics.hireMeClick();
    this.lastFocused = document.activeElement as HTMLElement | null;
    this.sent.set(false);
    this.errorMsg.set(null);
    this.fileCount.set(0);
    this.isOpen.set(true);
    queueMicrotask(() => {
      const dialog = this.modal()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
      this.closeBtn()?.nativeElement.focus();
      void this.renderTurnstile();
    });
  }

  protected close(): void {
    const dialog = this.modal()?.nativeElement;
    if (dialog?.open) dialog.close();
    this.isOpen.set(false);
    this.removeTurnstile();
    this.lastFocused?.focus();
  }

  // --- Turnstile helpers -------------------------------------------------

  private loadTurnstileScript(): Promise<void> {
    if (this.turnstileScript) return this.turnstileScript;
    this.turnstileScript = new Promise<void>((resolve, reject) => {
      if (turnstileApi()) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      s.onload = () => { resolve(); };
      s.onerror = () => { reject(new Error('Turnstile failed to load')); };
      document.head.appendChild(s);
    });
    return this.turnstileScript;
  }

  private async renderTurnstile(): Promise<void> {
    if (!this.turnstileSiteKey) return;
    try {
      await this.loadTurnstileScript();
    } catch {
      return;
    }
    const api = turnstileApi();
    const el = this.turnstileEl()?.nativeElement;
    if (!api || !el) return;

    this.removeTurnstile();
    this.turnstileToken.set(null);
    this.turnstileWidgetId = api.render(el, {
      sitekey: this.turnstileSiteKey,
      callback: (token: string) => { this.turnstileToken.set(token); },
      'error-callback': () => { this.turnstileToken.set(null); },
      'expired-callback': () => { this.turnstileToken.set(null); },
    });
  }

  private resetTurnstile(): void {
    this.turnstileToken.set(null);
    const api = turnstileApi();
    if (api && this.turnstileWidgetId) {
      try {
        api.reset(this.turnstileWidgetId);
      } catch {
        /* widget may already be gone */
      }
    }
  }

  private removeTurnstile(): void {
    const api = turnstileApi();
    if (api && this.turnstileWidgetId) {
      try {
        api.remove(this.turnstileWidgetId);
      } catch {
        /* widget may already be gone */
      }
    }
    this.turnstileWidgetId = null;
  }

  protected onDialogClick(event: MouseEvent): void {
    const dialog = this.modal()?.nativeElement;
    if (dialog && event.target === dialog) this.close();
  }

  protected onDialogClosed(): void {
    this.isOpen.set(false);
    this.lastFocused?.focus();
  }

  protected onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fileCount.set(input.files?.length ?? 0);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const fd = new FormData(form);
    const field = (key: string): string => {
      const value = fd.get(key);
      return typeof value === 'string' ? value : '';
    };
    const payload: ContactRequest = {
      name: field('name'),
      email: field('email'),
      subject: field('subject'),
      details: field('details'),
      website: field('website'),
    };

    if (this.turnstileSiteKey) {
      const token = this.turnstileToken();
      if (!token) {
        this.errorMsg.set('Please complete the anti-spam check.');
        return;
      }
      payload.turnstileToken = token;
    }

    this.sending.set(true);
    this.errorMsg.set(null);

    try {
      await firstValueFrom(this.data.submitContact(payload));
      this.analytics.hireMeSubmit();
      this.sent.set(true);
      form.reset();
      this.fileCount.set(0);
      this.removeTurnstile();
      queueMicrotask(() => this.closeBtn()?.nativeElement.focus());
    } catch {
      this.errorMsg.set('Could not send your message right now. Please try again in a minute.');
      // Turnstile tokens are single-use — reset so the user can retry.
      this.resetTurnstile();
    } finally {
      this.sending.set(false);
    }
  }

  /** Minimal focus trap: keep Tab focus within the panel. */
  protected trapFocus(event: Event): void {
    if (!(event instanceof KeyboardEvent)) return;
    const root = this.panel()?.nativeElement;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
