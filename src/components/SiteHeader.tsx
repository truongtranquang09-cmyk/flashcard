"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();

  if (/^\/decks\/[^/]+\/study(?:\/|$)/.test(pathname)) return null;

  return (
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
  );
}
