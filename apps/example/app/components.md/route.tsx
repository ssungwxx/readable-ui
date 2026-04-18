import { renderPage } from "@readable-ui/react";
import { ComponentsPage } from "../components/page-content";
import { componentsEnvelope } from "../components/envelope";

export async function GET() {
  const markdown = renderPage(<ComponentsPage />, componentsEnvelope);
  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}
