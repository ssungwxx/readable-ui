import { renderPage } from "@readable-ui/react";
import { ReportsPage, reportsEnvelope } from "../reports/page-content";

export async function GET() {
  const markdown = renderPage(<ReportsPage />, reportsEnvelope);
  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}
