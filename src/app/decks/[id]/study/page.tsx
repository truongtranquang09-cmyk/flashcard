import { and, asc, eq, lte } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { StudySession } from "@/app/decks/[id]/study/StudySession";
import { buttonClass } from "@/components/Button";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";
import { isUuid } from "@/lib/ids";
import { shuffle } from "@/lib/shuffle";

type StudyPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string }>;
};

export default function StudyPage({ params, searchParams }: StudyPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Đang tải...</p>}>
      <StudyContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function StudyContent({ params, searchParams }: StudyPageProps) {
  await connection();

  const { id } = await params;
  const { session } = await searchParams;
  const now = new Date();

  if (!isUuid(id)) return <StudyNotice />;

  const [deck] = await db
    .select({ id: decks.id })
    .from(decks)
    .where(eq(decks.id, id));

  if (!deck) {
    return (
      <StudyNotice
        message="Deck không tồn tại hoặc đã bị xóa."
        href="/"
        linkLabel="Về trang chủ"
      />
    );
  }

  const dueCards = await db
    .select({
      id: cards.id,
      front: cards.front,
      reading: cards.reading,
      back: cards.back,
      example: cards.example,
      exampleVi: cards.exampleVi,
      easeFactor: cards.easeFactor,
      intervalDays: cards.intervalDays,
      repetitions: cards.repetitions,
    })
    .from(cards)
    .where(and(eq(cards.deckId, id), lte(cards.dueAt, now)))
    .orderBy(asc(cards.dueAt), asc(cards.id));

  return (
    <StudySession
      key={session ?? "default"}
      cards={shuffle(dueCards, Math.random)}
    />
  );
}

type StudyNoticeProps = {
  message?: string;
  href?: string;
  linkLabel?: string;
};

function StudyNotice({
  message = "Deck không tồn tại hoặc đã bị xóa.",
  href = "/",
  linkLabel = "Về trang chủ",
}: StudyNoticeProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <p className="text-slate-600">{message}</p>
      <Link href={href} prefetch={false} className={`${buttonClass()} mt-4`}>
        {linkLabel}
      </Link>
    </div>
  );
}
