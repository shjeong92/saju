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

  const reading = data?.myReading;

  if (!reading) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-8">
        <Header />
        <EmptyCard
          title="아직 사주를 입력하지 않으셨네요"
          description="사주를 입력하면 AI가 당신의 운명을 풀어드려요."
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
      <p className="mt-1 text-xs text-ink-500">버전: {reading.version}</p>

      {reading.status === "pending" && (
        <ProgressCard
          title="대기 중"
          message="AI 풀이 생성을 곧 시작합니다."
        />
      )}

      {reading.status === "generating" && (
        <ProgressCard
          title="풀이 생성 중"
          message="AI가 당신의 사주를 풀이하고 있어요. 보통 30초 정도 걸려요."
        />
      )}

      {reading.status === "failed" && (
        <section
          aria-label="사주 풀이 생성 실패"
          className="mt-4 rounded-lg border border-crimson-600/40 bg-crimson-50 p-4"
        >
          <h2 className="m-0 font-serif text-base text-crimson-600">
            풀이 생성 실패
          </h2>
          <p className="mt-2 text-sm text-ink-700">
            {reading.errorMessage ?? "알 수 없는 오류가 발생했어요."}
          </p>
          <p className="mt-3 text-xs text-ink-500">
            <Link
              href="/saju"
              className="text-crimson-600 underline underline-offset-2 hover:text-crimson-600/80"
            >
              사주 다시 입력
            </Link>
            하시면 자동으로 재시도됩니다.
          </p>
        </section>
      )}

      {reading.status === "completed" && reading.sections && (
        <div className="mt-4 flex flex-col gap-3">
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
        <p className="mt-4 text-sm text-crimson-600">
          풀이가 완료됐지만 데이터가 비어있어요.
        </p>
      )}
    </main>
  );
}

function Header() {
  return (
    <header>
      <p className="m-0 font-serif text-2xl text-vermilion-700 tracking-wide">
        占 <span className="text-ink-900">사주 풀이</span>
      </p>
      <p className="mt-1 text-sm text-ink-500">
        당신의 사주를 AI가 풀어 드려요.
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
  const isCaution = tone === "caution";
  return (
    <section
      className={[
        "rounded-lg border p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)]",
        isCaution
          ? "border-amber-600/40 bg-amber-50"
          : "border-ink-200 bg-white",
      ].join(" ")}
    >
      <h2
        className={[
          "m-0 font-serif text-base",
          isCaution ? "text-amber-600" : "text-ink-900",
        ].join(" ")}
      >
        {title}
      </h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">
        {body}
      </p>
    </section>
  );
}
