import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Thiếu biến môi trường DATABASE_URL");
}

const client =
  globalForDb.pgClient ??
  postgres(connectionString, {
    max: 1,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
