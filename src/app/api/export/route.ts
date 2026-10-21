import { connection } from "next/server";
import {
  createZip,
  loadExportDecks,
  ZIP_CONTENT_TYPE,
  type ExportDeck,
} from "@/lib/export-files";
import {
  buildContentDisposition,
  sanitizeFileName,
  uniqueFileNames,
} from "@/lib/file-name";

function deckJson(deck: ExportDeck): string {
  return JSON.stringify({ decks: [deck] }, null, 2);
}

export async function GET(request: Request) {
  await connection();

  const deckId = new URL(request.url).searchParams.get("deckId");
  const decks = await loadExportDecks(deckId);

  if (!decks) {
    return new Response("Deck không tồn tại.", { status: 404 });
  }

  if (deckId !== null) {
    const deck = decks[0];
    return new Response(deckJson(deck), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": buildContentDisposition(
          `${sanitizeFileName(deck.name)}.json`,
        ),
      },
    });
  }

  const decksWithCards = decks.filter((deck) => deck.cards.length > 0);
  if (decksWithCards.length === 0) {
    return new Response("Không có deck nào có thẻ để xuất.", { status: 404 });
  }

  const baseNames = uniqueFileNames(decksWithCards.map((deck) => deck.name));
  const zip = await createZip(
    decksWithCards.map((deck, index) => ({
      name: `${baseNames[index]}.json`,
      content: deckJson(deck),
    })),
  );

  return new Response(zip, {
    headers: {
      "Content-Type": ZIP_CONTENT_TYPE,
      "Content-Disposition": buildContentDisposition("flashcard-web-json.zip"),
    },
  });
}
