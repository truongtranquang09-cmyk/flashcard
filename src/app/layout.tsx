import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  title: "Flashcard tiếng Nhật",
  description:
    "Học từ vựng tiếng Nhật, đặc biệt kính ngữ và từ vựng công sở.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${notoSansJP.variable} h-full`}>
      <body className="min-h-full">
        <Suspense fallback={null}>
          <SiteHeader />
        </Suspense>
        <main className="mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
