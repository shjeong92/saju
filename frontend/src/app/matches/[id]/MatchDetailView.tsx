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
        displayName
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
const GAUGE_MAX = 25;

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
      <main className="mx-auto max-w-2xl px-5 py-8">
        <p className="text-sm text-ink-500">불러오는 중...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-8">
        <BackLink />
        <p className="mt-4 text-sm text-crimson-600">오류: {error.message}</p>
      </main>
    );
  }

  const match = data?.match;
  if (!match) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-8">
        <BackLink />
        <p className="mt-4 text-sm text-ink-500">매칭을 찾을 수 없어요.</p>
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
    <>
      <main
        className={`mx-auto max-w-2xl px-5 py-6 ${canAct ? "pb-32" : "pb-8"}`}
      >
        <BackLink />

        <section
          className={`mt-3 rounded-xl border ${meta.borderClass} ${meta.bgClass} p-6 text-center`}
        >
          <span
            className={`inline-flex items-center rounded-full border bg-white/70 px-2.5 py-0.5 text-[11px] font-medium ${meta.textClass} ${meta.borderClass}`}
          >
            {meta.label}
          </span>
          <h1 className="mt-3 mb-0 font-serif text-3xl text-ink-900">
            {match.partner.displayName}
          </h1>
          <p className="mt-4 mb-0 text-[11px] text-ink-500">궁합 점수</p>
          <p
            className={`tabular m-0 mt-1 font-serif text-6xl font-semibold leading-none ${meta.textClass}`}
          >
            {match.score}
            <span className="ml-1 align-middle text-base font-normal text-ink-400">
              / 100
            </span>
          </p>
        </section>

        {match.status === "matched" && (
          <section className="mt-3 rounded-lg border border-jade-600 bg-hanji-50 p-4">
            <p className="m-0 font-semibold text-jade-600">
              🎉 매칭 성사! 채팅방에서 대화를 시작해보세요.
            </p>
            <button
              type="button"
              className="mt-3 inline-flex items-center rounded-md border border-jade-600 bg-white px-3 py-1.5 text-sm text-jade-600 hover:bg-jade-600 hover:text-white transition-colors"
              onClick={() => router.push("/chat")}
            >
              채팅방 보러 가기 →
            </button>
          </section>
        )}

        <section className="mt-4 rounded-lg border border-ink-200 bg-white p-5">
          <h2 className="m-0 mb-4 font-serif text-lg text-ink-900">점수 세부</h2>
          <div className="flex flex-col gap-3">
            <Gauge label="일간합" value={match.breakdown.ilganHap} />
            <Gauge
              label="오행균형"
              value={match.breakdown.fiveElementBalance}
            />
            <Gauge label="십신시너지" value={match.breakdown.tenGodSynergy} />
            <Gauge label="지지관계" value={match.breakdown.branchRelation} />
          </div>
          {match.breakdown.notes.length > 0 && (
            <ul className="mt-4 mb-0 list-disc space-y-1 pl-5">
              {match.breakdown.notes.map((note, i) => (
                <li
                  key={`${note}-${i}`}
                  className="text-[13px] leading-relaxed text-ink-600"
                >
                  {note}
                </li>
              ))}
            </ul>
          )}
        </section>

        <h2 className="mt-6 mb-3 font-serif text-lg text-ink-900">
          AI 궁합 풀이
        </h2>

        {!match.compatibilityReport && (
          <section className="rounded-lg border border-dashed border-hanji-300 bg-hanji-50 p-4">
            <p className="m-0 text-sm text-ink-500">
              아직 풀이가 준비되지 않았어요.
            </p>
          </section>
        )}

        {match.compatibilityReport?.status === "pending" && (
          <ProgressCard
            title="대기 중"
            message="곧 AI가 풀이를 시작해요. (자동 새로고침)"
          />
        )}

        {match.compatibilityReport?.status === "generating" && (
          <ProgressCard
            title="풀이 생성 중"
            message="AI가 두 분의 사주를 비교하고 있어요. 보통 30초 정도 걸려요."
          />
        )}

        {match.compatibilityReport?.status === "failed" && (
          <section className="rounded-lg border border-crimson-600/30 bg-white p-4">
            <h3 className="m-0 mb-2 text-base font-semibold text-crimson-600">
              풀이 생성 실패
            </h3>
            <p className="m-0 text-sm text-crimson-600">
              {match.compatibilityReport.errorMessage ?? "알 수 없는 오류"}
            </p>
          </section>
        )}

        {match.compatibilityReport?.status === "completed" &&
          match.compatibilityReport.summary && (
            <div className="flex flex-col gap-3">
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
                tone="strength"
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
                tone="idea"
              />
              <ListCard
                icon="💬"
                title="대화 주제"
                items={match.compatibilityReport.summary.conversationStarters}
                tone="neutral"
              />
            </div>
          )}

        {actionError && (
          <p className="mt-3 text-sm text-crimson-600">{actionError}</p>
        )}
      </main>

      {canAct && (
        <div className="fixed inset-x-0 bottom-20 z-30 border-t border-ink-200 bg-hanji-50/95 px-5 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl gap-2">
            <button
              type="button"
              className="flex-1 rounded-md border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-500 hover:bg-ink-50 disabled:opacity-50 transition-colors"
              disabled={actionBusy}
              onClick={handleDismiss}
            >
              거절
            </button>
            <button
              type="button"
              className="flex-[2] rounded-md bg-vermilion-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-vermilion-600 disabled:opacity-50 transition-colors"
              disabled={actionBusy || match.iLiked}
              onClick={handleLike}
            >
              {match.iLiked ? "💚 좋아요 보냄" : "💚 좋아요"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function BackLink() {
  return (
    <Link
      href="/matches"
      className="inline-flex items-center text-sm text-ink-500 hover:text-ink-700 transition-colors"
    >
      ← 매칭 피드로
    </Link>
  );
}

function ProgressCard({ title, message }: { title: string; message: string }) {
  return (
    <section className="rounded-lg border border-ink-200 bg-white p-4">
      <h3 className="m-0 mb-1 flex items-center gap-2 text-base font-semibold text-ink-900">
        <span aria-hidden className="flex gap-0.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-vermilion-500 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-vermilion-500 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-vermilion-500 [animation-delay:300ms]" />
        </span>
        {title}
      </h3>
      <p className="m-0 text-sm text-ink-500">{message}</p>
    </section>
  );
}

function SectionCard({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-lg border border-ink-200 bg-white p-4">
      <h3 className="m-0 mb-2 font-serif text-base text-ink-900">{title}</h3>
      <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
        {body}
      </p>
    </section>
  );
}

const LIST_TONE = {
  strength: {
    border: "border-jade-600/30",
    bg: "bg-hanji-50",
    title: "text-jade-600",
  },
  caution: {
    border: "border-amber-600/30",
    bg: "bg-vermilion-50",
    title: "text-amber-600",
  },
  idea: {
    border: "border-vermilion-200",
    bg: "bg-vermilion-50",
    title: "text-vermilion-700",
  },
  neutral: {
    border: "border-ink-200",
    bg: "bg-white",
    title: "text-ink-900",
  },
} as const;

function ListCard({
  icon,
  title,
  items,
  tone,
}: {
  icon: string;
  title: string;
  items: readonly string[];
  tone: keyof typeof LIST_TONE;
}) {
  if (items.length === 0) return null;
  const t = LIST_TONE[tone];
  return (
    <section className={`rounded-lg border ${t.border} ${t.bg} p-4`}>
      <h3
        className={`m-0 mb-2 flex items-center gap-1.5 font-serif text-base ${t.title}`}
      >
        <span aria-hidden>{icon}</span>
        {title}
      </h3>
      <ul className="m-0 list-disc space-y-1.5 pl-5">
        {items.map((item, i) => (
          <li
            key={`${item.slice(0, 16)}-${i}`}
            className="text-sm leading-relaxed text-ink-700"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

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
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[13px] text-ink-600">{label}</span>
      <div
        className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-hanji-200"
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
      <span className="tabular w-10 shrink-0 text-right text-[13px] font-semibold text-ink-700">
        {value.toFixed(1)}
      </span>
    </div>
  );
}
