/** A "What People Say" testimonial card. */
export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  /** Initials shown in the avatar bubble. */
  initials: string;
  /** Accent token key for the avatar background. */
  accent?: string;
}
