import type { ReactNode } from "react";

export const metadata = {
  title: "Saju",
  description: "사주 기반 AI 매칭",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
