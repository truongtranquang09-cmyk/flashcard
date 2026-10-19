import { count, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { deleteDeck } from "@/app/decks/actions";
import { DeckFormModal } from "@/app/decks/DeckFormModal";
import { buttonClass } from "@/components/Button";
import { DeleteButton } from "@/components/DeleteButton";
import { StudyButton } from "@/components/StudyButton";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Đang tải...</p>}>
      <DeckList />
    </Suspense>
  );
}

async function DeckList() {
  const deckRows = await db
    .select({
      id: decks.id,
      name: decks.name,
      cardCount: count(cards.id),
      dueCount: sql<number>`count(case when ${cards.dueAt} <= now() then 1 end)`.mapWith(
        Number,
      ),
    })
    .from(decks)
    .leftJoin(cards, eq(cards.deckId, decks.id))
    .groupBy(decks.id)
    .orderBy(desc(decks.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Deck của bạn</h1>
          <p className="mt-1 text-sm text-slate-500">
            {deckRows.length} deck
          </p>
        </div>
        <DeckFormModal />
      </div>

      {deckRows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">Bạn chưa có deck nào.</p>
          <p className="mt-1 text-sm text-slate-500">
            Bấm &quot;+ Deck mới&quot; để bắt đầu.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {deckRows.map((deck) => (
            <li
              key={deck.id}
              className="relative flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-md"
            >
              <div>
                <h2 className="font-jp text-lg font-semibold text-slate-800">
                  <Link
                    href={`/decks/${deck.id}`}
                    className="after:absolute after:inset-0 hover:text-indigo-600 focus-visible:underline focus-visible:outline-none"
                  >
                    {deck.name}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {deck.cardCount} thẻ · {deck.dueCount} đến hạn
                </p>
              </div>
              <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2">
                {deck.dueCount > 0 ? (
                  <StudyButton
                    deckId={deck.id}
                    className={buttonClass("primary")}
                  >
                    Học ngay
                  </StudyButton>
                ) : (
                  <span
                    aria-disabled="true"
                    className={`${buttonClass("primary")} cursor-not-allowed opacity-50`}
                  >
                    Học ngay
                  </span>
                )}
                <DeckFormModal deck={{ id: deck.id, name: deck.name }} />
                <DeleteButton
                  action={deleteDeck.bind(null, deck.id)}
                  confirmMessage={`Xóa deck "${deck.name}" và toàn bộ thẻ bên trong?`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
