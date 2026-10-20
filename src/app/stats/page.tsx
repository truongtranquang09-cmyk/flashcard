import { count, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/db";
import { cards, reviewLogs } from "@/db/schema";

export const metadata: Metadata = {
  title: "Thống kê",
};

export default function StatsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Đang tải...</p>}>
      <StatsContent />
    </Suspense>
  );
}

async function StatsContent() {
  await connection();

  const [cardStats] = await db
    .select({
      total: count(),
      learned:
        sql<number>`count(case when ${cards.repetitions} > 0 then 1 end)`.mapWith(
          Number,
        ),
      due: sql<number>`count(case when ${cards.dueAt} <= now() then 1 end)`.mapWith(
        Number,
      ),
    })
    .from(cards);

  const [reviewStats] = await db
    .select({ total: count() })
    .from(reviewLogs)
    .where(sql`${reviewLogs.reviewedAt} >= now() - interval '24 hours'`);

  const items = [
    {
      key: "total",
      label: "Tổng số thẻ",
      hint: "Toàn bộ thẻ trong tất cả deck",
      value: cardStats.total,
    },
    {
      key: "learned",
      label: "Thẻ đã học",
      hint: "Đã ôn ít nhất một lần",
      value: cardStats.learned,
    },
    {
      key: "due",
      label: "Thẻ cần ôn",
      hint: "Đến hạn ôn tập",
      value: cardStats.due,
    },
    {
      key: "reviews",
      label: "Lượt ôn trong 24 giờ qua",
      hint: "Tính từ thời điểm hiện tại",
      value: reviewStats.total,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Thống kê</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tình hình học tập hiện tại của bạn.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <li
            key={item.key}
            data-stat={item.key}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <p
              data-stat-value
              className="text-3xl font-bold text-indigo-600"
            >
              {item.value}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {item.label}
            </p>
            <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
