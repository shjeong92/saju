"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "urql";
import { graphql } from "@/gql";
import type { MatchStatus } from "@/gql/graphql";

const MATCH_DETAIL = graphql(`
  query MatchDetail($id: ID!) {
    match(id: $id) {
      id
      score
      status
      iLiked
      theyLiked
      partner {
        id
        name
        imageUrl
      }
      breakdown {
        ilganHap
        fiveElementBalance
        tenGodSynergy
        branchRelation
        notes
      }
      compatibilityReport {
        id
        status
        score
        errorMessage
        completedAt
        summary {
          overall
          strengths
          cautions
          firstDateIdeas
          conversationStarters
        }
      }
    }
  }
`);

const LIKE_MATCH = graphql(`
  mutation LikeMatchDetail($matchId: ID!) {
    likeMatch(matchId: $matchId) {
      id
      status
      iLiked
      theyLiked
    }
  }
`);

const DISMISS_MATCH = graphql(`
  mutation DismissMatchDetail($matchId: ID!) {
    dismissMatch(matchId: $matchId) {
      id
      status
    }
  }
`);

const POLL_INTERVAL_MS = 5000;

const STATUS_META = {
  suggested: { label: "추천", color: "#2563eb", bg: "#eff6ff" },
  liked: { label: "좋아요 보냄", color: "#d97706", bg: "#fffbeb" },
  matched: { label: "매칭 성사!", color: "#16a34a", bg: "#f0fdf4" },
  dismissed: { label: "거절함", color: "#6b7280", bg: "#f9fafb" },
  expired: { label: "만료", color: "#6b7280", bg: "#f9fafb" },
} as const satisfies Record<
  MatchStatus,
  { label: string; color: string; bg: string }
>;

