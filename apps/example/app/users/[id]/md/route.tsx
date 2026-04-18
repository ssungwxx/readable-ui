import { userDetailPage } from "../page-content";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Force dynamic — `_md` is the rewrite target for `/users/<id>.md` (see next.config.mjs).
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: RouteParams) {
  const resolved = await params;
  return userDetailPage.GET(req, { params: resolved });
}
