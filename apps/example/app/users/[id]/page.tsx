import { UserDetailPage } from "./page-content";

interface PageParams {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return [
    { id: "u_alice_01" },
    { id: "u_bob_01" },
    { id: "u_carol_01" },
    { id: "u_dave_02" },
    { id: "u_legacy_07" },
  ];
}

// Allow dynamic ids beyond the prerendered fixture so /users/<unknown> renders fallback content.
export const dynamicParams = true;

export default async function Page({ params }: PageParams) {
  const { id } = await params;
  return <UserDetailPage id={id} />;
}
