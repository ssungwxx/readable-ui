// tentative: URL pattern /users/[id]/delete — ADR 0020 left paths.view convention for "ADR 0020.next" to decide.
import {
  Page,
  Heading,
  Card,
  Alert,
  Form,
  Input,
  Button,
  List,
  ListItem,
  Strong,
} from "@readable-ui/react/components";
import { definePage, type Envelope } from "@readable-ui/react";
import { adminNav } from "../../../_shared/admin-nav";

interface DeleteUserConfirmProps {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

/** Fixture data keyed by id — in a real app this would come from the preview tool response */
const fixtureUsers: Record<string, Omit<DeleteUserConfirmProps, "id">> = {
  u_alice_01: { email: "alice@example.com", role: "admin", status: "active", createdAt: "2026-04-12" },
  u_bob_01: { email: "bob@example.com", role: "user", status: "active", createdAt: "2026-04-10" },
  u_carol_01: { email: "carol@example.com", role: "user", status: "pending", createdAt: "2026-04-08" },
  u_dave_02: { email: "dave@example.com", role: "user", status: "disabled", createdAt: "2026-03-30" },
  u_legacy_07: { email: "legacy@example.com", role: "user", status: "archived", createdAt: "2025-12-01" },
  u_err_03: { email: "errbob@example.com", role: "user", status: "error", createdAt: "2026-04-15" },
};

/**
 * Envelope factory for the delete-confirm page.
 * ADR 0020 §5: intent="destructive-confirm" marks this as a preview-response page.
 * envelope tools[] lists only the actual action (deleteUser) — preview is already consumed.
 */
function makeDeleteUserEnvelope({ id }: { id: string }): Envelope {
  const user = fixtureUsers[id] ?? { email: "unknown", role: "?", status: "?", createdAt: "?" };
  return {
    title: `Delete user`,
    purpose: `Confirm delete of user ${id}`,
    intent: "destructive-confirm",
    role: "admin",
    layout: "sidebar",
    nav: { items: adminNav.active("/users") },
    paths: {
      // tentative: ADR 0020 left URL convention out of scope — decided here as REST style
      view: `/users/${id}/delete`,
      markdown: `/users/${id}/delete.md`,
    },
    updatedAt: new Date().toISOString(),
    tools: [
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
      {
        name: "listUsers",
        title: "List users",
        description: "Return to the users list.",
        role: "admin",
      },
    ],
    constraints: [
      {
        id: "delete-irreversible",
        severity: "danger",
        text: `Deleting user ${user.email} is permanent and cannot be undone.`,
      },
    ],
  };
}

export const deleteUserPage = definePage<{ id: string }>({
  envelope: makeDeleteUserEnvelope,
  render: ({ id }) => {
    const user = fixtureUsers[id] ?? {
      email: "unknown",
      role: "?",
      status: "?",
      createdAt: "?",
    };

    return (
      <Page>
        <Heading level={1}>Delete user</Heading>

        <Card title="Delete user">
          <List>
            <ListItem><Strong>Email</Strong>: {user.email}</ListItem>
            <ListItem><Strong>Role</Strong>: {user.role}</ListItem>
            <ListItem><Strong>Status</Strong>: {user.status}</ListItem>
            <ListItem><Strong>Created</Strong>: {user.createdAt}</ListItem>
          </List>
        </Card>

        <Alert kind="caution">
          Deleting this user is permanent and cannot be undone.
        </Alert>

        {/* ADR 0020 §5: Confirm Form with hidden id + danger Button + Cancel */}
        <Form action="deleteUser">
          <Input type="hidden" name="id" defaultValue={id} />
          <Button action="deleteUser">Confirm delete</Button>
          <Button action="listUsers" variant="secondary">Cancel</Button>
        </Form>
      </Page>
    );
  },
});
