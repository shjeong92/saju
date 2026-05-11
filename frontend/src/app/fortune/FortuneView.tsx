"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "urql";
import { graphql } from "@/gql";
import {
  FORTUNE_SCORE_META,
  type FortuneScoreMeta,
} from "@/lib/fortune-score-meta";

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

  const fortune = data?.myDailyFortune;

  if (!fortune) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-8">
        <Header />
        <EmptyCard
          title="아직 사주를 입력하지 않으셨네요"
          description="사주를 입력하면 매일 새로운 운세를 받아볼 수 있어요."
          action={
            <Link
              href="/saju"
              className="inline-flex items-center justify-center rounded-md bg-vermilion-500 px-4 py-2 text-sm font-semibold text-white hover:bg-vermilion-600 transition-colors"
            >
              사주 입력하러 가기
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Header />
      <p className="mt-1 text-xs text-ink-500">
        {fortune.forDate as string}
      </p>

      {(fortune.status === "pending" || fortune.status === "generating") && (
        <ProgressCard
          title={fortune.status === "pending" ? "대기 중" : "운세 생성 중"}
          message="AI가 오늘의 운세를 작성하고 있어요."
        />
      )}

      {fortune.status === "failed" && (
        <section
          aria-label="운세 생성 실패"
          className="mt-4 rounded-lg border border-crimson-600/40 bg-crimson-50 p-4"
        >
          <h2 className="m-0 font-serif text-base text-crimson-600">
            운세 생성 실패
          </h2>
          <p className="mt-2 text-sm text-ink-700">
            잠시 후 다시 확인해 주세요.
          </p>
        </section>
      )}

      {fortune.status === "completed" && fortune.sections && (
        <>
          {fortune.score && (
            <ScorePanel
              meta={FORTUNE_SCORE_META[fortune.score]}
              summary={fortune.sections.summary}
            />
          )}

          <div className="mt-4 flex flex-col gap-3">
            <SectionCard icon="💼" title="일/공부" body={fortune.sections.work} />
            <SectionCard icon="❤️" title="연애" body={fortune.sections.love} />
            <SectionCard icon="🌿" title="건강" body={fortune.sections.health} />
          </div>

          {(fortune.sections.luckyColor ||
            fortune.sections.luckyNumber !== null) && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {fortune.sections.luckyColor && (
                <LuckyItem
                  label="행운의 색"
                  value={fortune.sections.luckyColor}
                />
              )}
              {fortune.sections.luckyNumber !== null &&
                fortune.sections.luckyNumber !== undefined && (
                  <LuckyItem
                    label="행운의 숫자"
                    value={String(fortune.sections.luckyNumber)}
                  />
                )}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Header() {
  return (
    <header>
      <p className="m-0 font-serif text-2xl text-vermilion-700 tracking-wide">
        運 <span className="text-ink-900">오늘의 운세</span>
      </p>
      <p className="mt-1 text-sm text-ink-500">
        매일 새로 풀이되는 사주 일진이에요.
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

function ProgressCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section
      aria-label={title}
      aria-live="polite"
      className="mt-4 rounded-lg border border-hanji-300 bg-hanji-50 p-4"
    >
      <h2 className="m-0 flex items-center gap-2 font-serif text-base text-ink-900">
        {title}
        <span aria-hidden className="flex gap-0.5">
          <span className="h-1 w-1 animate-pulse rounded-full bg-ink-400 [animation-delay:-0.32s]" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-ink-400 [animation-delay:-0.16s]" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-ink-400" />
        </span>
      </h2>
      <p className="mt-2 text-sm text-ink-600">{message}</p>
      <p className="mt-1 text-xs text-ink-500">자동 새로고침 중</p>
    </section>
  );
}

function ScorePanel({
  meta,
  summary,
}: {
  meta: FortuneScoreMeta;
  summary: string | null | undefined;
}) {
  return (
    <section
      aria-label={`오늘의 운세: ${meta.label}`}
      className={[
        "mt-4 rounded-lg border p-6 text-center shadow-[0_1px_2px_rgba(28,25,23,0.04)]",
        meta.ringClass,
      ].join(" ")}
    >
      <p className="m-0 text-xs text-ink-500">오늘의 운세</p>
      <p
        className={[
          "tabular mt-2 mb-2 font-serif text-4xl font-semibold leading-none",
          meta.toneClass,
        ].join(" ")}
      >
        {meta.label}
      </p>
      {summary && (
        <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">
          {summary}
        </p>
      )}
    </section>
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
    <section className="rounded-lg border border-ink-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      <h2 className="m-0 flex items-center gap-2 font-serif text-base text-ink-900">
        <span aria-hidden>{icon}</span>
        {title}
      </h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">
        {body}
      </p>
    </section>
  );
}

function LuckyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4 text-center shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      <p className="m-0 text-xs text-ink-500">{label}</p>
      <p className="mt-1 font-serif text-xl font-semibold text-vermilion-700">
        {value}
      </p>
    </div>
  );
}
