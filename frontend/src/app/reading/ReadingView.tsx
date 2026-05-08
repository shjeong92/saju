"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "urql";
import { graphql } from "@/gql";

const MY_READING = graphql(`
  query MyReading {
    myReading {
      id
      status
      version
      sections {
        overview
        career
        love
        wealth
        health
        caution
      }
      errorMessage
      completedAt
    }
  }
`);

const POLL_INTERVAL_MS = 5000;

export function ReadingView() {
  const [{ data, fetching, error }, refetch] = useQuery({
    query: MY_READING,
    requestPolicy: "cache-and-network",
  });

  const status = data?.myReading?.status;
  const isInProgress = status === "pending" || status === "generating";

  useEffect(() => {
    if (!isInProgress) return;
    const id = setInterval(() => {
      refetch({ requestPolicy: "network-only" });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isInProgress, refetch]);

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
        <h1>내 사주 풀이</h1>
        <p style={S.error}>오류: {error.message}</p>
      </main>
    );
  }

  const reading = data?.myReading;

  if (!reading) {
    return (
      <main style={S.main}>
        <h1>내 사주 풀이</h1>
        <section style={S.card}>
          <p>아직 사주를 입력하지 않으셨네요.</p>
          <Link href="/saju" style={S.primaryLink}>
            사주 입력하러 가기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main style={S.main}>
      <h1>내 사주 풀이</h1>
      <p style={S.help}>버전: {reading.version}</p>

      {reading.status === "pending" && (
        <ProgressCard
          title="대기 중"
          message="AI 풀이 생성을 곧 시작합니다... (자동 새로고침)"
        />
      )}

      {reading.status === "generating" && (
        <ProgressCard
          title="풀이 생성 중"
          message="AI가 당신의 사주를 풀이하고 있습니다. 보통 30초 정도 걸려요. (자동 새로고침)"
        />
      )}

      {reading.status === "failed" && (
        <section style={{ ...S.card, borderColor: "#fcc", background: "#fff5f5" }}>
          <h2 style={S.h2}>풀이 생성 실패</h2>
          <p style={S.error}>
            {reading.errorMessage ?? "알 수 없는 오류"}
          </p>
          <p style={S.help}>
            <Link href="/saju" style={S.linkText}>
              사주 다시 입력
            </Link>
            하시면 자동으로 재시도됩니다.
          </p>
        </section>
      )}

      {reading.status === "completed" && reading.sections && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionCard title="총평" body={reading.sections.overview} />
          <SectionCard title="커리어" body={reading.sections.career} />
          <SectionCard title="연애" body={reading.sections.love} />
          <SectionCard title="재물" body={reading.sections.wealth} />
          <SectionCard title="건강" body={reading.sections.health} />
          <SectionCard
            title="주의할 점"
            body={reading.sections.caution}
            tone="caution"
          />
        </div>
      )}

      {reading.status === "completed" && !reading.sections && (
        <p style={S.error}>풀이가 완료됐지만 데이터가 비어있습니다.</p>
      )}
    </main>
  );
}

function ProgressCard({ title, message }: { title: string; message: string }) {
  return (
    <section style={S.card}>
      <h2 style={S.h2}>⏳ {title}</h2>
      <p style={S.help}>{message}</p>
    </section>
  );
}

function SectionCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string | null | undefined;
  tone?: "caution";
}) {
  if (!body) return null;
  return (
    <section
      style={{
        ...S.card,
        borderColor: tone === "caution" ? "#fdb" : "#ddd",
        background: tone === "caution" ? "#fff8ee" : "#fff",
      }}
    >
      <h2 style={S.h2}>{title}</h2>
      <p style={S.body}>{body}</p>
    </section>
  );
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
  },
  h2: { fontSize: 16, marginTop: 0, marginBottom: 8 },
  body: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap" as const,
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
  linkText: { color: "#06c", textDecoration: "underline" },
} as const;
