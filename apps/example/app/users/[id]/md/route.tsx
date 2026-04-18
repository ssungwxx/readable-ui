import { renderPage } from "@readable-ui/react";
import { UserDetailPage, makeUserDetailEnvelope } from "../page-content";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Force dynamic — `_md` is the rewrite target for `/users/<id>.md` (see next.config.mjs).
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const markdown = renderPage(<UserDetailPage id={id} />, makeUserDetailEnvelope(id));
  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}
