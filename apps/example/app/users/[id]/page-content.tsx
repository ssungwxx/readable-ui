// ADR 0021: detail layout — single-resource view (back nav + main + meta rail + footer actions).
// Body content reuses the ADR 0018 single-resource idiom (Card + List + Strong + ": " + value).
import {
  Page,
  Heading,
  Paragraph,
  Card,
  Alert,
  Input,
  CodeSpan,
  Descriptions,
} from "@readable-ui/react/components";
import { definePage, type Envelope } from "@readable-ui/react";
import { adminNav } from "../../_shared/admin-nav";

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  // ADR 0019/0020: 5-stage palette
  status: "active" | "pending" | "archived" | "disabled" | "error";
  createdAt: string;
  lastSeenAt: string;
  invitedBy: string;
}

interface ActivityEvent extends Record<string, unknown> {
  id: string;
  when: string;
  action: string;
  target: string;
}

const fixtureUsers: Record<string, UserDetail> = {
  u_alice_01: {
    id: "u_alice_01",
    name: "Alice Example",
    email: "alice@example.com",
    role: "admin",
    status: "active",
    createdAt: "2026-04-12",
    lastSeenAt: "2026-04-18 08:42",
    invitedBy: "system",
  },
  u_bob_01: {
    id: "u_bob_01",
    name: "Bob Builder",
    email: "bob@example.com",
    role: "user",
    status: "active",
    createdAt: "2026-04-10",
    lastSeenAt: "2026-04-17 19:11",
    invitedBy: "alice@example.com",
  },
  u_carol_01: {
    id: "u_carol_01",
    name: "Carol Pending",
    email: "carol@example.com",
    role: "user",
    status: "pending",
    createdAt: "2026-04-08",
    lastSeenAt: "2026-04-08 12:00",
    invitedBy: "alice@example.com",
  },
  u_dave_02: {
    id: "u_dave_02",
    name: "Dave Disabled",
    email: "dave@example.com",
    role: "user",
    status: "disabled",
    createdAt: "2026-03-30",
    lastSeenAt: "2026-04-02 10:14",
    invitedBy: "alice@example.com",
  },
  u_legacy_07: {
    id: "u_legacy_07",
    name: "Legacy Account",
    email: "legacy@example.com",
    role: "user",
    status: "archived",
    createdAt: "2025-12-01",
    lastSeenAt: "2026-01-15 09:30",
    invitedBy: "system",
  },
};

const fallbackUser: UserDetail = {
  id: "unknown",
  name: "Unknown user",
  email: "unknown",
  role: "user",
  status: "error",
  createdAt: "?",
  lastSeenAt: "?",
  invitedBy: "?",
};

function recentActivityFor(userId: string): ActivityEvent[] {
  return [
    { id: `${userId}_evt1`, when: "2026-04-17 09:14", action: "updateUser", target: userId },
    { id: `${userId}_evt2`, when: "2026-04-15 14:02", action: "updateUser", target: userId },
    { id: `${userId}_evt3`, when: "2026-04-12 10:00", action: "createUser", target: userId },
  ];
}

/**
 * Envelope factory for the user-detail page.
 * ADR 0021: layout="detail" + nav remains as the global admin shell signal.
 */
function makeUserDetailEnvelope({ id }: { id: string }): Envelope {
  const user = fixtureUsers[id] ?? { ...fallbackUser, id };
  return {
    title: user.name,
    purpose: `Detail view for user ${user.email}`,
    role: "admin",
    layout: "detail",
    nav: { items: adminNav.active("/users") },
    // ADR 0024 §4: breadcrumb replaces the single-link `back` idiom for nested resources.
    breadcrumb: [
      { label: "Users", href: "/users" },
      { label: user.name },
    ],
    paths: {
      view: `/users/${id}`,
      markdown: `/users/${id}.md`,
    },
    updatedAt: "2026-04-18T00:00:00.000Z",
    tools: [
      {
        name: "listUsers",
        title: "List users",
        description: "Return to the users list.",
        role: "admin",
      },
      {
        name: "updateUser",
        title: "Update user",
        description: "Update a user's role.",
        role: "admin",
        input: {
          type: "object",
          properties: {
            id: { type: "string" },
            role: { type: "string", enum: ["admin", "user"] },
          },
          required: ["id"],
        },
      },
      {
        // ADR 0020 §2: 1st step preview tool
        name: "deleteUserPreview",
        title: "Preview delete user",
        description: "Open the confirmation page before permanently deleting a user.",
        role: "admin",
        input: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
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
  };
}

export const userDetailPage = definePage<{ id: string }>({
  envelope: makeUserDetailEnvelope,
  render: ({ id }, { Button, Form, Table }) => {
  const user = fixtureUsers[id] ?? { ...fallbackUser, id };
  const activity = recentActivityFor(user.id);

  return (
    <Page
      meta={
        <Descriptions
          title="Details"
          items={[
            { term: "ID", value: <CodeSpan>{user.id}</CodeSpan> },
            { term: "Created", value: user.createdAt },
            { term: "Last seen", value: user.lastSeenAt },
            { term: "Invited by", value: user.invitedBy },
          ]}
        />
      }
      footer={
        // ADR 0019 §1 + ADR 0020 §2: 1-step preview entry; …suffix + danger variant.
        <Form action="deleteUserPreview">
          <Input type="hidden" name="id" defaultValue={user.id} />
          <Button action="deleteUserPreview" variant="danger">
            Delete user&hellip;
          </Button>
        </Form>
      }
    >
      <Heading level={1}>{user.name}</Heading>
      <Paragraph>{user.email}</Paragraph>

      {user.status === "disabled" || user.status === "error" ? (
        <Alert kind="warning">
          This account is currently {user.status}. Some actions may be restricted.
        </Alert>
      ) : null}

      <Descriptions
        title="Profile"
        items={[
          { term: "Email", value: user.email },
          { term: "Role", value: <CodeSpan>{user.role}</CodeSpan> },
          { term: "Status", value: <CodeSpan>{user.status}</CodeSpan> },
        ]}
      />

      <Card title="Update role">
        {/* ADR 0016: Form input default value via directive default attribute */}
        <Form action="updateUser">
          <Input type="hidden" name="id" defaultValue={user.id} />
          <Input
            name="role"
            label="Role"
            defaultValue={user.role}
            placeholder="admin or user"
          />
          <Button action="updateUser">Save changes</Button>
        </Form>
      </Card>

      <Card title="Recent activity">
        <Table<ActivityEvent>
          tool="viewEvent"
          columns={[
            { key: "when", label: "When" },
            { key: "action", label: "Action" },
            { key: "target", label: "Target" },
          ]}
          rows={activity}
          actions={[
            {
              tool: "viewEvent",
              label: "Open",
              params: (r) => ({ id: r.id }),
            },
          ]}
        />
      </Card>
    </Page>
  );
  },
});
