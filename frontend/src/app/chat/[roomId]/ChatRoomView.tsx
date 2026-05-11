"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useSubscription } from "urql";
import { graphql } from "@/gql";
import type { ChatRoomDetailQuery } from "@/gql/graphql";

const CHAT_ROOM_DETAIL_QUERY = graphql(`
  query ChatRoomDetail($id: ID!) {
    chatRoom(id: $id) {
      id
      partner {
        id
        name
        imageUrl
      }
      messages {
        id
        type
        body
        createdAt
        sender {
          id
          name
        }
      }
    }
  }
`);

const SEND_ROOM_MESSAGE = graphql(`
  mutation SendRoomMessage($roomId: ID!, $body: String!) {
    sendRoomMessage: sendMessage(roomId: $roomId, body: $body) {
      id
      type
      body
      createdAt
      sender {
        id
        name
      }
    }
  }
`);

const MARK_ROOM_READ = graphql(`
  mutation MarkRoomRead($roomId: ID!) {
    markRoomRead(roomId: $roomId) {
      id
    }
  }
`);

const ROOM_MESSAGE_ADDED_SUB = graphql(`
  subscription RoomMessageAdded($roomId: ID!) {
    roomMessageAdded: messageAdded(roomId: $roomId) {
      id
      type
      body
      createdAt
      sender {
        id
        name
      }
    }
  }
`);

type ChatRoom = NonNullable<ChatRoomDetailQuery["chatRoom"]>;
type Message = ChatRoom["messages"][number];

export function ChatRoomView({
  roomId,
  currentUserId,
}: {
  roomId: string;
  currentUserId: string;
}) {
  const [{ data, fetching, error }] = useQuery({
    query: CHAT_ROOM_DETAIL_QUERY,
    variables: { id: roomId },
    requestPolicy: "cache-and-network",
  });
  const [, sendMessage] = useMutation(SEND_ROOM_MESSAGE);
  const [, markRoomRead] = useMutation(MARK_ROOM_READ);

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useSubscription(
    {
      query: ROOM_MESSAGE_ADDED_SUB,
      variables: { roomId },
    },
    (_prev, next) => {
      const incoming = next.roomMessageAdded;
      setLiveMessages((prev) =>
        prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
      );
      return next;
    },
  );

  const messages = useMemo(() => {
    const seedMessages = data?.chatRoom?.messages ?? [];
    const merged: Message[] = [...seedMessages];
    for (const live of liveMessages) {
      if (!merged.some((m) => m.id === live.id)) merged.push(live);
    }
    return merged;
  }, [data?.chatRoom?.messages, liveMessages]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.sender?.id === currentUserId) return;
    void markRoomRead({ roomId });
  }, [messages.length, currentUserId, roomId, markRoomRead]);

  if (fetching && !data) {
    return (
      <main style={S.main}>
        <p>불러오는 중...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={S.main}>
        <h1>채팅방</h1>
        <p style={S.error}>오류: {error.message}</p>
      </main>
    );
  }

  const room = data?.chatRoom;
  if (!room) {
    return (
      <main style={S.main}>
        <h1>채팅방</h1>
        <p style={S.error}>채팅방을 찾을 수 없어요.</p>
        <p>
          <Link href="/chat" style={{ color: "#666" }}>
            ← 채팅방 목록
          </Link>
        </p>
      </main>
    );
  }

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setSendError(null);
    const result = await sendMessage({ roomId, body });
    setBusy(false);
    if (result.error) {
      setSendError(result.error.message);
      return;
    }
    const sent = result.data?.sendRoomMessage;
    if (sent) {
      setLiveMessages((prev) =>
        prev.some((m) => m.id === sent.id) ? prev : [...prev, sent],
      );
    }
    setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <main style={S.main}>
      <header style={S.header}>
        <Link href="/chat" style={S.backLink}>
          ←
        </Link>
        <h1 style={S.h1}>{room.partner.name}</h1>
      </header>

      <section style={S.messageList}>
        {messages.length === 0 ? (
          <p style={S.empty}>첫 메시지를 보내보세요.</p>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMine={msg.sender?.id === currentUserId}
            />
          ))
        )}
        <div ref={scrollEndRef} />
      </section>

      {sendError && <p style={S.error}>{sendError}</p>}

      <section style={S.composer}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력 (Enter 전송, Shift+Enter 줄바꿈)"
          rows={2}
          style={S.textarea}
          disabled={busy}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={busy || draft.trim().length === 0}
          style={{
            ...S.sendBtn,
            opacity: busy || draft.trim().length === 0 ? 0.5 : 1,
          }}
        >
          전송
        </button>
      </section>
    </main>
  );
}

function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  if (msg.type === "system") {
    return (
      <div style={S.systemRow}>
        <p style={S.systemText}>{msg.body}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        ...S.userRow,
        justifyContent: isMine ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          ...S.bubble,
          background: isMine ? "#2563eb" : "#f3f4f6",
          color: isMine ? "#fff" : "#111",
        }}
      >
        {!isMine && msg.sender?.name && (
          <p style={S.senderName}>{msg.sender.name}</p>
        )}
        <p style={S.body}>{msg.body}</p>
        <p style={{ ...S.time, color: isMine ? "#dbeafe" : "#6b7280" }}>
          {formatTime(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

function formatTime(value: unknown): string {
  if (typeof value !== "string" && !(value instanceof Date)) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

const S = {
  main: {
    padding: 24,
    fontFamily: "system-ui",
    maxWidth: 720,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column" as const,
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
    borderBottom: "1px solid #eee",
  },
  backLink: {
    fontSize: 18,
    textDecoration: "none",
    color: "#000",
    padding: "4px 8px",
    border: "1px solid #ddd",
    borderRadius: 4,
  },
  h1: { fontSize: 20, margin: 0 },
  error: { color: "crimson", margin: "8px 0" },
  empty: {
    textAlign: "center" as const,
    color: "#999",
    fontStyle: "italic" as const,
  },
  messageList: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "16px 0",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  systemRow: {
    display: "flex",
    justifyContent: "center",
    padding: "4px 0",
  },
  systemText: {
    fontSize: 12,
    color: "#888",
    background: "#f9fafb",
    padding: "4px 10px",
    borderRadius: 10,
    margin: 0,
  },
  userRow: {
    display: "flex",
    width: "100%",
  },
  bubble: {
    maxWidth: "70%",
    padding: "8px 12px",
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.4,
    wordBreak: "break-word" as const,
  },
  senderName: {
    fontSize: 11,
    margin: "0 0 2px",
    fontWeight: 600,
    opacity: 0.7,
  },
  body: { margin: 0, whiteSpace: "pre-wrap" as const },
  time: {
    fontSize: 10,
    margin: "4px 0 0",
    textAlign: "right" as const,
  },
  composer: {
    display: "flex",
    gap: 8,
    padding: "12px 0",
    borderTop: "1px solid #eee",
  },
  textarea: {
    flex: 1,
    padding: 8,
    border: "1px solid #ccc",
    borderRadius: 6,
    fontSize: 14,
    fontFamily: "inherit",
    resize: "none" as const,
  },
  sendBtn: {
    padding: "0 16px",
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
} as const;
