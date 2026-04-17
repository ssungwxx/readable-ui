import {
  Page,
  Heading,
  Paragraph,
  List,
  ListItem,
  Link,
  Card,
  Form,
  Input,
  Button,
  Alert,
} from "@readable-ui/react/components";
import type { Envelope } from "@readable-ui/react";

export const usersEnvelope: Envelope = {
  title: "User management",
  purpose: "Admin CRUD for users",
  role: "admin",
  layout: "flow",
  tools: [
    {
      name: "createUser",
      description: "Create a new user",
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
      name: "deleteUser",
      description: "Permanently delete a user by id",
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
    <Page>
      <Heading level={1}>Users</Heading>
      <Paragraph>
        Manage users. Any change here is auditable. See the{" "}
        <Link href="/users.md">Markdown view</Link> for the AI-facing version.
      </Paragraph>

      <Alert kind="note">
        Deleting a user is permanent. Confirmation required for production data.
      </Alert>

      <Card title="Existing users">
        <List>
          <ListItem>
            Alice &lt;alice@example.com&gt; — admin
          </ListItem>
          <ListItem>
            Bob &lt;bob@example.com&gt; — user
          </ListItem>
          <ListItem>
            Carol &lt;carol@example.com&gt; — user
          </ListItem>
        </List>
      </Card>

      <Card title="Create a new user">
        <Form action="createUser">
          <Input name="name" label="Name" required placeholder="Jane Doe" />
          <Input
            name="email"
            type="email"
            label="Email"
            required
            placeholder="jane@example.com"
          />
          <Input name="role" label="Role (admin | user)" required />
          <Button action="createUser">Create user</Button>
        </Form>
      </Card>
    </Page>
  );
}
