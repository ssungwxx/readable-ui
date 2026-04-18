import { DeleteUserConfirmPage } from "./page-content";

interface PageParams {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageParams) {
  const { id } = await params;
  return <DeleteUserConfirmPage id={id} />;
}
