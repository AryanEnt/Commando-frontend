import { redirect } from "next/navigation";

export default async function SalesExecutiveWorkspaceAlias({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/profiles/${id}`);
}
