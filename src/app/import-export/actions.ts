"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export type ImportResult =
  | { ok: true; deckCount: number; cardCount: number }
  | { ok: false; error: string };

type ImportedCard = {
  front: string;
  reading: string | null;
  back: string;
  example: string | null;
  exampleVi: string | null;
};

type ImportedDeck = {
  name: string;
  cards: ImportedCard[];
};

type ParsedImport =
  | { ok: true; decks: ImportedDeck[]; cardCount: number }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalText(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  return value.trim() || null;
}

function parseImportData(parsed: unknown): ParsedImport {
  if (!isRecord(parsed) || !Array.isArray(parsed.decks)) {
    return {
      ok: false,
      error: 'File không đúng định dạng: thiếu mảng "decks".',
    };
  }

  const importedDecks: ImportedDeck[] = [];
  let cardCount = 0;

  for (let deckIndex = 0; deckIndex < parsed.decks.length; deckIndex++) {
    const rawDeck = parsed.decks[deckIndex];
    if (!isRecord(rawDeck)) {
      return { ok: false, error: `Deck thứ ${deckIndex + 1} không hợp lệ.` };
    }

    if (typeof rawDeck.name !== "string" || !rawDeck.name.trim()) {
      return {
        ok: false,
        error: `Deck thứ ${deckIndex + 1} thiếu tên hợp lệ.`,
      };
    }

    const deckName = rawDeck.name.trim();
    if (!Array.isArray(rawDeck.cards)) {
      return {
        ok: false,
        error: `Deck "${deckName}" thiếu mảng "cards".`,
      };
    }

    const importedCards: ImportedCard[] = [];
    for (
      let cardIndex = 0;
      cardIndex < rawDeck.cards.length;
      cardIndex++
    ) {
      const rawCard = rawDeck.cards[cardIndex];
      if (!isRecord(rawCard)) {
        return {
          ok: false,
          error: `Deck "${deckName}", thẻ thứ ${cardIndex + 1} không hợp lệ.`,
        };
      }

      const front =
        typeof rawCard.front === "string" ? rawCard.front.trim() : "";
      const back = typeof rawCard.back === "string" ? rawCard.back.trim() : "";
      if (!front || !back) {
        return {
          ok: false,
          error: `Deck "${deckName}", thẻ thứ ${cardIndex + 1} thiếu "front" hoặc "back".`,
        };
      }

      const reading = readOptionalText(rawCard.reading);
      const example = readOptionalText(rawCard.example);
      const exampleVi = readOptionalText(rawCard.exampleVi);
      if (
        reading === undefined ||
        example === undefined ||
        exampleVi === undefined
      ) {
        return {
          ok: false,
          error: `Deck "${deckName}", thẻ thứ ${cardIndex + 1} có trường tùy chọn không phải chuỗi.`,
        };
      }

      importedCards.push({ front, reading, back, example, exampleVi });
    }

    cardCount += importedCards.length;
    importedDecks.push({ name: deckName, cards: importedCards });
  }

  return { ok: true, decks: importedDecks, cardCount };
}

export async function importData(formData: FormData): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Vui lòng chọn file JSON." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "File vượt quá 5MB. Hãy chọn file nhỏ hơn." };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "Không đọc được file. Hãy thử lại." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "File không phải JSON hợp lệ." };
  }

  const result = parseImportData(parsed);
  if (!result.ok) return result;

  try {
    await db.transaction(async (tx) => {
      for (const deck of result.decks) {
        const [created] = await tx
          .insert(decks)
          .values({ name: deck.name })
          .returning({ id: decks.id });

        if (deck.cards.length > 0) {
          await tx.insert(cards).values(
            deck.cards.map((card) => ({
              deckId: created.id,
              front: card.front,
              reading: card.reading,
              back: card.back,
              example: card.example,
              exampleVi: card.exampleVi,
            })),
          );
        }
      }
    });

    revalidatePath("/");
    revalidatePath("/stats");
    return {
      ok: true,
      deckCount: result.decks.length,
      cardCount: result.cardCount,
    };
  } catch {
    return { ok: false, error: "Không import được dữ liệu. Hãy thử lại." };
  }
}
