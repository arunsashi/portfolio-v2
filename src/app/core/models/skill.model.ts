export interface Skill {
  id: number;
  name: string;
  category: string;
  display: boolean;
  order?: number;
}

/** A "Tech Arsenal" category card. */
export interface SkillCategory {
  id: string;
  category: string;
  description: string;
  content: {
    title: string;
    /** Sub-label shown under the card title, e.g. "Frontend Frameworks & Libraries". */
    subtitle: string;
  };
  languages: string[];
  order?: number;
  /** Accent token key for the card header (teal | yellow | pink | purple | blue | mint | gold | magenta). */
  accent?: string;
  skills: Skill[];
}
