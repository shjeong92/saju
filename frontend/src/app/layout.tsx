import type { ReactNode } from "react";
import { auth } from "@/auth";
import { UrqlProvider } from "@/lib/urql/Provider";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

export const metadata = {
  title: "Saju · 사주 기반 매칭",
  description: "사주로 풀어보는 오늘의 운세와 인연. 사주 기반 AI 매칭.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="ko">
      <body className="pb-20">
        <UrqlProvider accessToken={session?.accessToken}>
          {children}
          {session?.user && <BottomNav />}
        </UrqlProvider>
      </body>
    </html>
  );
}
