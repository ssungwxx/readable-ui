import { renderPage } from "@readable-ui/react";
import { JobsPage, jobsEnvelope } from "../jobs/page-content";

export async function GET() {
  const markdown = renderPage(<JobsPage />, jobsEnvelope);
  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}
