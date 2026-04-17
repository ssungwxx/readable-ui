import { renderPage } from "@readable-ui/react";
import { UsersPage, usersEnvelope } from "../users/page-content";

export async function GET() {
  const markdown = renderPage(<UsersPage />, usersEnvelope);
  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}
