import { deleteUserPage } from "./page-content";

const DeleteUser = deleteUserPage.Component;

interface PageParams {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageParams) {
  const { id } = await params;
  return <DeleteUser id={id} />;
}
