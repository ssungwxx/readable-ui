// ADR 0025: Tier 3 demo — Tabs, Accordion
// This page demonstrates the two "client state" Tier 3 components that require
// useState and must be rendered inside a "use client" boundary in RSC environments.
import {
  Page,
  Heading,
  Paragraph,
  Link,
  Card,
  Alert,
  Button,
  Input,
  Select,
  Checkbox,
  Tabs,
  Tab,
  Accordion,
  Panel,
  Section,
  Descriptions,
  CodeSpan,
} from "@readable-ui/react/components";
import { withActive } from "../_shared/admin-nav";

export function SettingsPage() {
  return (
    <Page layout="sidebar" nav={withActive("/settings")}>
      <Heading level={1}>Settings</Heading>
      <Paragraph>
        Tabs and Accordion from ADR 0025. Compare with the{" "}
        <Link href="/settings.md">Markdown view</Link> — all panels and tabs are fully
        serialized (ADR 0007 §4 flush rule).
      </Paragraph>

      {/* Tabs demo */}
      <Section title="Tabs component" level={2}>
        <Paragraph>
          The active tab is managed by <CodeSpan>useState</CodeSpan>. The first tab is
          active by default. All tab content is included in the Markdown output — AI
          agents can read every tab without clicking.
        </Paragraph>

        <Tabs>
          <Tab label="Profile">
            <Descriptions
              title="Profile"
              items={[
                { term: "Name", value: "Alice Example" },
                { term: "Email", value: "alice@example.com" },
                { term: "Role", value: <CodeSpan>admin</CodeSpan> },
                { term: "Department", value: null },
              ]}
            />
          </Tab>

          <Tab label="Notifications">
            <Card title="Notification preferences">
              <Checkbox name="emailDigest" label="Daily email digest" checked />
              <Checkbox name="slackAlerts" label="Slack alerts for critical events" />
              <Checkbox name="browserPush" label="Browser push notifications" />
            </Card>
            <Alert kind="note">
              Notification settings apply to this account only, not workspace-wide.
            </Alert>
          </Tab>

          <Tab label="Security">
            <Card title="Security settings">
              <Paragraph>
                Two-factor authentication is enabled. Last login: 2026-04-18 08:42 UTC.
              </Paragraph>
              <Descriptions
                items={[
                  { term: "2FA", value: <CodeSpan>enabled</CodeSpan> },
                  { term: "Session timeout", value: "30 minutes" },
                  { term: "API key", value: "sk-••••••••••••3f2a" },
                ]}
              />
            </Card>
          </Tab>
        </Tabs>
      </Section>

      {/* Accordion demo */}
      <Section title="Accordion component" level={2}>
        <Paragraph>
          The first panel is open by default. Click to toggle. In Markdown, all panels
          are serialized in the open state — the accordion fold is UI-only.
        </Paragraph>

        <Accordion>
          <Panel label="General settings">
            <Descriptions
              items={[
                { term: "Workspace name", value: "Acme Corp" },
                { term: "Timezone", value: <CodeSpan>UTC</CodeSpan> },
                { term: "Language", value: <CodeSpan>en-US</CodeSpan> },
              ]}
            />
          </Panel>

          <Panel label="Integrations">
            <Paragraph>
              Connect third-party services to extend functionality.
            </Paragraph>
            <Card title="Slack">
              <Paragraph>
                Workspace: <CodeSpan>acme-ops</CodeSpan>. Connected 2026-03-01.
              </Paragraph>
            </Card>
            <Card title="GitHub">
              <Paragraph>
                Organization: <CodeSpan>acme-corp</CodeSpan>. Connected 2026-02-14.
              </Paragraph>
            </Card>
          </Panel>

          <Panel label="Billing">
            <Descriptions
              title="Current plan"
              items={[
                { term: "Plan", value: <CodeSpan>Team</CodeSpan> },
                { term: "Seats", value: "25 / 30" },
                { term: "Billing cycle", value: "Monthly" },
                { term: "Next invoice", value: "2026-05-01" },
                { term: "Payment method", value: "Visa ••••1234" },
              ]}
            />
          </Panel>

          <Panel label="Danger zone">
            <Alert kind="caution">
              These actions are irreversible. Proceed only if you understand the
              consequences.
            </Alert>
            <Paragraph>
              To delete the workspace, contact support with your account ID and a
              signed deletion request.
            </Paragraph>
          </Panel>
        </Accordion>
      </Section>

      {/* Combined: Tabs inside a Section, then Accordion inside Section */}
      <Section title="Tabs with forms" level={2}>
        <Paragraph>
          Each tab holds a separate form — saves go to different tools. ADR 0007 §4
          flush means all form fields appear in the Markdown regardless of active tab.
        </Paragraph>

        <Tabs>
          <Tab label="Edit profile">
            <Card title="Edit profile">
              <Input name="displayName" label="Display name" defaultValue="Alice Example" />
              <Select
                name="timezone"
                label="Timezone"
                options={["UTC", "America/New_York", "Europe/Paris", "Asia/Seoul"]}
                defaultValue="UTC"
              />
              <Button action="saveProfile">Save profile</Button>
            </Card>
          </Tab>

          <Tab label="Notification settings">
            <Card title="Notification settings">
              <Select
                name="digestFrequency"
                label="Digest frequency"
                options={["daily", "weekly", "never"]}
                defaultValue="daily"
              />
              <Checkbox name="mentionAlerts" label="Alert on @mentions" checked />
              <Button action="saveNotifications">Save notifications</Button>
            </Card>
          </Tab>
        </Tabs>
      </Section>
    </Page>
  );
}
