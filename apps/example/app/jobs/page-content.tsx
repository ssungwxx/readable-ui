// ADR 0020 §6 fixture: background jobs page — 5-stage palette + EmptyState fallback trigger.
// When the "error" filter is applied, rows is empty → auto Alert(kind=note, "No results").
import {
  Page,
  Heading,
  Paragraph,
  Link,
  Table,
  Alert,
  CodeSpan,
} from "@readable-ui/react/components";
import type { Envelope } from "@readable-ui/react";
import { withActive } from "../_shared/admin-nav";

interface Job extends Record<string, unknown> {
  id: string;
  name: string;
  status: "active" | "pending" | "archived" | "disabled" | "error";
  startedAt: string;
}

// Fixture: only non-error jobs are currently in-flight.
// When filter-status=error the result is empty — triggers EmptyState fallback.
const allJobs: Job[] = [
  { id: "job_001", name: "nightly-backup", status: "active", startedAt: "2026-04-18 02:00" },
  { id: "job_002", name: "report-export", status: "pending", startedAt: "2026-04-18 03:00" },
  { id: "job_003", name: "data-migration", status: "archived", startedAt: "2026-04-01 00:00" },
  { id: "job_004", name: "key-rotation", status: "disabled", startedAt: "2026-04-10 12:00" },
];

// Simulate "filter-status=error" returns no results — exercises ADR 0020 §4 EmptyState fallback.
const FILTER_STATUS = "error";
const filteredJobs: Job[] = allJobs.filter((j) => j.status === FILTER_STATUS);
// filteredJobs is [] — empty rows triggers the auto Alert

export const jobsEnvelope: Envelope = {
  title: "Background jobs",
  purpose: "Monitor background job queue — 5-stage status palette + empty-state demo.",
  role: "admin",
  layout: "sidebar",
  nav: { items: withActive("/users") },
  paths: {
    view: "/jobs",
    markdown: "/jobs.md",
  },
  updatedAt: "2026-04-18T00:00:00Z",
  tools: [
    {
      name: "listJobs",
      title: "List jobs",
      description: "List background jobs. Accepts `_filter_status` with the 5-stage palette.",
      role: "admin",
      input: {
        type: "object",
        properties: {
          _page: { type: "integer", minimum: 1, default: 1 },
          _size: { type: "integer", minimum: 1, default: 20 },
          // ADR 0019 §3 / ADR 0020 §3: 5-stage enum drives CodeSpan auto-wrap
          _filter_status: {
            type: "string",
            enum: ["active", "pending", "archived", "disabled", "error"],
          },
        },
      },
    },
  ],
};

export function JobsPage() {
  return (
    <Page layout="sidebar" nav={withActive("/users")}>
      <Heading level={1}>Background jobs</Heading>
      <Paragraph>
        Job queue status — filtered to <CodeSpan>error</CodeSpan> jobs to demonstrate the{" "}
        <Link href="/jobs.md">EmptyState fallback</Link> in the Markdown view.
      </Paragraph>

      <Alert kind="note">
        {`Currently showing jobs filtered to status="${FILTER_STATUS}". No error jobs are present.`}
      </Alert>

      {/* rows=[] + empty not "silent" → auto Alert(kind=note) appended in toMarkdown */}
      <Table<Job>
        tool="listJobs"
        filter={{ status: FILTER_STATUS }}
        total={0}
        columns={[
          { key: "name", label: "Name" },
          { key: "status", label: "Status" },
          { key: "startedAt", label: "Started" },
        ]}
        rows={filteredJobs}
      />

      {/* Also show all jobs with 5-stage palette for ADR 0020 §6 completeness */}
      <Heading level={2}>All jobs (palette preview)</Heading>
      <Table<Job>
        tool="listJobs"
        total={allJobs.length}
        columns={[
          { key: "name", label: "Name" },
          { key: "status", label: "Status" },
          { key: "startedAt", label: "Started" },
        ]}
        rows={allJobs}
      />
    </Page>
  );
}
