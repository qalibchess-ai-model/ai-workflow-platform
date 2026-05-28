import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "./schema";

export type DrizzleSchema = typeof schema;
export type Database = ReturnType<typeof drizzle<DrizzleSchema>>;

interface CachedConnection {
  url: string;
  sql: Sql;
  db: Database;
}

let cached: CachedConnection | undefined;

export interface DbConnectionOptions {
  connectionString?: string;
  /** Max connections in the pool. Default 10 for long-running workers, set to 1 for serverless. */
  max?: number;
  /** Idle timeout in seconds before connections are closed. */
  idleTimeout?: number;
  /** Connection timeout in seconds. */
  connectTimeout?: number;
}

function resolveUrl(connectionString?: string): string {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

function isServerless(): boolean {
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NEXT_RUNTIME === "edge",
  );
}

export function getDb(options: DbConnectionOptions = {}): Database {
  const url = resolveUrl(options.connectionString);

  if (cached && cached.url === url) {
    return cached.db;
  }

  const serverless = isServerless();
  const sql = postgres(url, {
    prepare: false,
    max: options.max ?? (serverless ? 1 : 10),
    idle_timeout: options.idleTimeout ?? (serverless ? 20 : 30),
    connect_timeout: options.connectTimeout ?? 10,
    ssl: "require",
  });

  const db = drizzle(sql, { schema });
  cached = { url, sql, db };
  return db;
}

export async function closeDb(): Promise<void> {
  if (!cached) return;
  await cached.sql.end({ timeout: 5 });
  cached = undefined;
}
