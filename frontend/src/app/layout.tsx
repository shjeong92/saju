import type { ReactNode } from "react";
import { auth } from "@/auth";
import { UrqlProvider } from "@/lib/urql/Provider";

export const metadata = {
  title: "Saju",
  description: "사주 기반 AI 매칭",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="ko">
      <body>
        <UrqlProvider accessToken={session?.accessToken}>
          {children}
        </UrqlProvider>
      </body>
    </html>
  );
}
