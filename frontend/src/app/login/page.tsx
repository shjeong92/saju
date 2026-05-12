import { signIn } from "@/auth";

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
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-md bg-vermilion-500 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-vermilion-700 active:bg-vermilion-700"
              >
                <GoogleLogo />
                구글 계정으로 시작
              </button>
            </form>
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

function GoogleLogo() {
  return (
    <span
      aria-hidden
      className="flex h-5 w-5 items-center justify-center rounded-full bg-white"
    >
      <svg viewBox="0 0 18 18" className="h-3.5 w-3.5">
        <path
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
          fill="#4285F4"
        />
        <path
          d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
          fill="#34A853"
        />
        <path
          d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
          fill="#FBBC05"
        />
        <path
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
          fill="#EA4335"
        />
      </svg>
    </span>
  );
}
