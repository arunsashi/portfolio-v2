import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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
  styles: [
    `
      dialog.hire-me-dialog {
        position: fixed;
        inset: 0;
        margin: 0;
        border: 0;
        padding: 0;
        width: 100vw;
        height: 100dvh;
        max-width: none;
        max-height: none;
        background: transparent;
        overflow: hidden;
      }

      dialog.hire-me-dialog::backdrop {
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }
    `,
  ],
  template: `
    <!-- trigger -->
    <button
      type="button"
      (click)="open()"
      class="hover-lift flex items-center gap-2 whitespace-nowrap rounded-md border-4 border-line bg-accent-pink px-6 py-4 text-lg font-black uppercase text-ink shadow-[4px_4px_0_0_#000]"
    >
      Hire Me! <span class="animate-bounce-subtle inline-block" aria-hidden="true">🚀</span>
    </button>

    <dialog
      #modal
      class="hire-me-dialog z-50"
      aria-labelledby="hire-me-title"
      (click)="onDialogClick($event)"
      (close)="onDialogClosed()"
      (keydown.escape)="close()"
    >
      <!-- panel -->
      <div
        #panel
        class="absolute left-1/2 top-1/2 z-10 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border-4 border-line bg-accent-yellow p-6 shadow-[8px_8px_0_0_#000] md:p-8"
        (keydown.tab)="trapFocus($event)"
      >
          <button
            #closeBtn
            type="button"
            (click)="close()"
            aria-label="Close"
            class="hover-lift absolute right-4 top-4 border-2 border-line bg-surface p-2 shadow-[2px_2px_0_0_#000]"
          >
            <i class="fa-solid fa-xmark text-lg text-ink" aria-hidden="true"></i>
          </button>

          @if (!sent()) {
            <h2 id="hire-me-title" class="mb-2 text-3xl font-black uppercase text-ink">Let's Build It!</h2>
            <p class="mb-6 font-bold text-ink/80">Tell me about your project, timeline, and budget.</p>

            <form class="space-y-5" (submit)="submit($event)">
              <div>
                <label for="hm-name" class="mb-2 block text-sm font-black uppercase text-ink">Name</label>
                <input
                  id="hm-name"
                  name="name"
                  type="text"
                  required
                  autocomplete="name"
                  placeholder="Your full name"
                  class="w-full border-4 border-line bg-surface p-3 font-bold text-ink outline-none focus:ring-4 focus:ring-accent-pink"
                />
              </div>

              <div>
                <label for="hm-email" class="mb-2 block text-sm font-black uppercase text-ink">Email</label>
                <input
                  id="hm-email"
                  name="email"
                  type="email"
                  required
                  autocomplete="email"
                  placeholder="you@company.com"
                  class="w-full border-4 border-line bg-surface p-3 font-bold text-ink outline-none focus:ring-4 focus:ring-accent-pink"
                />
              </div>

              <div>
                <label for="hm-subject" class="mb-2 block text-sm font-black uppercase text-ink">Subject</label>
                <input
                  id="hm-subject"
                  name="subject"
                  type="text"
                  required
                  placeholder="E.g. E-commerce App Redesign"
                  class="w-full border-4 border-line bg-surface p-3 font-bold text-ink outline-none focus:ring-4 focus:ring-accent-pink"
                />
              </div>

              <div>
                <label for="hm-details" class="mb-2 block text-sm font-black uppercase text-ink">Project Details</label>
                <textarea
                  id="hm-details"
                  name="details"
                  rows="4"
                  required
                  placeholder="What are we building? What's the goal?"
                  class="w-full resize-none border-4 border-line bg-surface p-3 font-bold text-ink outline-none focus:ring-4 focus:ring-accent-pink"
                ></textarea>
              </div>

              <div>
                <span class="mb-2 block text-sm font-black uppercase text-ink">Attachments</span>
                <label
                  class="group flex cursor-pointer flex-col items-center justify-center border-4 border-dashed border-line bg-surface p-6 font-bold text-ink transition-colors hover:bg-accent-pink/20"
                >
                  <i class="fa-solid fa-paperclip mb-3 text-2xl text-muted group-hover:text-ink" aria-hidden="true"></i>
                  <span class="text-center">{{ fileLabel() }}</span>
                  <input type="file" multiple class="hidden" (change)="onFiles($event)" />
                </label>
              </div>

              <input
                name="website"
                tabindex="-1"
                autocomplete="off"
                aria-hidden="true"
                class="absolute -left-[9999px] h-0 w-0 opacity-0"
              />

              @if (errorMsg(); as msg) {
                <p class="rounded-md border-2 border-line bg-surface px-3 py-2 text-sm font-bold text-red-700">{{ msg }}</p>
              }

              <button
                type="submit"
                [disabled]="sending()"
                class="hover-lift mt-2 flex w-full items-center justify-center gap-2 border-4 border-line bg-accent-pink px-6 py-4 text-lg font-black uppercase text-ink shadow-[4px_4px_0_0_#000]"
              >
                <i class="fa-solid fa-paper-plane" aria-hidden="true"></i> {{ sending() ? 'Sending...' : 'Send Message' }}
              </button>
            </form>
          } @else {
            <!-- success state -->
            <div class="py-6 text-center">
              <i class="fa-solid fa-circle-check mb-4 text-5xl text-ink" aria-hidden="true"></i>
              <h2 id="hire-me-title" class="mb-2 text-3xl font-black uppercase text-ink">Thanks!</h2>
              <p class="font-bold text-ink/80">I'll get back to you soon. 🚀</p>
              <button
                type="button"
                (click)="close()"
                class="hover-lift mt-6 border-4 border-line bg-surface px-6 py-3 font-black uppercase text-ink shadow-[4px_4px_0_0_#000]"
              >
                Close
              </button>
            </div>
          }
      </div>
    </dialog>
  `,
})
export class HireMeModalComponent {
  private readonly http = inject(HttpClient);

  protected readonly isOpen = signal(false);
  protected readonly sent = signal(false);
  protected readonly fileCount = signal(0);
  protected readonly sending = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  private readonly modal = viewChild<ElementRef<HTMLDialogElement>>('modal');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');
  private lastFocused: HTMLElement | null = null;

  protected fileLabel(): string {
    const n = this.fileCount();
    return n > 0 ? `${n} file(s) selected` : 'Click to upload files or concepts';
  }

  protected open(): void {
    this.lastFocused = document.activeElement as HTMLElement | null;
    this.sent.set(false);
    this.errorMsg.set(null);
    this.fileCount.set(0);
    this.isOpen.set(true);
    queueMicrotask(() => {
      const dialog = this.modal()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
      this.closeBtn()?.nativeElement.focus();
    });
  }

  protected close(): void {
    const dialog = this.modal()?.nativeElement;
    if (dialog?.open) dialog.close();
    this.isOpen.set(false);
    this.lastFocused?.focus();
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
    const payload = {
      name: `${fd.get('name') ?? ''}`,
      email: `${fd.get('email') ?? ''}`,
      subject: `${fd.get('subject') ?? ''}`,
      details: `${fd.get('details') ?? ''}`,
      website: `${fd.get('website') ?? ''}`,
    };

    this.sending.set(true);
    this.errorMsg.set(null);

    try {
      await firstValueFrom(this.http.post('/api/contact', payload));
      this.sent.set(true);
      form.reset();
      this.fileCount.set(0);
      queueMicrotask(() => this.closeBtn()?.nativeElement.focus());
    } catch {
      this.errorMsg.set('Could not send your message right now. Please try again in a minute.');
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
