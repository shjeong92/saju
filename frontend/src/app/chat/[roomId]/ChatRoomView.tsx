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

const GROUP_WINDOW_MS = 60_000;

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  if (fetching && !data) {
    return (
      <main className="mx-auto flex h-screen max-w-2xl items-center justify-center px-5">
        <p className="text-sm text-ink-500">불러오는 중...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-6">
        <p className="text-sm text-crimson-600">오류: {error.message}</p>
      </main>
    );
  }

  const room = data?.chatRoom;
  if (!room) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-6">
        <p className="text-sm text-ink-500">채팅방을 찾을 수 없어요.</p>
        <Link
          href="/chat"
          className="mt-2 inline-flex text-sm text-ink-500 hover:text-ink-700"
        >
          ← 채팅방 목록
        </Link>
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

  const rendered = buildRenderItems(messages, currentUserId);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-hanji-200 bg-hanji-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/chat"
            aria-label="채팅방 목록으로"
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-ink-700 hover:bg-hanji-100 transition-colors"
          >
            ←
          </Link>
          <h1 className="m-0 font-serif text-lg text-ink-900">
            {room.partner.name}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-32 pt-4">
        {rendered.length === 0 ? (
          <p className="mt-12 text-center text-sm italic text-ink-400">
            첫 메시지를 보내보세요.
          </p>
        ) : (
          <div className="flex flex-col">
            {rendered.map((item) => {
              if (item.kind === "day") {
                return <DaySeparator key={item.key} label={item.label} />;
              }
              if (item.kind === "system") {
                return <SystemRow key={item.key} body={item.body} />;
              }
              return (
                <MessageBubble
                  key={item.key}
                  body={item.body}
                  isMine={item.isMine}
                  senderName={item.senderName}
                  time={item.time}
                  showName={item.showName}
                  showTime={item.showTime}
                  showTail={item.showTail}
                  groupTopGap={item.groupTopGap}
                />
              );
            })}
          </div>
        )}
        <div ref={scrollEndRef} />
      </main>

      <div className="fixed inset-x-0 bottom-20 z-30 border-t border-hanji-200 bg-hanji-50/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {sendError && (
            <p className="mb-2 text-xs text-crimson-600">{sendError}</p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요"
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-ink-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-vermilion-500 focus:outline-none focus:ring-1 focus:ring-vermilion-500 disabled:opacity-50"
              disabled={busy}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={busy || draft.trim().length === 0}
              className="flex h-10 shrink-0 items-center rounded-full bg-vermilion-500 px-4 text-sm font-semibold text-white hover:bg-vermilion-600 disabled:opacity-40 transition-colors"
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

type RenderItem =
  | { kind: "day"; key: string; label: string }
  | { kind: "system"; key: string; body: string }
  | {
      kind: "bubble";
      key: string;
      body: string;
      isMine: boolean;
      senderName: string | null;
      time: string;
      showName: boolean;
      showTime: boolean;
      showTail: boolean;
      groupTopGap: boolean;
    };

function buildRenderItems(
  messages: readonly Message[],
  currentUserId: string,
): RenderItem[] {
  const out: RenderItem[] = [];
  let lastDayKey: string | null = null;
  let lastBubble: {
    senderId: string | null;
    minuteKey: string;
    date: Date | null;
    index: number;
  } | null = null;

  for (const msg of messages) {
    const date = toDate(msg.createdAt);
    const dayKey = date
      ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      : "unknown";
    if (dayKey !== lastDayKey) {
      out.push({
        kind: "day",
        key: `day-${msg.id}`,
        label: formatDayLabel(date),
      });
      lastDayKey = dayKey;
      lastBubble = null;
    }

    if (msg.type === "system") {
      out.push({ kind: "system", key: msg.id, body: msg.body });
      lastBubble = null;
      continue;
    }

    const isMine = msg.sender?.id === currentUserId;
    const senderId = msg.sender?.id ?? null;
    const minuteKey = date
      ? `${dayKey}-${date.getHours()}:${date.getMinutes()}`
      : `unknown-${msg.id}`;

    const sameSender = !!lastBubble && lastBubble.senderId === senderId;
    const sameMinute = !!lastBubble && lastBubble.minuteKey === minuteKey;
    const withinWindow =
      !!lastBubble &&
      !!lastBubble.date &&
      !!date &&
      date.getTime() - lastBubble.date.getTime() <= GROUP_WINDOW_MS;

    const groupContinuation = sameSender && sameMinute && withinWindow;
    const showName = !isMine && !groupContinuation;
    const groupTopGap = !groupContinuation;

    if (lastBubble && !groupContinuation) {
      const prev = out[lastBubble.index];
      if (prev?.kind === "bubble") {
        out[lastBubble.index] = { ...prev, showTime: true, showTail: true };
      }
    }

    const placeholderTime = formatTime(date);
    const item: RenderItem = {
      kind: "bubble",
      key: msg.id,
      body: msg.body,
      isMine,
      senderName: msg.sender?.name ?? null,
      time: placeholderTime,
      showName,
      showTime: false,
      showTail: false,
      groupTopGap,
    };
    const insertedIndex = out.length;
    out.push(item);
    lastBubble = { senderId, minuteKey, date, index: insertedIndex };
  }

  if (lastBubble) {
    const prev = out[lastBubble.index];
    if (prev?.kind === "bubble") {
      out[lastBubble.index] = { ...prev, showTime: true, showTail: true };
    }
  }

  return out;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTime(d: Date | null): string {
  if (!d) return "";
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

const DAY_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});

function formatDayLabel(d: Date | null): string {
  if (!d) return "";
  return DAY_FORMATTER.format(d);
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-hanji-200" />
      <span className="text-[11px] text-ink-500">{label}</span>
      <span className="h-px flex-1 bg-hanji-200" />
    </div>
  );
}

function SystemRow({ body }: { body: string }) {
  return (
    <div className="my-2 flex justify-center">
      <p className="m-0 rounded-full border border-hanji-200 bg-hanji-100 px-3 py-1 text-[12px] text-ink-500">
        {body}
      </p>
    </div>
  );
}

function MessageBubble({
  body,
  isMine,
  senderName,
  time,
  showName,
  showTime,
  showTail,
  groupTopGap,
}: {
  body: string;
  isMine: boolean;
  senderName: string | null;
  time: string;
  showName: boolean;
  showTime: boolean;
  showTail: boolean;
  groupTopGap: boolean;
}) {
  const rowGap = groupTopGap ? "mt-2" : "mt-0.5";
  return (
    <div
      className={`flex w-full ${rowGap} ${isMine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex max-w-[78%] flex-col ${isMine ? "items-end" : "items-start"}`}
      >
        {showName && senderName && !isMine && (
          <p className="mb-1 ml-1 text-[11px] font-medium text-ink-500">
            {senderName}
          </p>
        )}
        <div
          className={`flex items-end gap-1.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}
        >
          <div
            className={`relative whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed ${
              isMine
                ? "bg-vermilion-500 text-white"
                : "bg-white text-ink-900 border border-ink-200"
            }`}
            style={
              showTail
                ? isMine
                  ? { borderBottomRightRadius: 4 }
                  : { borderBottomLeftRadius: 4 }
                : undefined
            }
          >
            {body}
          </div>
          {showTime && (
            <span className="mb-0.5 shrink-0 text-[10px] text-ink-400">
              {time}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
