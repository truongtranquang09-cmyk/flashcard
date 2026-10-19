"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cards, reviewLogs } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { isUuid } from "@/lib/ids";
import { calculateNextReview } from "@/lib/sm2";

export async function submitReview(
  cardId: string,
  quality: number,
): Promise<ActionResult> {
  if (!isUuid(cardId)) return { ok: false, error: "Thẻ không tồn tại." };
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    return { ok: false, error: "Mức đánh giá không hợp lệ." };
  }

  try {
    const deckId = await db.transaction(async (tx) => {
      const [card] = await tx
        .select({
          deckId: cards.deckId,
          easeFactor: cards.easeFactor,
          intervalDays: cards.intervalDays,
          repetitions: cards.repetitions,
        })
        .from(cards)
        .where(eq(cards.id, cardId));

      if (!card) return null;

      const next = calculateNextReview(card, quality);

      await tx
        .update(cards)
        .set({
          easeFactor: next.easeFactor,
          intervalDays: next.intervalDays,
          repetitions: next.repetitions,
          dueAt: next.dueAt,
        })
        .where(eq(cards.id, cardId));

      await tx.insert(reviewLogs).values({ cardId, quality });

      return card.deckId;
    });

    if (!deckId) return { ok: false, error: "Thẻ không tồn tại." };

    revalidatePath(`/decks/${deckId}`);
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Không lưu được kết quả ôn tập. Hãy thử lại." };
  }
}
