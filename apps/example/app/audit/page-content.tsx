import {
  Page,
  Heading,
  Paragraph,
  Link,
  Card,
  Alert,
  Table,
  List,
  ListItem,
} from "@readable-ui/react/components";
import type { Envelope } from "@readable-ui/react";
import { withActive } from "../_shared/admin-nav";

interface AuditRow extends Record<string, unknown> {
  id: string;
  when: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
}

const events: AuditRow[] = [
  {
    id: "evt_9f2a",
    when: "2026-04-18 05:42",
    actor: "alice@example.com",
    action: "updateUser",
    target: "u_bob_01",
    ip: "10.0.14.22",
  },
  {
    id: "evt_9e71",
    when: "2026-04-18 05:18",
    actor: "alice@example.com",
    action: "deleteUser",
    target: "u_legacy_07",
    ip: "10.0.14.22",
  },
  {
    id: "evt_9d03",
    when: "2026-04-18 02:01",
    actor: "system",
    action: "rotateKey",
    target: "api-key-eu",
    ip: "—",
  },
  {
    id: "evt_9c88",
    when: "2026-04-17 23:47",
    actor: "carol@example.com",
    action: "exportReport",
    target: "reports/weekly",
    ip: "203.0.113.14",
  },
  {
    id: "evt_9c11",
    when: "2026-04-17 18:04",
    actor: "alice@example.com",
    action: "createUser",
    target: "u_dave_02",
    ip: "10.0.14.22",
  },
];

const PAGE_SIZE = 25;
const TOTAL_ROWS = 312;
const CURRENT_PAGE = 1;
const TOTAL_PAGES = Math.ceil(TOTAL_ROWS / PAGE_SIZE);
const CURRENT_SORT = "when:desc";
const ACTIVE_FILTER = { actor: "alice@example.com" } as const;

export const auditEnvelope: Envelope = {
  title: "Audit log",
  purpose:
    "Immutable log of every privileged action — who did what, when, on which resource, from which IP.",
  role: "admin",
  layout: "sidebar",
  nav: { items: withActive("/audit") },
  paths: {
    view: "/audit",
    markdown: "/audit.md",
  },
  updatedAt: "2026-04-18T05:42:00Z",
  constraints: [
    {
      id: "retention",
      severity: "info",
      text: "Audit entries are retained for 400 days, then cold-stored to S3 Glacier.",
    },
    {
      id: "immutable",
      severity: "warn",
      text: "Entries are append-only. There is no supported way to edit or redact a prior event.",
    },
  ],
  tools: [
    {
      name: "listAuditEvents",
      title: "List audit events",
      description:
        "List audit events with pagination / sort / filter. Accepts `_page`, `_size`, `_sort=<key>:<dir>`, `_filter_actor=<email>`, `_filter_action=<name>`.",
      role: "admin",
      input: {
        type: "object",
        properties: {
          _page: { type: "integer", minimum: 1, default: 1 },
          _size: { type: "integer", minimum: 1, default: 25 },
          _sort: {
            type: "string",
            pattern: "^[A-Za-z0-9._-]+:(asc|desc|ASC|DESC)$",
            default: "when:desc",
          },
          _filter_actor: { type: "string" },
          _filter_action: { type: "string" },
        },
      },
    },
    {
      name: "viewAuditEvent",
      title: "View audit event",
      description: "Open a single audit event by id.",
      role: "admin",
      input: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  ],
};

export function AuditPage() {
  return (
    <Page layout="sidebar" nav={withActive("/audit")}>
      <Heading level={1}>Audit log</Heading>
      <Paragraph>
        Immutable trail of privileged actions. The{" "}
        <Link href="/audit.md">Markdown view</Link> shows the same feed without styling — ideal
        for agents that want to scan the data.
      </Paragraph>

      <Alert kind="important">
        Audit entries cannot be edited once written. Retention is 400 days.
      </Alert>

      <Card title="Scope">
        <List>
          <ListItem>All mutations from the admin console.</ListItem>
          <ListItem>System-triggered rotations and backups.</ListItem>
          <ListItem>Report exports and data downloads.</ListItem>
        </List>
      </Card>

      <Table<AuditRow>
        caption="Recent events"
        tool="listAuditEvents"
        page={CURRENT_PAGE}
        of={TOTAL_PAGES}
        size={PAGE_SIZE}
        total={TOTAL_ROWS}
        sort={CURRENT_SORT}
        filter={ACTIVE_FILTER}
        mode="summary"
        columns={[
          { key: "when", label: "When" },
          { key: "actor", label: "Actor" },
          { key: "action", label: "Action" },
          { key: "target", label: "Target" },
          { key: "ip", label: "IP" },
        ]}
        rows={events}
        actions={[
          {
            tool: "viewAuditEvent",
            label: "Open",
            params: (r) => ({ id: r.id }),
          },
        ]}
      />
    </Page>
  );
}
