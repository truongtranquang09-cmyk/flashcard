import {
  index,
  integer,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const decks = pgTable("decks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deckId: uuid("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    front: text("front").notNull(),
    reading: text("reading"),
    back: text("back").notNull(),
    example: text("example"),
    exampleVi: text("example_vi"),
    easeFactor: real("ease_factor").default(2.5).notNull(),
    intervalDays: integer("interval_days").default(0).notNull(),
    repetitions: integer("repetitions").default(0).notNull(),
    dueAt: timestamp("due_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("cards_deck_id_idx").on(table.deckId),
    index("cards_due_at_idx").on(table.dueAt),
  ],
);

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    quality: smallint("quality").notNull(),
    reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
  },
  (table) => [index("review_logs_reviewed_at_idx").on(table.reviewedAt)],
);
