export type ProjectType = 'professional' | 'learning';

export interface ProjectCompany {
  id: number;
  name: string;
  url: string | null;
  logo: string | null;
}

export interface ProjectLink {
  label: string;
  url: string;
}

export interface ProjectDetails {
  summary: string;
  responsibilities: string[];
  techStack: string[];
  images: string[];
  links: ProjectLink[];
}

/** A "Side Quests" project (professional + learning share this shape via `type`). */
export interface Project {
  id: string;
  type: ProjectType;
  slug: string;
  name: string;
  order?: number;
  /** Short card description. */
  description?: string;
  /** Tech tags shown on the card. */
  tech?: string[];
  /** Accent token key for the card highlight. */
  accent?: string;
  /** External link (repo / live). */
  url?: string;

  // professional
  company?: ProjectCompany;
  from?: string;
  to?: string;
  isNew?: boolean;
  details?: ProjectDetails;

  // learning
  inDevelopment?: boolean;
  completed?: boolean;
  year?: number;
  devices?: string[];
  skills?: string[];
}
