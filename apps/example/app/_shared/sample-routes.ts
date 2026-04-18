/**
 * Shared sample route catalogue.
 *
 * Consumed by:
 * - `app/page.tsx`           — Tailwind marketing landing (HTML only).
 * - `app/page-content.tsx`   — readable-ui envelope + Page tree for `/page.md`.
 *
 * Keeping this list in one module prevents drift between the HTML landing and
 * the Markdown envelope surface that the bench runner exercises.
 */
export interface SampleRoute {
  /** Slug / stable id used as the Markdown table row key. */
  id: string;
  href: string;
  mdHref: string;
  title: string;
  layout: string;
  blurb: string;
}

export const sampleRoutes: SampleRoute[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    mdHref: "/dashboard.md",
    title: "Dashboard",
    layout: "topbar",
    blurb:
      "Workspace overview — counts, recent activity, a single refresh action.",
  },
  {
    id: "users",
    href: "/users",
    mdHref: "/users.md",
    title: "Users",
    layout: "sidebar",
    blurb:
      "Form-heavy CRUD — paginated table + create form, typed tool params.",
  },
  {
    id: "reports",
    href: "/reports",
    mdHref: "/reports.md",
    title: "Reports",
    layout: "topbar",
    blurb:
      "Stat / Progress / Descriptions directives — KPI, quota bars, metadata, and exportable tables.",
  },
  {
    id: "audit",
    href: "/audit",
    mdHref: "/audit.md",
    title: "Audit log",
    layout: "sidebar",
    blurb:
      "Immutable feed — filter + sort + paginated summary, view-only rows.",
  },
  {
    id: "jobs",
    href: "/jobs",
    mdHref: "/jobs.md",
    title: "Background jobs",
    layout: "sidebar",
    blurb:
      "Background jobs — empty state and 5-stage status palette fixture.",
  },
  {
    id: "users/u_alice_01",
    href: "/users/u_alice_01",
    mdHref: "/users/u_alice_01.md",
    title: "User detail (Alice)",
    layout: "detail",
    blurb:
      "Single-resource view — breadcrumb, Descriptions profile/meta rail, destructive footer.",
  },
  {
    id: "components",
    href: "/components",
    mdHref: "/components.md",
    title: "Components (Tier 3 — Section, Steps, Split)",
    layout: "sidebar",
    blurb:
      "ADR 0025 — Section heading wrapper, Steps progress sequence, Split 2-column layout.",
  },
  {
    id: "settings",
    href: "/settings",
    mdHref: "/settings.md",
    title: "Settings (Tier 3 — Tabs, Accordion)",
    layout: "sidebar",
    blurb:
      "ADR 0025 — Tabs tab-switcher and Accordion collapsible panels with client-state.",
  },
];
