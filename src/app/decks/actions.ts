"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { decks } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { isUuid } from "@/lib/ids";

function readName(formData: FormData): string {
  const value = formData.get("name");
  return typeof value === "string" ? value.trim() : "";
}

export async function createDeck(formData: FormData): Promise<ActionResult> {
  const name = readName(formData);
  if (!name) return { ok: false, error: "Tên deck không được để trống." };

  try {
    await db.insert(decks).values({ name });
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Không tạo được deck. Hãy thử lại." };
  }
}

export async function updateDeck(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const name = readName(formData);

  if (!isUuid(id)) return { ok: false, error: "Deck không tồn tại." };
  if (!name) return { ok: false, error: "Tên deck không được để trống." };

  try {
    const [existing] = await db
      .select({ id: decks.id })
      .from(decks)
      .where(eq(decks.id, id));
    if (!existing) return { ok: false, error: "Deck không tồn tại." };

    await db.update(decks).set({ name }).where(eq(decks.id, id));
    revalidatePath("/");
    revalidatePath(`/decks/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Không cập nhật được deck. Hãy thử lại." };
  }
}

export async function deleteDeck(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return { ok: false, error: "Deck không tồn tại." };

  try {
    const [existing] = await db
      .select({ id: decks.id })
      .from(decks)
      .where(eq(decks.id, id));
    if (!existing) return { ok: false, error: "Deck không tồn tại." };

    await db.delete(decks).where(eq(decks.id, id));
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Không xóa được deck. Hãy thử lại." };
  }
}
