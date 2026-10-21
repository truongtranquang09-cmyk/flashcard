"use server";

import { revalidatePath } from "next/cache";
import {
  Workbook,
  type CellValue,
  type Row,
  type Worksheet,
} from "exceljs";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { findDuplicates, normalizeKey } from "@/lib/duplicates";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_REPORTED_DUPLICATES = 5;
const EXCEL_COLUMNS = ["front", "reading", "back", "example", "exampleVi"] as const;

type ExcelColumn = (typeof EXCEL_COLUMNS)[number];

export type ImportResult =
  | {
      ok: true;
      deckCount: number;
      cardCount: number;
      fileCount: number;
    }
  | { ok: false; error: string };

type FileSelection =
  | { ok: true; files: File[] }
  | { ok: false; error: string };

type ImportedCard = {
  front: string;
  reading: string | null;
  back: string;
  example: string | null;
  exampleVi: string | null;
  location: string;
};

type ImportedDeck = {
  name: string;
  cards: ImportedCard[];
  location: string;
};

type ParsedImport =
  | { ok: true; decks: ImportedDeck[] }
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

    const deckLocation = `deck thứ ${deckIndex + 1}`;
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

      importedCards.push({
        front,
        reading,
        back,
        example,
        exampleVi,
        location: `thẻ thứ ${cardIndex + 1}`,
      });
    }

    importedDecks.push({
      name: deckName,
      cards: importedCards,
      location: deckLocation,
    });
  }

  return { ok: true, decks: importedDecks };
}

function readSelectedFiles(
  formData: FormData,
  extension: string,
  label: string,
): FileSelection {
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return { ok: false, error: `Vui lòng chọn file ${label}.` };
  }

  let totalSize = 0;

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(extension)) {
      return {
        ok: false,
        error: `File "${file.name}" không đúng định dạng ${extension}.`,
      };
    }

    if (file.size === 0) {
      return { ok: false, error: `File "${file.name}" rỗng.` };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        ok: false,
        error: `File "${file.name}" vượt quá 5MB.`,
      };
    }

    totalSize += file.size;
  }

  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    return {
      ok: false,
      error: "Tổng dung lượng các file vượt quá 20MB.",
    };
  }

  return { ok: true, files };
}

function addFileLocation(
  decksToImport: ImportedDeck[],
  fileName: string,
): void {
  for (const deck of decksToImport) {
    const deckLocation = `File "${fileName}", ${deck.location}`;
    deck.location = deckLocation;
    for (const card of deck.cards) {
      card.location = `${deckLocation}, ${card.location}`;
    }
  }
}

