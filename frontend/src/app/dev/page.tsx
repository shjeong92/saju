import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DevPlayground } from "./Playground";

export default async function DevPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <DevPlayground userId={session.user.id ?? ""} />;
}
