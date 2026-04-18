import { renderPage } from "@readable-ui/react";
import { DeleteUserConfirmPage, makeDeleteUserEnvelope } from "../delete/page-content";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const markdown = renderPage(<DeleteUserConfirmPage id={id} />, makeDeleteUserEnvelope(id));
  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}
