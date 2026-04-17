import {
  Page,
  Heading,
  Paragraph,
  Link,
  Card,
  Form,
  Input,
  Select,
  Button,
  Alert,
  Table,
} from "@readable-ui/react/components";
import type { Envelope } from "@readable-ui/react";
import { withActive } from "../_shared/admin-nav";

interface User extends Record<string, unknown> {
  id: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "inactive";
  createdAt: string;
}

const sampleUsers: User[] = [
  { id: "u_alice_01", email: "alice@example.com", role: "admin", status: "active", createdAt: "2026-04-12" },
  { id: "u_bob_01", email: "bob@example.com", role: "user", status: "active", createdAt: "2026-04-10" },
  { id: "u_carol_01", email: "carol@example.com", role: "user", status: "active", createdAt: "2026-04-08" },
];

const PAGE_SIZE = 20;
const TOTAL_ROWS = 135;
const CURRENT_PAGE = 2;
const TOTAL_PAGES = Math.ceil(TOTAL_ROWS / PAGE_SIZE);
const ACTIVE_FILTER = { status: "active", role: "user" } as const;
const CURRENT_SORT = "createdAt:desc";

export const usersEnvelope: Envelope = {
  title: "User management",
  purpose: "Admin page to list, create, update, and delete user accounts.",
  role: "admin",
  layout: "sidebar",
  nav: { items: withActive("/users") },
  paths: {
    view: "/users",
    markdown: "/users.md",
  },
  updatedAt: "2026-04-17T00:00:00Z",
  constraints: [
    {
      id: "delete-irreversible",
      severity: "danger",
      text: "Deleting a user is permanent and cannot be undone.",
    },
    {
      id: "audit-log",
      severity: "info",
      text: "All mutations here are recorded in the audit log.",
    },
  ],
  tools: [
    {
      name: "listUsers",
      title: "List users",
      description:
        "List users with pagination / sort / filter. Accepts `_page`, `_size`, `_sort=<key>:<dir>`, and `_filter_<field>=<value>` query params.",
      role: "admin",
      input: {
        type: "object",
        properties: {
          _page: { type: "integer", minimum: 1 },
          _size: { type: "integer", minimum: 1 },
          _sort: { type: "string", pattern: "^[A-Za-z0-9._-]+:(asc|desc|ASC|DESC)$" },
          _filter_status: { type: "string", enum: ["active", "inactive"] },
          _filter_role: { type: "string", enum: ["admin", "user"] },
        },
      },
    },
    {
      name: "createUser",
      title: "Create user",
      description: "Create a new user.",
      role: "admin",
      input: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["admin", "user"] },
        },
        required: ["name", "email", "role"],
      },
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
      name: "deleteUser",
      title: "Delete user",
      description: "Permanently delete a user by id.",
      role: "admin",
      input: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  ],
};

export function UsersPage() {
  return (
    <Page layout="sidebar" nav={withActive("/users")}>
      <Heading level={1}>Users</Heading>
      <Paragraph>
        Manage users. Any change here is auditable. See the{" "}
        <Link href="/users.md">Markdown view</Link> for the AI-facing version.
      </Paragraph>

      <Alert kind="caution">
        Deleting a user is permanent and cannot be undone.
      </Alert>

      <Table<User>
        caption="Active users"
        tool="listUsers"
        page={CURRENT_PAGE}
        of={TOTAL_PAGES}
        size={PAGE_SIZE}
        total={TOTAL_ROWS}
        sort={CURRENT_SORT}
        filter={ACTIVE_FILTER}
        mode="summary"
        columns={[
          { key: "email", label: "Email" },
          { key: "role", label: "Role" },
          { key: "status", label: "Status" },
          { key: "createdAt", label: "Created" },
        ]}
        rows={sampleUsers}
        actions={[
          {
            tool: "updateUser",
            label: "Edit",
            params: (r) => ({ id: r.id }),
          },
          {
            tool: "deleteUser",
            label: "Delete",
            variant: "danger",
            params: (r) => ({ id: r.id }),
          },
        ]}
      />

      <Card title="Create a new user">
        <Form action="createUser">
          <Input
            name="name"
            label="Name"
            required
            minLength={1}
            placeholder="Jane Doe"
          />
          <Input
            name="email"
            type="email"
            format="email"
            label="Email"
            required
            placeholder="jane@example.com"
          />
          <Select
            name="role"
            label="Role"
            options={["admin", "user"]}
            required
          />
          <Button action="createUser">Create user</Button>
        </Form>
      </Card>
    </Page>
  );
}
