import { signIn } from "@/auth";

const allowDevLogin = process.env.AUTH_ALLOW_DEV_LOGIN === "true";
const hasGoogle = !!(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export default function LoginPage() {
  return (
    <main style={{ padding: 32, fontFamily: "system-ui", maxWidth: 480 }}>
      <h1>Saju 로그인</h1>

      {hasGoogle && (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            style={{
              padding: "12px 16px",
              fontSize: 16,
              border: "1px solid #ccc",
              borderRadius: 8,
              cursor: "pointer",
              width: "100%",
              marginBottom: 12,
            }}
          >
            구글 계정으로 로그인
          </button>
        </form>
      )}

      {allowDevLogin && (
        <>
          <hr style={{ margin: "24px 0" }} />
          <h2 style={{ fontSize: 16 }}>Dev: 시드 사용자로 로그인</h2>
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
        </>
      )}
    </main>
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
        style={{
          padding: "10px 14px",
          fontSize: 14,
          border: "1px solid #aaa",
          borderRadius: 6,
          cursor: "pointer",
          width: "100%",
          marginBottom: 8,
          background: "#f5f5f5",
        }}
      >
        {name}로 로그인
      </button>
    </form>
  );
}
