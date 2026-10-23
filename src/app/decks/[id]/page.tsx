import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { deleteCard } from "@/app/decks/[id]/actions";
import { CardFormModal } from "@/app/decks/[id]/CardFormModal";
import { Button, buttonClass } from "@/components/Button";
import { DeleteButton } from "@/components/DeleteButton";
import { SpeakButton } from "@/components/SpeakButton";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";
import { isUuid } from "@/lib/ids";

const PAGE_SIZE = 50;

type DeckPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default function DeckPage({ params, searchParams }: DeckPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Đang tải...</p>}>
      <DeckContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function DeckContent({ params, searchParams }: DeckPageProps) {
  const { id } = await params;
  const { page: pageParam, q: qParam } = await searchParams;

  if (!isUuid(id)) return <DeckNotFound />;

  const [deck] = await db
    .select({ id: decks.id, name: decks.name })
    .from(decks)
    .where(eq(decks.id, id));

  if (!deck) return <DeckNotFound />;

  const [{ total: deckCardCount }] = await db
    .select({ total: count() })
    .from(cards)
    .where(eq(cards.deckId, id));

  const q = (qParam ?? "").trim();
  const pattern = `%${q}%`;
  const whereClause = q
    ? and(
        eq(cards.deckId, id),
        or(
          ilike(cards.front, pattern),
          ilike(cards.reading, pattern),
          ilike(cards.back, pattern),
        ),
      )
    : eq(cards.deckId, id);

  const [{ total }] = await db
    .select({ total: count() })
    .from(cards)
    .where(whereClause);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const currentPage = Math.min(
    Math.max(Number.isNaN(parsedPage) ? 1 : parsedPage, 1),
    totalPages,
  );

  const deckCards = await db
    .select()
    .from(cards)
    .where(whereClause)
    .orderBy(desc(cards.createdAt), desc(cards.id))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-indigo-600">
          ← Về trang chủ
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-jp text-2xl font-bold text-slate-800">
            {deck.name}
            <span className="ml-2 align-middle text-sm font-normal text-slate-500">
              {deckCardCount} thẻ
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {deckCardCount > 0 && (
              <>
                <a
                  href={`/api/export?deckId=${deck.id}`}
                  className={`${buttonClass("primary")} px-3 py-1.5 text-xs`}
                >
                  Tải JSON
                </a>
                <a
                  href={`/api/export-excel?deckId=${deck.id}`}
                  className={`${buttonClass("excel")} px-3 py-1.5 text-xs`}
                >
                  Tải Excel
                </a>
              </>
            )}
            <CardFormModal deckId={deck.id} />
          </div>
        </div>
      </div>

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Tìm theo từ, cách đọc hoặc nghĩa..."
          aria-label="Tìm kiếm thẻ"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <Button type="submit" variant="secondary">
          Tìm
        </Button>
      </form>

      {q && (
        <p className="-mt-4 text-sm text-slate-500">
          Kết quả cho &quot;{q}&quot; ·{" "}
          <Link
            href={`/decks/${deck.id}`}
            className="text-indigo-600 hover:underline"
          >
            Xóa tìm kiếm
          </Link>
        </p>
      )}

      {deckCards.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">
            {q
              ? `Không tìm thấy thẻ nào khớp "${q}".`
              : "Deck này chưa có thẻ nào."}
          </p>
          {!q && (
            <p className="mt-1 text-sm text-slate-500">
              Bấm &quot;+ Thêm thẻ&quot; để tạo thẻ đầu tiên.
            </p>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {deckCards.map((card) => (
            <li
              key={card.id}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="grid flex-1 gap-1 sm:grid-cols-2 sm:gap-4">
                <div className="flex flex-wrap items-start gap-2">
                  <p className="font-jp text-lg font-semibold text-slate-800">
                    {card.reading?.trim() ? (
                      <ruby>
                        {card.front}
                        <rt className="text-xs font-normal text-slate-500">
                          {card.reading}
                        </rt>
                      </ruby>
                    ) : (
                      card.front
                    )}
                  </p>
                  <SpeakButton front={card.front} reading={card.reading} />
                </div>
                <p className="text-sm text-slate-600 sm:pt-1">{card.back}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <CardFormModal deckId={deck.id} card={card} />
                <DeleteButton
                  action={deleteCard.bind(null, card.id)}
                  confirmMessage={`Xóa thẻ "${card.front}"?`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
          {currentPage > 1 ? (
            <Link
              href={buildPageHref(deck.id, currentPage - 1, q)}
              className={buttonClass("secondary")}
            >
              ← Trước
            </Link>
          ) : (
            <span className={`${buttonClass("secondary")} opacity-50`}>
              ← Trước
            </span>
          )}
          <span>
            Trang {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link
              href={buildPageHref(deck.id, currentPage + 1, q)}
              className={buttonClass("secondary")}
            >
              Sau →
            </Link>
          ) : (
            <span className={`${buttonClass("secondary")} opacity-50`}>
              Sau →
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function buildPageHref(deckId: string, page: number, q: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return `/decks/${deckId}${query ? `?${query}` : ""}`;
}

function DeckNotFound() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <p className="text-slate-600">Deck không tồn tại hoặc đã bị xóa.</p>
      <Link href="/" className={`${buttonClass()} mt-4`}>
        Về trang chủ
      </Link>
    </div>
  );
}
