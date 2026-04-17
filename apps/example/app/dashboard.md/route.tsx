import { renderPage } from "@readable-ui/react";
import { DashboardPage, dashboardEnvelope } from "../dashboard/page-content";

export async function GET() {
  const markdown = renderPage(<DashboardPage />, dashboardEnvelope);
  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}
