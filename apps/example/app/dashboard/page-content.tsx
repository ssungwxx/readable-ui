import {
  Page,
  Heading,
  Paragraph,
  Card,
  Alert,
} from "@readable-ui/react/components";
import { definePage } from "@readable-ui/react";
import { adminNav } from "../_shared/admin-nav";

interface ActivityEvent extends Record<string, unknown> {
  id: string;
  when: string;
  actor: string;
  action: string;
  target: string;
}

const recentActivity: ActivityEvent[] = [
  {
    id: "evt_a01",
    when: "2026-04-17 09:14",
    actor: "alice@example.com",
    action: "updateUser",
    target: "u_bob_01",
  },
  {
    id: "evt_a02",
    when: "2026-04-17 09:02",
    actor: "alice@example.com",
    action: "createUser",
    target: "u_dave_02",
  },
  {
    id: "evt_a03",
    when: "2026-04-16 22:41",
    actor: "system",
    action: "rotateKey",
    target: "api-key-eu",
  },
  {
    id: "evt_a04",
    when: "2026-04-16 17:03",
    actor: "carol@example.com",
    action: "viewAudit",
    target: "2026-Q1",
  },
];

export const dashboardPage = definePage({
  envelope: {
    title: "Admin dashboard",
    purpose:
      "At-a-glance overview of the admin workspace — user counts, active sessions, recent activity.",
    role: "admin",
    layout: "topbar",
    nav: { items: adminNav.active("/dashboard") },
    paths: {
      view: "/dashboard",
      markdown: "/dashboard.md",
    },
    updatedAt: "2026-04-17T09:15:00Z",
    constraints: [
      {
        id: "counts-cached",
        severity: "info",
        text: "Counts are cached for 60 seconds. Use Refresh for the latest snapshot.",
      },
    ],
    tools: [
      {
        name: "refreshDashboard",
        title: "Refresh dashboard",
        description: "Invalidate cache and fetch the latest counts and activity.",
        role: "admin",
      },
      {
        name: "viewEvent",
        title: "View audit event",
        description: "Open an audit event by id.",
        role: "admin",
        input: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
      },
    ],
  },
  render: (_, { Button, Table, Link }) => (
    <Page>
      <Heading level={1}>Admin dashboard</Heading>
      <Paragraph>
        Workspace overview. Counts are cached for 60 seconds — see the{" "}
        <Link href="/dashboard.md">Markdown view</Link> for the AI-facing version.
      </Paragraph>

      <Alert kind="note">Showing data up to 2026-04-17 09:15 UTC.</Alert>

      <Card title="Total users">
        <Heading level={2}>1,284</Heading>
        <Paragraph>+12 this week.</Paragraph>
      </Card>

      <Card title="Active today">
        <Heading level={2}>318</Heading>
        <Paragraph>Unique sign-ins in the last 24 hours.</Paragraph>
      </Card>

      <Card title="Pending invites">
        <Heading level={2}>7</Heading>
        <Paragraph>Invites sent but not yet accepted.</Paragraph>
      </Card>

      <Card title="Recent activity">
        <Table<ActivityEvent>
          columns={[
            { key: "when", label: "When" },
            { key: "actor", label: "Actor" },
            { key: "action", label: "Action" },
            { key: "target", label: "Target" },
          ]}
          rows={recentActivity}
          actions={[
            {
              tool: "viewEvent",
              label: "Open",
              params: (r) => ({ id: r.id }),
            },
          ]}
        />
      </Card>

      <Button action="refreshDashboard">Refresh dashboard</Button>
    </Page>
  ),
});
