import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChatRoomView } from "./ChatRoomView";

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { roomId } = await params;
  return (
    <ChatRoomView roomId={roomId} currentUserId={session.user.id ?? ""} />
  );
}
