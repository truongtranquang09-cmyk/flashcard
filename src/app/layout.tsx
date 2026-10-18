import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Link from "next/link";
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
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
            <Link
              href="/"
              className="font-jp text-base font-semibold text-slate-800 hover:text-indigo-600"
            >
              Flashcard 日本語
            </Link>
            <nav className="flex items-center gap-4 text-sm text-slate-600">
              <Link href="/" className="hover:text-indigo-600">
                Trang chủ
              </Link>
              <Link href="/stats" className="hover:text-indigo-600">
                Thống kê
              </Link>
              <Link href="/import-export" className="hover:text-indigo-600">
                Import/Export
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
