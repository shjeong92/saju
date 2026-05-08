import Link from "next/link";
import { auth, signOut } from "@/auth";

const navLink = {
  display: "inline-block",
  padding: "8px 12px",
  border: "1px solid #000",
  borderRadius: 6,
  textDecoration: "none",
  color: "#000",
} as const;

export default async function Home() {
  const session = await auth();

  return (
    <main style={{ padding: 32, fontFamily: "system-ui", maxWidth: 720 }}>
      <h1>Saju</h1>
      <p>사주 기반 AI 매칭. 곧 만나요.</p>

      {session?.user ? (
        <section
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          <h2 style={{ fontSize: 18, marginTop: 0 }}>로그인됨</h2>
          <p style={{ margin: "4px 0" }}>이름: {session.user.name}</p>
          <p style={{ margin: "4px 0" }}>이메일: {session.user.email ?? "(없음)"}</p>
          <p style={{ margin: "4px 0", fontSize: 12, color: "#666" }}>
            backend user id: {session.user.id ?? "(없음)"}
          </p>
          <p style={{ margin: "4px 0", fontSize: 12, color: "#666" }}>
            accessToken (앞 20자):{" "}
            {session.accessToken
              ? `${session.accessToken.slice(0, 20)}...`
              : "(없음)"}
          </p>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/saju" style={navLink}>사주 입력</Link>
            <Link href="/reading" style={navLink}>내 풀이</Link>
            <Link href="/fortune" style={navLink}>오늘의 운세</Link>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
            style={{ marginTop: 12 }}
          >
            <button
              type="submit"
              style={{
                padding: "8px 12px",
                border: "1px solid #aaa",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              로그아웃
            </button>
          </form>
        </section>
      ) : (
        <section style={{ marginTop: 24 }}>
          <Link
            href="/login"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              border: "1px solid #ccc",
              borderRadius: 6,
              textDecoration: "none",
              color: "#000",
            }}
          >
            로그인하기
          </Link>
        </section>
      )}
    </main>
  );
}
