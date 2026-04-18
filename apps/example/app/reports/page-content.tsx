import {
  Page,
  Heading,
  Paragraph,
  Link,
  Card,
  Alert,
  Button,
  Table,
  List,
  ListItem,
} from "@readable-ui/react/components";
import type { Envelope } from "@readable-ui/react";
import { withActive } from "../_shared/admin-nav";

interface WeeklyMetric extends Record<string, unknown> {
  id: string;
  week: string;
  signups: number;
  active: number;
  revenue: string;
}

interface TopPlan extends Record<string, unknown> {
  id: string;
  plan: string;
  customers: number;
  mrr: string;
  growth: string;
}

const weekly: WeeklyMetric[] = [
  { id: "w2026-16", week: "2026-W16", signups: 142, active: 894, revenue: "$28,430" },
  { id: "w2026-15", week: "2026-W15", signups: 128, active: 871, revenue: "$26,110" },
  { id: "w2026-14", week: "2026-W14", signups: 119, active: 842, revenue: "$24,980" },
  { id: "w2026-13", week: "2026-W13", signups: 106, active: 817, revenue: "$23,410" },
];

const topPlans: TopPlan[] = [
  { id: "plan_team", plan: "Team", customers: 214, mrr: "$12,840", growth: "+8.1%" },
  { id: "plan_pro", plan: "Pro", customers: 486, mrr: "$9,720", growth: "+3.4%" },
  { id: "plan_starter", plan: "Starter", customers: 1102, mrr: "$5,510", growth: "+1.2%" },
];

export const reportsEnvelope: Envelope = {
  title: "Reports",
  purpose:
    "Business reporting — weekly KPI snapshot, plan-level revenue split, and exportable drill-downs.",
  role: "admin",
  layout: "topbar",
  nav: { items: withActive("/reports") },
  paths: {
    view: "/reports",
    markdown: "/reports.md",
  },
  updatedAt: "2026-04-18T06:00:00Z",
  constraints: [
    {
      id: "cohort-utc",
      severity: "info",
      text: "All cohorts are grouped in UTC. Local-time slicing is not yet supported.",
    },
    {
      id: "revenue-accrual",
      severity: "warn",
      text: "Revenue is accrual-based. It may differ from billed totals by up to 48 hours.",
    },
  ],
  tools: [
    {
      name: "exportReport",
      title: "Export report",
      description: "Export the current report to CSV.",
      role: "admin",
      input: {
        type: "object",
        properties: {
          scope: { type: "string", enum: ["weekly", "plans"] },
        },
        required: ["scope"],
      },
    },
    {
      name: "viewPlan",
      title: "View plan detail",
      description: "Open a subscription plan detail view.",
      role: "admin",
      input: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    {
      name: "openWeek",
      title: "Open weekly cohort",
      description: "Open a weekly cohort drill-down view.",
      role: "admin",
      input: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  ],
};

export function ReportsPage() {
  return (
    <Page layout="topbar" nav={withActive("/reports")}>
      <Heading level={1}>Reports</Heading>
      <Paragraph>
        Weekly business snapshot for the Acme admin workspace. Compare with the{" "}
        <Link href="/reports.md">Markdown view</Link> to see the same data AI-ready.
      </Paragraph>

      <Alert kind="tip">
        Week 16 is still in progress — numbers update every hour at :05.
      </Alert>

      <Card title="This week at a glance">
        <Heading level={2}>$28,430</Heading>
        <Paragraph>
          Revenue to date, +8.9% WoW. Driven mostly by <Link href="/reports#team">Team</Link>{" "}
          plan upgrades.
        </Paragraph>
      </Card>

      <Card title="Signups · 7d">
        <Heading level={2}>142</Heading>
        <Paragraph>New accounts created in the last seven days.</Paragraph>
      </Card>

      <Card title="Active accounts">
        <Heading level={2}>894</Heading>
        <Paragraph>At least one authenticated session in the last 48 hours.</Paragraph>
      </Card>

      <Card title="Retention notes">
        <List>
          <ListItem>Week-1 retention is steady at 64% across plans.</ListItem>
          <ListItem>Team plan expansion driven by seat top-ups, not new logos.</ListItem>
          <ListItem>Churn concentrated in Starter plan — investigate onboarding funnel.</ListItem>
        </List>
      </Card>

      <Table<WeeklyMetric>
        caption="Weekly KPI snapshot"
        columns={[
          { key: "week", label: "Week" },
          { key: "signups", label: "Signups", align: "right" },
          { key: "active", label: "Active", align: "right" },
          { key: "revenue", label: "Revenue", align: "right" },
        ]}
        rows={weekly}
        actions={[
          {
            tool: "openWeek",
            label: "Open",
            params: (r) => ({ id: r.id }),
          },
        ]}
      />

      <Table<TopPlan>
        caption="Revenue by plan"
        columns={[
          { key: "plan", label: "Plan" },
          { key: "customers", label: "Customers", align: "right" },
          { key: "mrr", label: "MRR", align: "right" },
          { key: "growth", label: "Growth", align: "right" },
        ]}
        rows={topPlans}
        actions={[
          {
            tool: "viewPlan",
            label: "Details",
            params: (r) => ({ id: r.id }),
          },
        ]}
      />

      <Card title="Export">
        <Paragraph>
          Snapshot the current view for sharing. Exports are delivered as CSV via email.
        </Paragraph>
        <Button action="exportReport">Export weekly CSV</Button>
      </Card>
    </Page>
  );
}
