"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "urql";
import { graphql } from "@/gql";
import type { FortuneScore } from "@/gql/graphql";

const MY_DAILY_FORTUNE = graphql(`
  query MyDailyFortune {
    myDailyFortune {
      id
      forDate
      status
      score
      sections {
        summary
        love
        work
        health
        luckyColor
        luckyNumber
      }
      completedAt
    }
  }
`);

const POLL_INTERVAL_MS = 5000;

const SCORE_META = {
  great: { label: "대길", color: "#16a34a", bg: "#f0fdf4" },
  good: { label: "길", color: "#2563eb", bg: "#eff6ff" },
  normal: { label: "평", color: "#6b7280", bg: "#f9fafb" },
  caution: { label: "주의", color: "#d97706", bg: "#fffbeb" },
  bad: { label: "흉", color: "#dc2626", bg: "#fef2f2" },
} as const satisfies Record<FortuneScore, { label: string; color: string; bg: string }>;

export function FortuneView() {
  const [{ data, fetching, error }, refetch] = useQuery({
    query: MY_DAILY_FORTUNE,
    requestPolicy: "cache-and-network",
  });

  const status = data?.myDailyFortune?.status;
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
        <h1>오늘의 운세</h1>
        <p style={S.error}>오류: {error.message}</p>
      </main>
    );
  }

  const fortune = data?.myDailyFortune;

  if (!fortune) {
    return (
      <main style={S.main}>
        <h1>오늘의 운세</h1>
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
      <h1>오늘의 운세</h1>
      <p style={S.help}>{fortune.forDate as string}</p>

      {(fortune.status === "pending" || fortune.status === "generating") && (
        <section style={S.card}>
          <h2 style={S.h2}>
            ⏳ {fortune.status === "pending" ? "대기 중" : "운세 생성 중"}
          </h2>
          <p style={S.help}>
            AI가 오늘의 운세를 작성하고 있어요. (자동 새로고침)
          </p>
        </section>
      )}

      {fortune.status === "failed" && (
        <section style={{ ...S.card, borderColor: "#fcc", background: "#fff5f5" }}>
          <h2 style={S.h2}>운세 생성 실패</h2>
          <p style={S.help}>잠시 후 다시 확인해 주세요.</p>
        </section>
      )}

      {fortune.status === "completed" && fortune.sections && (
        <>
          {fortune.score && (
            <section
              style={{
                ...S.card,
                background: SCORE_META[fortune.score].bg,
                borderColor: SCORE_META[fortune.score].color,
                textAlign: "center",
                padding: 24,
              }}
            >
              <p style={{ ...S.help, margin: 0 }}>오늘의 운세</p>
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: SCORE_META[fortune.score].color,
                  margin: "8px 0",
                }}
              >
                {SCORE_META[fortune.score].label}
              </p>
              <p style={{ ...S.body, margin: 0 }}>{fortune.sections.summary}</p>
            </section>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            <SectionCard icon="💼" title="일/공부" body={fortune.sections.work} />
            <SectionCard icon="❤️" title="연애" body={fortune.sections.love} />
            <SectionCard icon="🌿" title="건강" body={fortune.sections.health} />
          </div>

          <div style={S.luckyRow}>
            {fortune.sections.luckyColor && (
              <div style={S.luckyItem}>
                <p style={S.luckyLabel}>행운의 색</p>
                <p style={S.luckyValue}>{fortune.sections.luckyColor}</p>
              </div>
            )}
            {fortune.sections.luckyNumber !== null &&
              fortune.sections.luckyNumber !== undefined && (
                <div style={S.luckyItem}>
                  <p style={S.luckyLabel}>행운의 숫자</p>
                  <p style={S.luckyValue}>{fortune.sections.luckyNumber}</p>
                </div>
              )}
          </div>
        </>
      )}
    </main>
  );
}

function SectionCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string | null | undefined;
}) {
  if (!body) return null;
  return (
    <section style={S.card}>
      <h2 style={S.h2}>
        {icon} {title}
      </h2>
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
  luckyRow: {
    display: "flex",
    gap: 12,
    marginTop: 16,
  },
  luckyItem: {
    flex: 1,
    padding: 16,
    border: "1px solid #ddd",
    borderRadius: 8,
    textAlign: "center" as const,
    background: "#fff",
  },
  luckyLabel: { fontSize: 12, color: "#666", margin: 0 },
  luckyValue: { fontSize: 20, fontWeight: 600, margin: "4px 0 0" },
} as const;
