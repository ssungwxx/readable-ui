import { deleteUserPage } from "../delete/page-content";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const resolved = await params;
  return deleteUserPage.GET(req, { params: resolved });
}
