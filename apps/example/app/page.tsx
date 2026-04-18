import Link from "next/link";

interface SampleRoute {
  href: string;
  mdHref: string;
  title: string;
  layout: string;
  blurb: string;
}

const routes: SampleRoute[] = [
  {
    href: "/dashboard",
    mdHref: "/dashboard.md",
    title: "Dashboard",
    layout: "topbar",
    blurb: "Workspace overview — counts, recent activity, a single refresh action.",
  },
  {
    href: "/users",
    mdHref: "/users.md",
    title: "Users",
    layout: "sidebar",
    blurb: "Form-heavy CRUD — paginated table + create form, typed tool params.",
  },
  {
    href: "/reports",
    mdHref: "/reports.md",
    title: "Reports",
    layout: "topbar",
    blurb: "Mixed composition — stat cards, weekly table, revenue by plan, export.",
  },
  {
    href: "/audit",
    mdHref: "/audit.md",
    title: "Audit log",
    layout: "sidebar",
    blurb: "Immutable feed — filter + sort + paginated summary, view-only rows.",
  },
  {
    href: "/jobs",
    mdHref: "/jobs.md",
    title: "Background jobs",
    layout: "sidebar",
    blurb: "Background jobs — empty state and 5-stage status palette fixture.",
  },
  {
    href: "/users/u_alice_01",
    mdHref: "/users/u_alice_01.md",
    title: "User detail (Alice)",
    layout: "detail",
    blurb: "Single-resource view — back nav, profile + meta rail, footer destructive action.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 text-white shadow-md ring-1 ring-black/5"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h10" />
              <path d="M4 12h16" />
              <path d="M4 18h7" />
            </svg>
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              readable-ui example
            </h1>
            <p className="text-sm text-slate-500">
              Same React tree · two renderings.
            </p>
          </div>
        </div>

        <p className="mt-6 text-slate-700 leading-7">
          Each sample page is rendered twice from one component tree: a{" "}
          <span className="font-medium text-slate-900">richly-designed HTML view</span> for
          humans, and a{" "}
          <span className="font-medium text-slate-900">clean Markdown view</span> for
          agents. Open both side-by-side to see what AI sees vs. what a human sees.
        </p>

        <div className="mt-10 grid gap-4">
          {routes.map((r) => (
            <div
              key={r.href}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_0_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.12)] transition-shadow hover:shadow-[0_1px_2px_0_rgba(15,23,42,0.05),0_16px_40px_-20px_rgba(15,23,42,0.18)]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent"
              />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{r.title}</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      {r.layout}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{r.blurb}</p>
                </div>
                <span
                  aria-hidden="true"
                  className="mt-1 h-1.5 w-1.5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500"
                />
              </div>
              <div className="mt-4 flex gap-3 text-sm">
                <Link
                  href={r.href}
                  className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 px-3 py-1.5 font-medium text-white shadow-sm ring-1 ring-inset ring-blue-700/10 hover:from-blue-500 hover:to-blue-700"
                >
                  View HTML
                </Link>
                <Link
                  href={r.mdHref}
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 font-medium text-slate-800 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                >
                  View Markdown
                  <code className="ml-1 rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-500">
                    .md
                  </code>
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs text-slate-400">
          Append{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-600">
            .md
          </code>{" "}
          to any route — same tree, different representation.
        </p>
      </div>
    </main>
  );
}
