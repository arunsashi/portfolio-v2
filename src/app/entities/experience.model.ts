/** Per-project detail breakdown shown when a project is expanded. */
export interface ProjectDetail {
  /** What the product does for the business. */
  business: string;
  /** What was done technically. */
  technical: string;
  /** Tools / frameworks used. */
  tools: string[];
}

/** A single project delivered for a client. */
export interface ClientProject {
  name: string;
  /** ISO start date. */
  from: string;
  /** ISO end date, or null/omitted for ongoing ("Present"). */
  to?: string | null;
  detail?: ProjectDetail;
}

/** A client of the employer, grouping the projects done for them. */
export interface Client {
  company: string;
  /** Accent token key for the client card highlight. */
  accent?: string;
  projects: ClientProject[];
}

/** A "Work Archive" employer entry, shown as a node on a vertical timeline. */
export interface Experience {
  id: string;
  type: string;
  /** Sort order (ascending). */
  order?: number;
  /** Employer name. */
  name: string;
  /** Role title, e.g. "Senior Software Engineer / Front End Architect". */
  position: string;
  /** ISO start date — period is computed from this. */
  from: string;
  /** ISO end date, or null/omitted for ongoing ("Present"). */
  to?: string | null;
  companyId?: number;
  /** Clients served while at this employer (each holds its own projects). */
  clients?: Client[];
}
