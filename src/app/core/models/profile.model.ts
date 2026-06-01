export interface SocialLink {
  label: string;
  url: string;
  /** Icon key the UI maps to an inline svg (github | linkedin | medium | projects). */
  icon?: string;
  /** Accent token key for the Linkly button background. */
  accent?: string;
}

export interface Profile {
  id: string;
  name: string;
  /** Hero heading, e.g. "Hey, I'm Arun Sudi. Software Engineer." */
  headline: string;
  /** Role line under the heading. */
  role: string;
  /** Small fun line in the hero, e.g. "When I'm not coding, I'm traveling the world!" */
  funFact: string;
  availableForWork: boolean;
  /** Path to the hero portrait (drop a file in public/, e.g. /profile.jpg). */
  photoUrl?: string | null;

  /** Scrolling "InterestsTicker" items. */
  interests: string[];

  email: string;
  resumeUrl?: string | null;
  socials: SocialLink[];
}