export function MatchDetailView({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [{ data, fetching, error }, refetch] = useQuery({
    query: MATCH_DETAIL,
    variables: { id: matchId },
    requestPolicy: "cache-and-network",
  });
  const [, likeMatch] = useMutation(LIKE_MATCH);
  const [, dismissMatch] = useMutation(DISMISS_MATCH);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const reportStatus = data?.match?.compatibilityReport?.status;
  const isReportInProgress =
    reportStatus === "pending" || reportStatus === "generating";

  useEffect(() => {
    if (!isReportInProgress) return;
    const id = setInterval(() => {
      refetch({ requestPolicy: "network-only" });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isReportInProgress, refetch]);

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
        <h1>매칭 상세</h1>
        <p style={S.error}>오류: {error.message}</p>
        <BackLink />
      </main>
    );
  }

  const match = data?.match;
  if (!match) {
    return (
      <main style={S.main}>
        <h1>매칭 상세</h1>
        <p>매칭을 찾을 수 없어요.</p>
        <BackLink />
      </main>
    );
  }

  const meta = STATUS_META[match.status];
  const canAct = match.status === "suggested" || match.status === "liked";

  const handleLike = async () => {
    setActionBusy(true);
    setActionError(null);
    const result = await likeMatch({ matchId });
    setActionBusy(false);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    await refetch({ requestPolicy: "network-only" });
  };

  const handleDismiss = async () => {
    setActionBusy(true);
    setActionError(null);
    const result = await dismissMatch({ matchId });
    setActionBusy(false);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    await refetch({ requestPolicy: "network-only" });
  };

  return (
    <main style={S.main}>
      <BackLink />

      <section
        style={{
          ...S.heroCard,
          background: meta.bg,
          borderColor: meta.color,
        }}
      >
        <p style={S.help}>{meta.label}</p>
        <h1 style={S.heroName}>{match.partner.name}</h1>
        <p style={{ ...S.heroScoreLabel }}>궁합 점수</p>
        <p style={{ ...S.heroScore, color: meta.color }}>{match.score}</p>
      </section>

      {match.status === "matched" && (
        <section
          style={{
            ...S.card,
            background: "#f0fdf4",
            borderColor: "#16a34a",
            marginBottom: 12,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: "#16a34a" }}>
            🎉 매칭 성사! 채팅방에서 대화를 시작해보세요.
          </p>
          <button
            type="button"
            style={{ ...S.linkBtn, marginTop: 8 }}
            onClick={() => router.push("/chat")}
          >
            채팅방 보러 가기 →
          </button>
        </section>
      )}

      <section style={S.card}>
        <h2 style={S.h2}>점수 세부</h2>
        <div style={S.breakdownGrid}>
          <Metric label="일간합" value={match.breakdown.ilganHap} />
          <Metric label="오행균형" value={match.breakdown.fiveElementBalance} />
          <Metric label="십신시너지" value={match.breakdown.tenGodSynergy} />
          <Metric label="지지관계" value={match.breakdown.branchRelation} />
        </div>
        {match.breakdown.notes.length > 0 && (
          <ul style={S.notesList}>
            {match.breakdown.notes.map((note, i) => (
              <li key={`${note}-${i}`} style={S.notesItem}>
                {note}
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 style={{ ...S.h2, marginTop: 24 }}>AI 궁합 풀이</h2>

      {!match.compatibilityReport && (
        <section style={S.card}>
          <p style={S.help}>아직 풀이가 준비되지 않았어요.</p>
        </section>
      )}

      {match.compatibilityReport?.status === "pending" && (
        <ProgressCard title="대기 중" message="곧 AI가 풀이를 시작해요. (자동 새로고침)" />
      )}

      {match.compatibilityReport?.status === "generating" && (
        <ProgressCard
          title="풀이 생성 중"
          message="AI가 두 분의 사주를 비교하고 있어요. 보통 30초 정도 걸려요. (자동 새로고침)"
        />
      )}

      {match.compatibilityReport?.status === "failed" && (
        <section style={{ ...S.card, borderColor: "#fcc", background: "#fff5f5" }}>
          <h3 style={S.h3}>풀이 생성 실패</h3>
          <p style={S.error}>
            {match.compatibilityReport.errorMessage ?? "알 수 없는 오류"}
          </p>
        </section>
      )}

      {match.compatibilityReport?.status === "completed" &&
        match.compatibilityReport.summary && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {match.compatibilityReport.summary.overall && (
              <SectionCard
                title="총평"
                body={match.compatibilityReport.summary.overall}
              />
            )}
            <ListCard
              icon="💪"
              title="강점"
              items={match.compatibilityReport.summary.strengths}
            />
            <ListCard
              icon="⚠️"
              title="주의할 점"
              items={match.compatibilityReport.summary.cautions}
              tone="caution"
            />
            <ListCard
              icon="🍽️"
              title="첫 데이트 아이디어"
              items={match.compatibilityReport.summary.firstDateIdeas}
            />
            <ListCard
              icon="💬"
              title="대화 주제"
              items={match.compatibilityReport.summary.conversationStarters}
            />
          </div>
        )}

      {actionError && <p style={{ ...S.error, marginTop: 12 }}>{actionError}</p>}

      {canAct && (
        <div style={S.actionRow}>
          <button
            type="button"
            style={{
              ...S.actionBtn,
              background: "#16a34a",
              color: "#fff",
              opacity: actionBusy || match.iLiked ? 0.5 : 1,
            }}
            disabled={actionBusy || match.iLiked}
            onClick={handleLike}
          >
            {match.iLiked ? "좋아요 보냄" : "💚 좋아요"}
          </button>
          <button
            type="button"
            style={{
              ...S.actionBtn,
              background: "#fff",
              color: "#6b7280",
              borderColor: "#d1d5db",
              opacity: actionBusy ? 0.5 : 1,
            }}
            disabled={actionBusy}
            onClick={handleDismiss}
          >
            거절
          </button>
        </div>
      )}
    </main>
  );
}

function BackLink() {
  return (
    <p style={S.help}>
      <Link href="/matches" style={{ color: "#666" }}>
        ← 매칭 피드로
      </Link>
    </p>
  );
}

function ProgressCard({ title, message }: { title: string; message: string }) {
  return (
    <section style={S.card}>
      <h3 style={S.h3}>⏳ {title}</h3>
      <p style={S.help}>{message}</p>
    </section>
  );
}

function SectionCard({ title, body }: { title: string; body: string }) {
  return (
    <section style={S.card}>
      <h3 style={S.h3}>{title}</h3>
      <p style={S.body}>{body}</p>
    </section>
  );
}

function ListCard({
  icon,
  title,
  items,
  tone,
}: {
  icon: string;
  title: string;
  items: readonly string[];
  tone?: "caution";
}) {
  if (items.length === 0) return null;
  return (
    <section
      style={{
        ...S.card,
        borderColor: tone === "caution" ? "#fdb" : "#ddd",
        background: tone === "caution" ? "#fff8ee" : "#fff",
      }}
    >
      <h3 style={S.h3}>
        {icon} {title}
      </h3>
      <ul style={S.list}>
        {items.map((item, i) => (
          <li key={`${item.slice(0, 16)}-${i}`} style={S.listItem}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={S.metric}>
      <p style={S.metricLabel}>{label}</p>
      <p style={S.metricValue}>{value.toFixed(1)}</p>
    </div>
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
  heroCard: {
    padding: 24,
    border: "1px solid",
    borderRadius: 12,
    textAlign: "center" as const,
    marginBottom: 16,
  },
  heroName: { fontSize: 28, margin: "8px 0" },
  heroScoreLabel: { fontSize: 12, color: "#666", margin: "12px 0 0" },
  heroScore: { fontSize: 56, fontWeight: 700, margin: "4px 0 0", lineHeight: 1 },
  h2: { fontSize: 18, marginTop: 0, marginBottom: 12 },
  h3: { fontSize: 15, marginTop: 0, marginBottom: 8 },
  body: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap" as const,
  },
  breakdownGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
  },
  metric: {
    padding: 12,
    background: "#f9fafb",
    borderRadius: 6,
    textAlign: "center" as const,
  },
  metricLabel: { fontSize: 11, color: "#666", margin: 0 },
  metricValue: { fontSize: 16, fontWeight: 600, margin: "4px 0 0" },
  notesList: {
    marginTop: 12,
    marginBottom: 0,
    paddingLeft: 20,
  },
  notesItem: { fontSize: 13, color: "#444", lineHeight: 1.6 },
  list: { margin: 0, paddingLeft: 20 },
  listItem: { fontSize: 14, lineHeight: 1.7, marginBottom: 4 },
  actionRow: {
    display: "flex",
    gap: 8,
    marginTop: 24,
  },
  actionBtn: {
    flex: 1,
    padding: "12px 16px",
    border: "1px solid",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  linkBtn: {
    padding: "6px 12px",
    border: "1px solid #16a34a",
    borderRadius: 6,
    color: "#16a34a",
    background: "#fff",
    fontSize: 13,
    cursor: "pointer",
  },
} as const;
