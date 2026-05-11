import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChatListView } from "./ChatListView";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <ChatListView currentUserId={session.user.id ?? ""} />;
}
