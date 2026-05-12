import { signIn } from "@/auth";
import { GoogleLoginButton } from "./GoogleLoginButton";

const isProduction = process.env.NODE_ENV === "production";
const allowDevLogin =
  !isProduction && process.env.AUTH_ALLOW_DEV_LOGIN === "true";
const hasGoogle = !!(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export default function LoginPage() {
  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6 py-12">
      <span
        aria-hidden
        className="pointer-events-none absolute select-none font-serif text-[22rem] leading-none text-hanji-100"
      >
        緣
      </span>

      <div className="relative w-full max-w-sm">
        <header className="text-center">
          <p className="font-serif text-sm tracking-[0.4em] text-vermilion-700">
            四柱
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink-900">
            Saju
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            사주로 풀어보는
            <br />
            오늘의 운세와 인연.
          </p>
        </header>

        <div className="mt-10 space-y-4">
          {hasGoogle ? (
            <GoogleLoginButton />
          ) : (
            <p className="rounded-md border border-dashed border-hanji-300 bg-hanji-100 px-4 py-3 text-center text-xs text-ink-500">
              구글 로그인이 아직 준비 중이에요.
            </p>
          )}

          {allowDevLogin && <DevLoginSection />}
        </div>

        <p className="mt-10 text-center text-[11px] leading-relaxed text-ink-400">
          로그인하면 서비스 약관 및 개인정보 처리방침에
          <br />
          동의한 것으로 간주합니다.
        </p>
      </div>
    </main>
  );
}

function DevLoginSection() {
  return (
    <section className="mt-8 rounded-md border border-dashed border-hanji-300 bg-hanji-100/60 p-4">
      <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-widest text-ink-500">
        개발용 · Dev Only
      </p>
      <div className="space-y-2">
        <DevLoginButton
          providerId="test-alice-001"
          name="Alice"
          email="alice@test.local"
        />
        <DevLoginButton
          providerId="test-bob-001"
          name="Bob"
          email="bob@test.local"
        />
      </div>
    </section>
  );
}

function DevLoginButton({
  providerId,
  name,
  email,
}: {
  providerId: string;
  name: string;
  email: string;
}) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("dev-login", {
          providerId,
          name,
          email,
          redirectTo: "/",
        });
      }}
    >
      <button
        type="submit"
        className="w-full rounded-md border border-hanji-300 bg-white/60 px-4 py-2.5 text-sm text-ink-700 transition-colors hover:bg-white hover:text-ink-900"
      >
        {name}로 로그인
      </button>
    </form>
  );
}


