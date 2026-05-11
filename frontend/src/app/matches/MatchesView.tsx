"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "urql";
import { graphql } from "@/gql";
import type { MatchStatus } from "@/gql/graphql";

const HAS_SAJU_QUERY = graphql(`
  query MatchesPageHasSaju {
    myReading {
      id
    }
  }
`);

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

type StatusMeta = {
  label: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
};

const STATUS_META: Record<MatchStatus, StatusMeta> = {
  suggested: {
    label: "추천",
    textClass: "text-vermilion-700",
    bgClass: "bg-vermilion-50",
    borderClass: "border-vermilion-200",
  },
  liked: {
    label: "좋아요 보냄",
    textClass: "text-amber-600",
    bgClass: "bg-hanji-100",
    borderClass: "border-hanji-300",
  },
  matched: {
    label: "매칭 성사",
    textClass: "text-jade-600",
    bgClass: "bg-hanji-50",
    borderClass: "border-jade-600",
  },
  dismissed: {
    label: "거절함",
    textClass: "text-ink-500",
    bgClass: "bg-ink-50",
    borderClass: "border-ink-200",
  },
  expired: {
    label: "만료",
    textClass: "text-ink-500",
    bgClass: "bg-ink-50",
    borderClass: "border-ink-200",
  },
};

export function MatchesView() {
  const router = useRouter();
  const [{ data, fetching, error }, refetch] = useQuery({
    query: MATCHES_QUERY,
    requestPolicy: "cache-and-network",
  });
  const [{ data: sajuData }] = useQuery({
    query: HAS_SAJU_QUERY,
    requestPolicy: "cache-and-network",
  });
  const hasSaju = !!sajuData?.myReading;
  const [, likeMatch] = useMutation(LIKE_MATCH);
  const [, dismissMatch] = useMutation(DISMISS_MATCH);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [matchedAlert, setMatchedAlert] = useState<string | null>(null);

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
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Header />

      {actionError && (
        <p className="mt-3 text-sm text-crimson-600">{actionError}</p>
      )}

      {matchedAlert && (
        <section className="mt-4 rounded-lg border border-jade-600 bg-hanji-50 p-4">
          <p className="m-0 font-semibold text-jade-600">
            🎉 매칭 성사! 채팅방이 만들어졌어요.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 rounded-md border border-jade-600 bg-white px-3 py-1.5 text-sm text-jade-600 hover:bg-jade-600 hover:text-white transition-colors"
            onClick={() => router.push("/chat")}
          >
            채팅방 보러 가기 →
          </button>
        </section>
      )}

      {matches.length === 0 ? (
        hasSaju ? (
          <EmptyCard
            title="아직 추천할 인연이 없어요"
            description="사주를 등록한 다른 사용자와 매일 새로운 후보가 추가됩니다. 잠시 후 다시 확인해 주세요."
          />
        ) : (
          <EmptyCard
            title="먼저 사주를 입력해 주세요"
            description="사주를 입력해야 궁합 후보를 추천해 드릴 수 있어요."
            action={
              <Link
                href="/saju"
                className="inline-flex items-center justify-center rounded-md bg-vermilion-500 px-4 py-2 text-sm font-semibold text-white hover:bg-vermilion-600 transition-colors"
              >
                사주 입력하러 가기
              </Link>
            }
          />
        )
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {activeMatches.map((match) => {
            const meta = STATUS_META[match.status];
            const busy = busyId === match.id;
            const canAct =
              match.status === "suggested" || match.status === "liked";

            return (
              <article
                key={match.id}
                className="rounded-lg border border-ink-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)]"
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="m-0 truncate font-serif text-xl text-ink-900">
                        {match.partner.name}
                      </h2>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.textClass} ${meta.bgClass} ${meta.borderClass}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    {match.theyLiked && match.status !== "matched" && (
                      <p className="mt-1 text-[12px] text-vermilion-700">
                        💌 상대가 먼저 좋아요를 보냈어요
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="m-0 text-[11px] text-ink-500">궁합</p>
                    <p className="tabular m-0 mt-0.5 font-serif text-4xl font-semibold text-vermilion-700 leading-none">
                      {match.score}
                      <span className="ml-0.5 text-sm font-normal text-ink-400">
                        /100
                      </span>
                    </p>
                  </div>
                </header>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Gauge label="일간합" value={match.breakdown.ilganHap} />
                  <Gauge
                    label="오행균형"
                    value={match.breakdown.fiveElementBalance}
                  />
                  <Gauge
                    label="십신시너지"
                    value={match.breakdown.tenGodSynergy}
                  />
                  <Gauge
                    label="지지관계"
                    value={match.breakdown.branchRelation}
                  />
                </div>

                <footer className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/matches/${match.id}`}
                    className="inline-flex items-center rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
                  >
                    상세 풀이 보기 →
                  </Link>
                  {canAct && (
                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-500 hover:bg-ink-50 disabled:opacity-50 transition-colors"
                        disabled={busy}
                        onClick={() => handleDismiss(match.id)}
                      >
                        거절
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md bg-vermilion-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-vermilion-600 disabled:opacity-50 transition-colors"
                        disabled={busy || match.iLiked}
                        onClick={() => handleLike(match.id)}
                      >
                        {match.iLiked ? "💚 보냄" : "💚 좋아요"}
                      </button>
                    </div>
                  )}
                </footer>
              </article>
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
        緣 <span className="text-ink-900">매칭 피드</span>
      </p>
      <p className="mt-1 text-sm text-ink-500">
        사주로 풀어본 궁합 후보예요. 점수 높은 순으로 정렬됩니다.
      </p>
    </header>
  );
}

function EmptyCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="mt-4 rounded-lg border border-dashed border-hanji-300 bg-hanji-50 p-6 text-center">
      <p className="m-0 font-serif text-lg text-ink-900">{title}</p>
      <p className="mt-2 text-sm text-ink-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}

const GAUGE_MAX = 25;

function Gauge({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, (value / GAUGE_MAX) * 100));
  const tone =
    value >= 18
      ? "bg-jade-600"
      : value >= 12
        ? "bg-vermilion-500"
        : value >= 6
          ? "bg-amber-600"
          : "bg-ink-400";

  return (
    <div className="flex items-center gap-2.5">
      <span className="w-16 shrink-0 text-[12px] text-ink-600">{label}</span>
      <div
        className="relative h-2 flex-1 overflow-hidden rounded-full bg-hanji-200"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={GAUGE_MAX}
      >
        <div
          className={`h-full rounded-full ${tone} transition-[width] duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular w-9 shrink-0 text-right text-[12px] font-semibold text-ink-700">
        {value.toFixed(1)}
      </span>
    </div>
  );
}
