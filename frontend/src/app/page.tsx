import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto max-w-3xl px-6 pt-12 pb-8">
      <header className="mb-8">
        <p className="font-serif text-sm tracking-[0.3em] text-vermilion-700">
          四柱
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900">
          Saju
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          사주로 풀어보는 오늘의 운세와 인연.
        </p>
      </header>

      {session?.user ? (
        <section className="rounded-lg border border-hanji-200 bg-white p-5">
          <p className="text-xs text-ink-500">반갑습니다</p>
          <p className="mt-1 text-lg font-semibold text-ink-900">
            {session.user.name} 님
          </p>
          {session.user.email && (
            <p className="mt-0.5 text-xs text-ink-400">{session.user.email}</p>
          )}

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
            className="mt-4"
          >
            <button
              type="submit"
              className="text-xs text-ink-500 underline-offset-2 hover:underline"
            >
              로그아웃
            </button>
          </form>
        </section>
      ) : (
        <section>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-vermilion-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-vermilion-700"
          >
            시작하기
          </Link>
        </section>
      )}
    </main>
  );
}
