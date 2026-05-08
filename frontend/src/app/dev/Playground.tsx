"use client";

import { useState } from "react";
import { gql, useMutation, useQuery, useSubscription } from "urql";

const ROOM_ID = "1e64e90b-5aa9-4575-b4c1-168b4b5431b5";

const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
    }
  }
`;

const CHAT_ROOM_QUERY = gql`
  query ChatRoom($id: ID!) {
    chatRoom(id: $id) {
      id
      messages {
        id
        body
        type
        createdAt
        sender {
          id
          name
        }
      }
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation SendMessage($roomId: ID!, $body: String!) {
    sendMessage(roomId: $roomId, body: $body) {
      id
      body
      createdAt
    }
  }
`;

const MESSAGE_ADDED_SUB = gql`
  subscription MessageAdded($roomId: ID!) {
    messageAdded(roomId: $roomId) {
      id
      body
      type
      createdAt
      sender {
        id
        name
      }
    }
  }
`;

type LiveMessage = {
  id: string;
  body: string;
  type: string;
  createdAt: string;
  sender: { id: string; name: string };
};

export function DevPlayground({ userId }: { userId: string }) {
  const [meRes] = useQuery({ query: ME_QUERY });
  const [roomRes, refetchRoom] = useQuery({
    query: CHAT_ROOM_QUERY,
    variables: { id: ROOM_ID },
  });
  const [, sendMessage] = useMutation(SEND_MESSAGE);
  const [body, setBody] = useState("");
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);

  useSubscription(
    {
      query: MESSAGE_ADDED_SUB,
      variables: { roomId: ROOM_ID },
    },
    (_, data: { messageAdded: LiveMessage }) => {
      setLiveMessages((prev) =>
        prev.some((m) => m.id === data.messageAdded.id)
          ? prev
          : [...prev, data.messageAdded],
      );
      return data;
    },
  );

  const handleSend = async () => {
    if (!body.trim()) return;
    const result = await sendMessage({ roomId: ROOM_ID, body });
    if (result.error) {
      alert(`error: ${result.error.message}`);
      return;
    }
    setBody("");
    refetchRoom({ requestPolicy: "network-only" });
  };

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 720 }}>
      <h1>Dev Playground</h1>
      <p style={{ fontSize: 12, color: "#666" }}>userId: {userId}</p>

      <section style={S.section}>
        <h2 style={S.h2}>1. me Query (HTTP)</h2>
        {meRes.fetching && <p>loading...</p>}
        {meRes.error && <p style={S.err}>{meRes.error.message}</p>}
        {meRes.data && (
          <pre style={S.pre}>{JSON.stringify(meRes.data.me, null, 2)}</pre>
        )}
      </section>

      <section style={S.section}>
        <h2 style={S.h2}>2. chatRoom Query (HTTP)</h2>
        {roomRes.fetching && <p>loading...</p>}
        {roomRes.error && <p style={S.err}>{roomRes.error.message}</p>}
        {roomRes.data && !roomRes.data.chatRoom && (
          <p style={S.err}>
            chatRoom not found (참여자가 아니거나 잘못된 roomId)
          </p>
        )}
        {roomRes.data?.chatRoom && (
          <ul style={{ paddingLeft: 16 }}>
            {roomRes.data.chatRoom.messages.map((m: LiveMessage) => (
              <li key={m.id}>
                <b>{m.sender.name}</b> [{m.type}]: {m.body}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={S.section}>
        <h2 style={S.h2}>3. sendMessage Mutation (HTTP)</h2>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="메시지 입력"
          style={S.input}
        />
        <button onClick={handleSend} style={S.btn}>
          전송
        </button>
      </section>

      <section style={S.section}>
        <h2 style={S.h2}>4. messageAdded Subscription (WS) — 실시간 수신</h2>
        <p style={{ fontSize: 12, color: "#666" }}>
          이 페이지를 두 탭(Alice/Bob)으로 열고 한쪽에서 메시지 보내면 다른쪽에 즉시 도착해야 함.
        </p>
        {liveMessages.length === 0 ? (
          <p style={{ fontStyle: "italic", color: "#999" }}>
            아직 수신된 실시간 메시지 없음
          </p>
        ) : (
          <ul style={{ paddingLeft: 16 }}>
            {liveMessages.map((m) => (
              <li key={m.id}>
                <b>{m.sender.name}</b> [{m.type}]: {m.body}{" "}
                <span style={{ fontSize: 11, color: "#888" }}>{m.createdAt}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

const S = {
  section: {
    marginTop: 24,
    padding: 16,
    border: "1px solid #ddd",
    borderRadius: 8,
  },
  h2: { fontSize: 16, marginTop: 0 },
  err: { color: "crimson" },
  pre: {
    background: "#f5f5f5",
    padding: 8,
    borderRadius: 4,
    fontSize: 12,
    overflow: "auto",
  },
  input: {
    padding: 8,
    border: "1px solid #ccc",
    borderRadius: 4,
    width: 300,
    marginRight: 8,
  },
  btn: {
    padding: "8px 16px",
    border: "1px solid #aaa",
    borderRadius: 4,
    cursor: "pointer",
  },
} as const;
