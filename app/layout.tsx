// 🚀 [복구] app/layout.tsx (Next.js 프론트엔드 글로벌 뼈대)
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "이슈큐레이터 | 스트리머 실시간 이슈 워크스페이스",
  description: "국내 10대 커뮤니티 실시간 화력 레이더 및 1클릭 쇼츠 대본 생성기",
};

export const viewport: Viewport = {
  themeColor: "#0B0E14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-[#0B0E14] text-slate-100 antialiased min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}