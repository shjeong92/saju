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
        displayName
        imageUrl
      }
    }
  }
`);

export function ChatListView({ currentUserId: _currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [{ data, fetching, error }] = useQuery({
    query: MY_CHAT_ROOMS_QUERY,
    requestPolicy: "cache-and-network",
  });

  if (fetching && !data) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-8">
        <p className="text-sm text-ink-500">불러오는 중...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-8">
        <Header />
        <p className="mt-4 text-sm text-crimson-600">오류: {error.message}</p>
      </main>
    );
  }

  const rooms = data?.myChatRooms ?? [];

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Header />

      {rooms.length === 0 ? (
        <EmptyCard />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {rooms.map((room) => {
            const unread = !!room.unreadByMe;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => router.push(`/chat/${room.id}`)}
                aria-label={
                  unread
                    ? `${room.partner.displayName}와의 채팅방, 미응답 메시지 있음`
                    : `${room.partner.displayName}와의 채팅방`
                }
                className={[
                  "w-full rounded-lg border bg-white p-4 text-left shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-colors hover:bg-hanji-50",
                  unread
                    ? "border-vermilion-500/40 bg-vermilion-50/40"
                    : "border-ink-200",
                ].join(" ")}
              >
                <header className="flex items-center justify-between gap-3">
                  <h2 className="m-0 truncate font-serif text-lg text-ink-900">
                    {room.partner.displayName}
                  </h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular text-[12px] text-ink-500">
                      {formatLastTime(room.lastMessageAt)}
                    </span>
                    {unread && (
                      <span
                        aria-hidden
                        className="inline-flex h-2 w-2 shrink-0 rounded-full bg-vermilion-500 ring-2 ring-white"
                      />
                    )}
                  </div>
                </header>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Header() {
  return (
    <header>
      <p className="m-0 font-serif text-2xl text-vermilion-700 tracking-wide">
        話 <span className="text-ink-900">채팅</span>
      </p>
      <p className="mt-1 text-sm text-ink-500">
        매칭 성사된 상대와 대화할 수 있어요.
      </p>
    </header>
  );
}

function EmptyCard() {
  return (
    <section className="mt-4 rounded-lg border border-dashed border-hanji-300 bg-hanji-50 p-6 text-center">
      <p className="m-0 font-serif text-lg text-ink-900">
        아직 채팅방이 없어요
      </p>
      <p className="mt-2 text-sm text-ink-500">
        매칭 피드에서 좋아요를 주고받으면 채팅방이 열려요.
      </p>
      <div className="mt-4">
        <Link
          href="/matches"
          className="inline-flex items-center justify-center rounded-md bg-vermilion-500 px-4 py-2 text-sm font-semibold text-white hover:bg-vermilion-600 transition-colors"
        >
          매칭 피드 보러 가기
        </Link>
      </div>
    </section>
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
