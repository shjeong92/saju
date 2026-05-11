"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "urql";
import { graphql } from "@/gql";

const MY_CHAT_ROOMS_QUERY = graphql(`
  query MyChatRooms {
    myChatRooms {
      id
      lastMessageAt
      unreadByMe
      partner {
        id
        name
        imageUrl
      }
    }
  }
`);

export function ChatListView({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [{ data, fetching, error }] = useQuery({
    query: MY_CHAT_ROOMS_QUERY,
    requestPolicy: "cache-and-network",
  });

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

  const rooms = data?.myChatRooms ?? [];

  return (
    <main style={S.main}>
      <h1>채팅방</h1>
      <p style={S.help}>매칭 성사된 상대와 대화할 수 있어요.</p>
      <p style={{ ...S.help, fontSize: 11 }}>userId: {currentUserId}</p>

      {rooms.length === 0 ? (
        <section style={S.card}>
          <p>아직 채팅방이 없어요.</p>
          <p style={S.help}>매칭 피드에서 좋아요를 주고받으면 채팅방이 열려요.</p>
          <Link href="/matches" style={S.primaryLink}>
            매칭 피드 보러 가기
          </Link>
        </section>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => router.push(`/chat/${room.id}`)}
              style={{
                ...S.card,
                textAlign: "left",
                cursor: "pointer",
                borderColor: room.unreadByMe ? "#2563eb" : "#ddd",
              }}
            >
              <header style={S.rowBetween}>
                <h2 style={S.h2}>{room.partner.name}</h2>
                <div style={S.meta}>
                  <p style={S.metaLine}>{formatLastTime(room.lastMessageAt)}</p>
                  {room.unreadByMe && <span style={S.unreadDot} />}
                </div>
              </header>
            </button>
          ))}
        </div>
      )}

    </main>
  );
}

function formatLastTime(value: unknown): string {
  if (typeof value !== "string" && !(value instanceof Date)) {
    return "메시지 없음";
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "메시지 없음";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const S = {
  main: {
    padding: 32,
    fontFamily: "system-ui",
    maxWidth: 720,
    margin: "0 auto",
  },
  help: { fontSize: 13, color: "#666" },
  error: { color: "crimson" },
  card: {
    padding: 16,
    border: "1px solid #ddd",
    borderRadius: 8,
    background: "#fff",
    width: "100%",
    font: "inherit",
  },
  rowBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  h2: { fontSize: 18, marginTop: 0, marginBottom: 0 },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  metaLine: { fontSize: 12, color: "#666", margin: 0 },
  unreadDot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#2563eb",
  },
  primaryLink: {
    display: "inline-block",
    marginTop: 12,
    padding: "8px 12px",
    border: "1px solid #000",
    borderRadius: 6,
    textDecoration: "none",
    color: "#000",
  },
} as const;