export async function importData(formData: FormData): Promise<ImportResult> {
  const selection = readSelectedFiles(formData, ".json", "JSON");
  if (!selection.ok) return selection;

  const importedDecks: ImportedDeck[] = [];

  for (const file of selection.files) {
    let text: string;
    try {
      text = await file.text();
    } catch {
      return {
        ok: false,
        error: `File "${file.name}" không đọc được.`,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: `File "${file.name}" không phải JSON hợp lệ.`,
      };
    }

    const result = parseImportData(parsed);
    if (!result.ok) {
      return { ok: false, error: `File "${file.name}": ${result.error}` };
    }

    addFileLocation(result.decks, file.name);
    importedDecks.push(...result.decks);
  }

  return saveImportedDecks(importedDecks, selection.files.length);
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function cellText(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (value instanceof Date) return value.toISOString();
  if ("richText" in value) {
    return value.richText
      .map((part) => part.text)
      .join("")
      .trim();
  }
  if ("text" in value) return cellText(value.text);
  if ("result" in value) return cellText(value.result);
  return "";
}

function rowHasValue(row: Row): boolean {
  for (let column = 1; column <= row.cellCount; column++) {
    if (cellText(row.getCell(column).value)) return true;
  }
  return false;
}

function columnIndexesByHeader(
  worksheet: Worksheet,
): Map<ExcelColumn, number> {
  const headerRow = worksheet.getRow(1);
  const result = new Map<ExcelColumn, number>();

  for (let column = 1; column <= worksheet.columnCount; column++) {
    const header = normalizeHeader(cellText(headerRow.getCell(column).value));
    const matched = EXCEL_COLUMNS.find(
      (name) => name.toLowerCase() === header,
    );
    if (matched && !result.has(matched)) {
      result.set(matched, column);
    }
  }

  return result;
}

function parseWorksheet(worksheet: Worksheet): ParsedImport {
  const columnIndexes = columnIndexesByHeader(worksheet);
  const dataRows: Row[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (rowHasValue(row)) dataRows.push(row);
  }

  if (dataRows.length === 0) return { ok: true, decks: [] };

  const missingColumns = EXCEL_COLUMNS.filter(
    (name) => (name === "front" || name === "back") && !columnIndexes.has(name),
  );
  if (missingColumns.length > 0) {
    return {
      ok: false,
      error: `Sheet "${worksheet.name}" thiếu cột ${missingColumns
        .map((name) => `"${name}"`)
        .join(" và ")}.`,
    };
  }

  const importedCards: ImportedCard[] = [];
  for (const row of dataRows) {
    const textOf = (column: ExcelColumn): string => {
      const columnIndex = columnIndexes.get(column);
      return columnIndex === undefined
        ? ""
        : cellText(row.getCell(columnIndex).value);
    };

    const front = textOf("front");
    const back = textOf("back");
    if (!front || !back) {
      return {
        ok: false,
        error: `Sheet "${worksheet.name}", hàng ${row.number} thiếu "front" hoặc "back".`,
      };
    }

    importedCards.push({
      front,
      back,
      reading: textOf("reading") || null,
      example: textOf("example") || null,
      exampleVi: textOf("exampleVi") || null,
      location: `hàng ${row.number}`,
    });
  }

  return {
    ok: true,
    decks: [
      {
        name: worksheet.name.trim() || "Deck",
        cards: importedCards,
        location: `sheet "${worksheet.name}"`,
      },
    ],
  };
}

function parseWorkbook(workbook: Workbook): ParsedImport {
  const importedDecks: ImportedDeck[] = [];

  for (const worksheet of workbook.worksheets) {
    const parsed = parseWorksheet(worksheet);
    if (!parsed.ok) return parsed;
    importedDecks.push(...parsed.decks);
  }

  return { ok: true, decks: importedDecks };
}

export async function importExcel(formData: FormData): Promise<ImportResult> {
  const selection = readSelectedFiles(formData, ".xlsx", "Excel (.xlsx)");
  if (!selection.ok) return selection;

  const importedDecks: ImportedDeck[] = [];

  for (const file of selection.files) {
    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch {
      return {
        ok: false,
        error: `File "${file.name}" không đọc được.`,
      };
    }

    const workbook = new Workbook();
    try {
      await workbook.xlsx.load(buffer);
    } catch {
      return {
        ok: false,
        error: `File "${file.name}" không phải Excel (.xlsx) hợp lệ.`,
      };
    }

    const result = parseWorkbook(workbook);
    if (!result.ok) {
      return { ok: false, error: `File "${file.name}": ${result.error}` };
    }

    addFileLocation(result.decks, file.name);
    importedDecks.push(...result.decks);
  }

  return saveImportedDecks(importedDecks, selection.files.length);
}

function collectDuplicateIssues(
  importedDecks: ImportedDeck[],
  existingDeckNames: string[],
): string[] {
  const existingKeys = new Set(existingDeckNames.map(normalizeKey));
  const issues: string[] = [];

  for (const deck of importedDecks) {
    if (existingKeys.has(normalizeKey(deck.name))) {
      issues.push(
        `${deck.location}: tên deck "${deck.name}" đã tồn tại.`,
      );
    }
  }

  for (const group of findDuplicates(importedDecks, (deck) => deck.name)) {
    const [first] = group.items;
    if (!first) continue;
    for (const deck of group.items.slice(1)) {
      issues.push(
        `${deck.location}: tên deck "${deck.name}" trùng với ${first.location}.`,
      );
    }
  }

  for (const deck of importedDecks) {
    for (const group of findDuplicates(deck.cards, (card) => card.front)) {
      const [first] = group.items;
      if (!first) continue;
      for (const card of group.items.slice(1)) {
        issues.push(
          `${card.location}: front "${card.front}" trùng với ${first.location}.`,
        );
      }
    }
  }

  return issues;
}

function duplicateIssuesError(issues: string[]): string {
  const shown = issues.slice(0, MAX_REPORTED_DUPLICATES);
  const remaining = issues.length - shown.length;
  const list =
    remaining > 0
      ? `${shown.join(" ")} và ${remaining} chỗ nữa.`
      : shown.join(" ");
  return `Không import được vì dữ liệu bị trùng. ${list}`;
}

async function saveImportedDecks(
  importedDecks: ImportedDeck[],
  fileCount: number,
): Promise<ImportResult> {
  const cardCount = importedDecks.reduce(
    (total, deck) => total + deck.cards.length,
    0,
  );

  try {
    const existingDecks = await db.select({ name: decks.name }).from(decks);
    const issues = collectDuplicateIssues(
      importedDecks,
      existingDecks.map((deck) => deck.name),
    );
    if (issues.length > 0) {
      return { ok: false, error: duplicateIssuesError(issues) };
    }

    await db.transaction(async (tx) => {
      for (const deck of importedDecks) {
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
      deckCount: importedDecks.length,
      cardCount,
      fileCount,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error:
          "Không import được vì tên deck hoặc front trong deck bị trùng. Hãy kiểm tra lại dữ liệu.",
      };
    }
    return { ok: false, error: "Không import được dữ liệu. Hãy thử lại." };
  }
}
