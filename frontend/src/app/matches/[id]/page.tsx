import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MatchDetailView } from "./MatchDetailView";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  return <MatchDetailView matchId={id} />;
}
