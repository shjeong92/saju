import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FortuneView } from "./FortuneView";

export default async function FortunePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <FortuneView />;
}
