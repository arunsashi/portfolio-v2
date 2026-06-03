export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  details: string;
  /** Honeypot field — must stay empty for genuine submissions. */
  website?: string;
  /** Cloudflare Turnstile token (only sent when the widget is enabled). */
  turnstileToken?: string;
}
