export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  details: string;
  /** Honeypot field — must stay empty for genuine submissions. */
  website?: string;
}
