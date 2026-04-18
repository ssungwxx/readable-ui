import { renderPage } from "@readable-ui/react";
import { AuditPage, auditEnvelope } from "../audit/page-content";

export async function GET() {
  const markdown = renderPage(<AuditPage />, auditEnvelope);
  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}
