import { connection } from "next/server";
import {
  createDeckWorkbook,
  createZip,
  loadExportDecks,
  XLSX_CONTENT_TYPE,
  ZIP_CONTENT_TYPE,
  type ZipEntry,
} from "@/lib/export-files";
import {
  buildContentDisposition,
  sanitizeFileName,
  uniqueFileNames,
} from "@/lib/file-name";

export async function GET(request: Request) {
  await connection();

  const deckId = new URL(request.url).searchParams.get("deckId");
  const decks = await loadExportDecks(deckId);

  if (!decks) {
    return new Response("Deck không tồn tại.", { status: 404 });
  }

  if (deckId !== null) {
    const deck = decks[0];
    const workbook = createDeckWorkbook(deck.name, deck.cards);
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": XLSX_CONTENT_TYPE,
        "Content-Disposition": buildContentDisposition(
          `${sanitizeFileName(deck.name)}.xlsx`,
        ),
      },
    });
  }

  const decksWithCards = decks.filter((deck) => deck.cards.length > 0);
  if (decksWithCards.length === 0) {
    return new Response("Không có deck nào có thẻ để xuất.", { status: 404 });
  }

  const baseNames = uniqueFileNames(decksWithCards.map((deck) => deck.name));
  const entries: ZipEntry[] = [];

  for (let index = 0; index < decksWithCards.length; index++) {
    const deck = decksWithCards[index];
    const workbook = createDeckWorkbook(deck.name, deck.cards);
    const buffer = await workbook.xlsx.writeBuffer();
    entries.push({
      name: `${baseNames[index]}.xlsx`,
      content: new Uint8Array(buffer),
    });
  }

  const zip = await createZip(entries);

  return new Response(zip, {
    headers: {
      "Content-Type": ZIP_CONTENT_TYPE,
      "Content-Disposition": buildContentDisposition("flashcard-web-excel.zip"),
    },
  });
}
