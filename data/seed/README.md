# Seed scripts

Placeholder for the one-off Cosmos seed script (playbook §3).

When the real source JSON is available (`skills.json`, `recent-projects.json`,
`learning-projects.json`, `work-experience-details.json`), add a Node script here
that uses `@azure/cosmos` to transform them into the container shapes documented
in the playbook and upserts into `portfolio` → `profile` / `skills` / `projects`
/ `experience`.

Notes from the playbook to honor during seeding:

- Denormalize: embed `company` and rich `details` inside each project doc.
- Re-key duplicate skill ids (e.g. id 30 twice, id 42 twice; 15/16/21 reused).
- Add `slug` to each project and `order` fields where useful.

The placeholder JSON the front end currently reads lives in `../../public/data/`.
