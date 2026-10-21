import "server-only";

import { asc, eq } from "drizzle-orm";
import { Workbook } from "exceljs";
import JSZip from "jszip";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";
import { isUuid } from "@/lib/ids";

export type ExportCard = {
  front: string;
  reading: string | null;
  back: string;
  example: string | null;
  exampleVi: string | null;
};

export type ExportDeck = {
  name: string;
  cards: ExportCard[];
};

export type ZipEntry = {
  name: string;
  content: string | Uint8Array;
};

export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const ZIP_CONTENT_TYPE = "application/zip";

const HEADERS = ["front", "reading", "back", "example", "exampleVi"] as const;
const COLUMN_WIDTHS = [28, 20, 32, 40, 40];
const MAX_SHEET_NAME_LENGTH = 31;
const INVALID_SHEET_NAME_CHARS = /[\\/?*[\]:]/g;
const THIN_BORDER = {
  top: { style: "thin", color: { argb: "FFD1D5DB" } },
  left: { style: "thin", color: { argb: "FFD1D5DB" } },
  bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
  right: { style: "thin", color: { argb: "FFD1D5DB" } },
} as const;

export function sanitizeSheetName(name: string): string {
  return (
    name
      .replace(INVALID_SHEET_NAME_CHARS, " ")
      .trim()
      .slice(0, MAX_SHEET_NAME_LENGTH)
      .trim() || "Deck"
  );
}

export async function loadExportDecks(
  deckId: string | null,
): Promise<ExportDeck[] | null> {
  const cardFields = {
    front: cards.front,
    reading: cards.reading,
    back: cards.back,
    example: cards.example,
    exampleVi: cards.exampleVi,
  };

  if (deckId !== null) {
    if (!isUuid(deckId)) return null;

    const [deck] = await db
      .select({ id: decks.id, name: decks.name })
      .from(decks)
      .where(eq(decks.id, deckId));

    if (!deck) return null;

    const deckCards = await db
      .select(cardFields)
      .from(cards)
      .where(eq(cards.deckId, deckId))
      .orderBy(asc(cards.createdAt), asc(cards.id));

    return [{ name: deck.name, cards: deckCards }];
  }

  const deckRows = await db
    .select({ id: decks.id, name: decks.name })
    .from(decks)
    .orderBy(asc(decks.createdAt), asc(decks.id));

  const cardRows = await db
    .select({ deckId: cards.deckId, ...cardFields })
    .from(cards)
    .orderBy(asc(cards.createdAt), asc(cards.id));

  const cardsByDeck = new Map<string, ExportCard[]>();
  for (const card of cardRows) {
    const list = cardsByDeck.get(card.deckId) ?? [];
    list.push({
      front: card.front,
      reading: card.reading,
      back: card.back,
      example: card.example,
      exampleVi: card.exampleVi,
    });
    cardsByDeck.set(card.deckId, list);
  }

  return deckRows.map((deck) => ({
    name: deck.name,
    cards: cardsByDeck.get(deck.id) ?? [],
  }));
}

export function createDeckWorkbook(
  deckName: string,
  deckCards: ExportCard[],
): Workbook {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(sanitizeSheetName(deckName), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = HEADERS.map((header, columnIndex) => ({
    header,
    key: header,
    width: COLUMN_WIDTHS[columnIndex],
  }));

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF059669" },
    };
    cell.alignment = { vertical: "middle" };
    cell.border = THIN_BORDER;
  });

  for (const card of deckCards) {
    const row = sheet.addRow({
      front: card.front,
      reading: card.reading ?? "",
      back: card.back,
      example: card.example ?? "",
      exampleVi: card.exampleVi ?? "",
    });

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = THIN_BORDER;
      cell.alignment = { wrapText: true, vertical: "top" };
    });
  }

  return workbook;
}

export async function createZip(
  entries: ZipEntry[],
): Promise<Uint8Array<ArrayBuffer>> {
  const zip = new JSZip();

  for (const entry of entries) {
    zip.file(entry.name, entry.content);
  }

  const data = await zip.generateAsync({ type: "uint8array" });
  const buffer = new Uint8Array(data.byteLength);
  buffer.set(data);
  return buffer;
}
