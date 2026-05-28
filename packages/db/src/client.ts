import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb(connectionString?: string) {
  if (cachedDb) return cachedDb;

  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const queryClient = postgres(url, { prepare: false });
  cachedDb = drizzle(queryClient, { schema });
  return cachedDb;
}

export type Database = ReturnType<typeof getDb>;
