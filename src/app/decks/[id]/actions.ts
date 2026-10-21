"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { generateCard, type GeneratedCard } from "@/lib/ai";
import { isUniqueViolation } from "@/lib/db-errors";
import { normalizeKey } from "@/lib/duplicates";
import { isUuid } from "@/lib/ids";

export type GenerateCardActionResult =
  | { ok: true; card: GeneratedCard }
  | { ok: false; error: string };

export async function generateCardFromWord(
  word: string,
): Promise<GenerateCardActionResult> {
  try {
    return await generateCard(word);
  } catch {
    return { ok: false, error: "Không tạo được thẻ bằng AI. Hãy thử lại." };
  }
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, key: string): string | null {
  return readText(formData, key) || null;
}

function duplicateFrontError(front: string): string {
  return `Từ "${front}" đã có trong deck này.`;
}

async function frontExistsInDeck(
  deckId: string,
  front: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [
    eq(cards.deckId, deckId),
    sql`lower(btrim(${cards.front})) = ${normalizeKey(front)}`,
  ];
  if (excludeId) conditions.push(sql`${cards.id} <> ${excludeId}`);

  const [existing] = await db
    .select({ id: cards.id })
    .from(cards)
    .where(and(...conditions));
  return Boolean(existing);
}

export async function createCard(formData: FormData): Promise<ActionResult> {
  const deckId = String(formData.get("deckId") ?? "");
  const front = readText(formData, "front");
  const back = readText(formData, "back");

  if (!isUuid(deckId)) return { ok: false, error: "Deck không tồn tại." };
  if (!front || !back) {
    return { ok: false, error: "Mặt trước và nghĩa không được để trống." };
  }

  try {
    const [existing] = await db
      .select({ id: decks.id })
      .from(decks)
      .where(eq(decks.id, deckId));
    if (!existing) return { ok: false, error: "Deck không tồn tại." };

    if (await frontExistsInDeck(deckId, front)) {
      return { ok: false, error: duplicateFrontError(front) };
    }

    await db.insert(cards).values({
      deckId,
      front,
      back,
      reading: readOptionalText(formData, "reading"),
      example: readOptionalText(formData, "example"),
      exampleVi: readOptionalText(formData, "exampleVi"),
    });

    revalidatePath(`/decks/${deckId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: duplicateFrontError(front) };
    }
    return { ok: false, error: "Không thêm được thẻ. Hãy thử lại." };
  }
}

export async function updateCard(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const front = readText(formData, "front");
  const back = readText(formData, "back");

  if (!isUuid(id)) return { ok: false, error: "Thẻ không tồn tại." };
  if (!front || !back) {
    return { ok: false, error: "Mặt trước và nghĩa không được để trống." };
  }

  try {
    const [existing] = await db
      .select({ id: cards.id, deckId: cards.deckId })
      .from(cards)
      .where(eq(cards.id, id));
    if (!existing) return { ok: false, error: "Thẻ không tồn tại." };

    if (await frontExistsInDeck(existing.deckId, front, id)) {
      return { ok: false, error: duplicateFrontError(front) };
    }

    await db
      .update(cards)
      .set({
        front,
        back,
        reading: readOptionalText(formData, "reading"),
        example: readOptionalText(formData, "example"),
        exampleVi: readOptionalText(formData, "exampleVi"),
      })
      .where(eq(cards.id, id));

    revalidatePath(`/decks/${existing.deckId}`);
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: duplicateFrontError(front) };
    }
    return { ok: false, error: "Không cập nhật được thẻ. Hãy thử lại." };
  }
}

export async function deleteCard(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return { ok: false, error: "Thẻ không tồn tại." };

  try {
    const [existing] = await db
      .select({ id: cards.id, deckId: cards.deckId })
      .from(cards)
      .where(eq(cards.id, id));
    if (!existing) return { ok: false, error: "Thẻ không tồn tại." };

    await db.delete(cards).where(eq(cards.id, id));
    revalidatePath(`/decks/${existing.deckId}`);
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Không xóa được thẻ. Hãy thử lại." };
  }
}
