import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ReadingView } from "./ReadingView";

export default async function ReadingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <ReadingView />;
}
