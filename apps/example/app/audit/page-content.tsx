import {
  Page,
  Heading,
  Paragraph,
  Card,
  Alert,
  List,
  ListItem,
} from "@readable-ui/react/components";
import { definePage } from "@readable-ui/react";
import { adminNav } from "../_shared/admin-nav";

interface AuditRow extends Record<string, unknown> {
  id: string;
  when: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
}

// ADR 0022 fixture: data-heavy table demonstrating mode="payload" + readable-ui:data JSONL.
// We deterministically synthesize 240 rows so the page exceeds the 200-row threshold
// flagged in ADR 0015 §6 / Open Decision #9.
const ACTORS = [
  "alice@example.com",
  "bob@example.com",
  "carol@example.com",
  "system",
];
const ACTIONS = [
  "updateUser",
  "deleteUser",
  "createUser",
  "rotateKey",
  "exportReport",
];
const IPS = ["10.0.14.22", "203.0.113.14", "198.51.100.7", "—"];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function makeAuditEvents(count: number): AuditRow[] {
  const events: AuditRow[] = [];
  // Walk backwards from 2026-04-18 05:42 in 12-minute steps, deterministic.
  const baseEpoch = Date.UTC(2026, 3, 18, 5, 42, 0);
  for (let i = 0; i < count; i++) {
    const t = new Date(baseEpoch - i * 12 * 60 * 1000);
    const yyyy = t.getUTCFullYear();
    const mm = pad2(t.getUTCMonth() + 1);
    const dd = pad2(t.getUTCDate());
    const hh = pad2(t.getUTCHours());
    const mi = pad2(t.getUTCMinutes());
    const actor = ACTORS[i % ACTORS.length] ?? "system";
    const action = ACTIONS[(i * 3) % ACTIONS.length] ?? "updateUser";
    const ip = IPS[(i * 5) % IPS.length] ?? "10.0.14.22";
    const target =
      action === "rotateKey"
        ? `api-key-${["eu", "us", "ap"][i % 3]}`
        : action === "exportReport"
          ? `reports/${["weekly", "monthly", "ad-hoc"][i % 3]}`
          : `u_${["alice", "bob", "carol", "dave", "legacy"][i % 5]}_${pad2((i % 12) + 1)}`;
    events.push({
      id: `evt_${(0xa000 + i).toString(16)}`,
      when: `${yyyy}-${mm}-${dd} ${hh}:${mi}`,
      actor,
      action,
      target,
      ip,
    });
  }
  return events;
}

const events: AuditRow[] = makeAuditEvents(240);

const PAGE_SIZE = 240;
const TOTAL_ROWS = 312;
const CURRENT_PAGE = 1;
const TOTAL_PAGES = Math.ceil(TOTAL_ROWS / PAGE_SIZE);
const CURRENT_SORT = "when:desc";
const ACTIVE_FILTER = { actor: "alice@example.com" } as const;

export const auditPage = definePage({
  envelope: {
  title: "Audit log",
  purpose:
    "Immutable log of every privileged action — who did what, when, on which resource, from which IP.",
  role: "admin",
  layout: "sidebar",
  nav: { items: adminNav.active("/audit") },
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
  },
  render: (_, { Table, Link }) => (
    <Page>
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
        // ADR 0022 §4: opt in to payload mode — visible head 5 rows in the GFM
        // pipe table, full 240-row dataset emitted as a fenced ```readable-ui:data```
        // JSONL block inside the same `:::table{...}` directive container.
        mode="payload"
        payloadHead={5}
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
  ),
});
