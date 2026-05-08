import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SajuForm } from "./SajuForm";

export default async function SajuPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <SajuForm />;
}
