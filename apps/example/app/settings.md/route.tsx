import { renderPage } from "@readable-ui/react";
import { SettingsPage } from "../settings/page-content";
import { settingsEnvelope } from "../settings/envelope";

export async function GET() {
  const markdown = renderPage(<SettingsPage />, settingsEnvelope);
  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}
