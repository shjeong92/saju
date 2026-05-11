import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MatchesView } from "./MatchesView";

export default async function MatchesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <MatchesView />;
}
