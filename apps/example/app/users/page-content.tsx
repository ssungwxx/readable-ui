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
}

const sampleUsers: User[] = [
  { id: "u_alice_01", email: "alice@example.com", role: "admin" },
  { id: "u_bob_01", email: "bob@example.com", role: "user" },
  { id: "u_carol_01", email: "carol@example.com", role: "user" },
];

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
  pagination: {
    page: 1,
    perPage: 20,
    total: sampleUsers.length,
  },
  tools: [
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

      <Card title="Existing users">
        <Table<User>
          columns={[
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
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
      </Card>

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
