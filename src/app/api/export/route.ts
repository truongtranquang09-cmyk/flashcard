import { asc } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import { cards, decks } from "@/db/schema";

type ExportCard = {
  front: string;
  reading: string | null;
  back: string;
  example: string | null;
  exampleVi: string | null;
};

export async function GET() {
  await connection();

  const deckRows = await db
    .select({ id: decks.id, name: decks.name })
    .from(decks)
    .orderBy(asc(decks.createdAt), asc(decks.id));

  const cardRows = await db
    .select({
      deckId: cards.deckId,
      front: cards.front,
      reading: cards.reading,
      back: cards.back,
      example: cards.example,
      exampleVi: cards.exampleVi,
    })
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

  const payload = {
    decks: deckRows.map((deck) => ({
      name: deck.name,
      cards: cardsByDeck.get(deck.id) ?? [],
    })),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="flashcard-web-export.json"',
    },
  });
}
