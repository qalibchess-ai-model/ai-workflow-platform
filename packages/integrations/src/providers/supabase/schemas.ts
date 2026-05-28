import { z } from "zod";

export const SUPABASE_PROVIDER_KEY = "supabase";

/**
 * Postgres-safe identifier. Table and column names are interpolated into the
 * REST URL/path and filter querystring; restricting them here means callers
 * cannot smuggle path traversal or PostgREST operators into a position where
 * they don't belong. Schema-qualified names (`public.users`) are not allowed —
 * use the default schema or set the table-specific REST endpoint instead.
 */
const SqlIdentifier = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    "Must be a valid SQL identifier (letters, digits, underscore)",
  );

/** A single row, or a batch of rows for bulk insert. */
const RowData = z.record(z.unknown());
const RowsOrRow = z.union([RowData, z.array(RowData).min(1).max(1000)]);

/**
 * Filter keys are column names; values are full PostgREST condition strings,
 * e.g. `eq.42`, `gte.10`, `ilike.*foo*`, `in.(1,2,3)`. We accept the operator
 * inline so callers retain PostgREST's expressiveness without us having to
 * model every operator. See https://postgrest.org/en/stable/api.html#operators.
 */
const FilterMap = z.record(SqlIdentifier, z.string().min(1).max(512));

export const SupabaseInsertInput = z.object({
  tenantId: z.string().min(1),
  table: SqlIdentifier,
  data: RowsOrRow,
});

export const SupabaseInsertOutput = z.object({
  rows: z.array(RowData),
  count: z.number().int().nonnegative(),
});

export const SupabaseSelectInput = z.object({
  tenantId: z.string().min(1),
  table: SqlIdentifier,
  filter: FilterMap.optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const SupabaseSelectOutput = z.object({
  rows: z.array(RowData),
  count: z.number().int().nonnegative(),
});

export type SupabaseInsertInput = z.infer<typeof SupabaseInsertInput>;
export type SupabaseInsertOutput = z.infer<typeof SupabaseInsertOutput>;
export type SupabaseSelectInput = z.infer<typeof SupabaseSelectInput>;
export type SupabaseSelectOutput = z.infer<typeof SupabaseSelectOutput>;
