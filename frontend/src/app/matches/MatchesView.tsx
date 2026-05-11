"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "urql";
import { graphql } from "@/gql";
import type { MatchStatus } from "@/gql/graphql";

const MATCHES_QUERY = graphql(`
  query Matches {
    matches {
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
      }
    }
  }
`);

const LIKE_MATCH = graphql(`
  mutation LikeMatch($matchId: ID!) {
    likeMatch(matchId: $matchId) {
      id
      status
      iLiked
      theyLiked
    }
  }
`);

const DISMISS_MATCH = graphql(`
  mutation DismissMatch($matchId: ID!) {
    dismissMatch(matchId: $matchId) {
      id
      status
    }
  }
`);

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

export function MatchesView() {
  const router = useRouter();
  const [{ data, fetching, error }, refetch] = useQuery({
    query: MATCHES_QUERY,
    requestPolicy: "cache-and-network",
  });
  const [, likeMatch] = useMutation(LIKE_MATCH);
  const [, dismissMatch] = useMutation(DISMISS_MATCH);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [matchedAlert, setMatchedAlert] = useState<string | null>(null);

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
        <h1>매칭 피드</h1>
        <p style={S.error}>오류: {error.message}</p>
      </main>
    );
  }

  const matches = data?.matches ?? [];

  const handleLike = async (matchId: string) => {
    setBusyId(matchId);
    setActionError(null);
    const result = await likeMatch({ matchId });
    setBusyId(null);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    if (result.data?.likeMatch.status === "matched") {
      setMatchedAlert(matchId);
    }
    await refetch({ requestPolicy: "network-only" });
  };

  const handleDismiss = async (matchId: string) => {
    setBusyId(matchId);
    setActionError(null);
    const result = await dismissMatch({ matchId });
    setBusyId(null);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    await refetch({ requestPolicy: "network-only" });
  };

  const activeMatches = matches.filter(
    (m) => m.status !== "dismissed" && m.status !== "expired",
  );

  return (
    <main style={S.main}>
      <h1>매칭 피드</h1>
      <p style={S.help}>
        사주로 풀어본 궁합 후보예요. 점수 높은 순으로 정렬되어 있어요.
      </p>

      {actionError && <p style={S.error}>{actionError}</p>}

      {matchedAlert && (
        <section
          style={{
            ...S.card,
            background: "#f0fdf4",
            borderColor: "#16a34a",
            marginBottom: 12,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: "#16a34a" }}>
            🎉 매칭 성사! 채팅방이 만들어졌어요.
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

      {matches.length === 0 ? (
        <section style={S.card}>
          <p>아직 매칭 후보가 없어요.</p>
          <Link href="/saju" style={S.primaryLink}>
            사주 입력하러 가기
          </Link>
        </section>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activeMatches.map((match) => {
            const meta = STATUS_META[match.status];
            const busy = busyId === match.id;
            const canAct =
              match.status === "suggested" || match.status === "liked";

            return (
              <article
                key={match.id}
                style={{ ...S.card, borderColor: meta.color }}
              >
                <header style={S.cardHeader}>
                  <div>
                    <h2 style={S.h2}>{match.partner.name}</h2>
                    <p style={S.help}>
                      <span
                        style={{
                          ...S.badge,
                          color: meta.color,
                          background: meta.bg,
                          borderColor: meta.color,
                        }}
                      >
                        {meta.label}
                      </span>
                      {match.theyLiked && match.status !== "matched" && (
                        <span style={{ ...S.badge, marginLeft: 6 }}>
                          상대가 먼저 좋아요!
                        </span>
                      )}
                    </p>
                  </div>
                  <div style={S.scoreBox}>
                    <p style={S.scoreLabel}>궁합 점수</p>
                    <p style={{ ...S.scoreValue, color: meta.color }}>
                      {match.score}
                    </p>
                  </div>
                </header>

                <div style={S.breakdownGrid}>
                  <Metric label="일간합" value={match.breakdown.ilganHap} />
                  <Metric
                    label="오행균형"
                    value={match.breakdown.fiveElementBalance}
                  />
                  <Metric
                    label="십신시너지"
                    value={match.breakdown.tenGodSynergy}
                  />
                  <Metric
                    label="지지관계"
                    value={match.breakdown.branchRelation}
                  />
                </div>

                <footer style={S.cardFooter}>
                  <Link href={`/matches/${match.id}`} style={S.linkBtn}>
                    상세 풀이 보기
                  </Link>
                  {canAct && (
                    <>
                      <button
                        type="button"
                        style={{
                          ...S.actionBtn,
                          background: "#16a34a",
                          color: "#fff",
                          opacity: busy || match.iLiked ? 0.5 : 1,
                        }}
                        disabled={busy || match.iLiked}
                        onClick={() => handleLike(match.id)}
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
                          opacity: busy ? 0.5 : 1,
                        }}
                        disabled={busy}
                        onClick={() => handleDismiss(match.id)}
                      >
                        거절
                      </button>
                    </>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}

      <p style={{ ...S.help, marginTop: 24 }}>
        <Link href="/" style={{ color: "#666" }}>
          ← 홈으로
        </Link>
      </p>
    </main>
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
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  h2: { fontSize: 18, marginTop: 0, marginBottom: 4 },
  badge: {
    display: "inline-block",
    padding: "2px 8px",
    fontSize: 11,
    border: "1px solid #ddd",
    borderRadius: 4,
    background: "#fff",
  },
  scoreBox: { textAlign: "right" as const },
  scoreLabel: { fontSize: 11, color: "#666", margin: 0 },
  scoreValue: {
    fontSize: 28,
    fontWeight: 700,
    margin: "2px 0 0",
    lineHeight: 1,
  },
  breakdownGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
    marginBottom: 12,
  },
  metric: {
    padding: 8,
    background: "#f9fafb",
    borderRadius: 6,
    textAlign: "center" as const,
  },
  metricLabel: { fontSize: 11, color: "#666", margin: 0 },
  metricValue: { fontSize: 14, fontWeight: 600, margin: "2px 0 0" },
  cardFooter: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  linkBtn: {
    padding: "6px 12px",
    border: "1px solid #000",
    borderRadius: 6,
    textDecoration: "none",
    color: "#000",
    background: "#fff",
    fontSize: 13,
    cursor: "pointer",
  },
  actionBtn: {
    padding: "6px 12px",
    border: "1px solid",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
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
