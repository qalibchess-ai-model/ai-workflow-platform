import { vi } from "vitest";

import type { Database } from "../client";

type AnyFn = (...args: unknown[]) => unknown;

export interface MockChain {
  /** Records every method invocation on the chain. */
  calls: Array<{ method: string; args: unknown[] }>;
  /** The thenable proxy returned by builder methods (await-able). */
  builder: unknown;
}

/**
 * Build a chainable mock that records every method call and resolves to `result`
 * when awaited. Drizzle query builders are thenable, so the returned proxy
 * implements `then`. Every other property returns the same chain so callers can
 * chain freely (`.from().where().limit()` etc.).
 */
export function createChain<T>(result: T): MockChain {
  const calls: Array<{ method: string; args: unknown[] }> = [];

  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: AnyFn, reject?: AnyFn) => Promise.resolve(result).then(resolve, reject);
      }
      if (typeof prop !== "string") return undefined;
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        return builder;
      };
    },
  };

  const builder: object = new Proxy({}, handler);
  return { calls, builder };
}

export interface DbMock {
  db: Database;
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

export interface DbMockOptions {
  selectResult?: unknown;
  insertResult?: unknown;
  updateResult?: unknown;
  deleteResult?: unknown;
}

/**
 * Build a Drizzle database mock where each top-level method (select/insert/etc)
 * returns its own chainable. The four `*Result` options control what awaiting
 * each chain yields.
 */
export function createMockDb(options: DbMockOptions = {}): DbMock {
  const selectChain = createChain(options.selectResult ?? []);
  const insertChain = createChain(options.insertResult ?? []);
  const updateChain = createChain(options.updateResult ?? []);
  const deleteChain = createChain(options.deleteResult ?? []);

  const select = vi.fn(() => selectChain.builder);
  const insert = vi.fn(() => insertChain.builder);
  const update = vi.fn(() => updateChain.builder);
  const del = vi.fn(() => deleteChain.builder);

  const db = { select, insert, update, delete: del } as unknown as Database;
  return { db, select, insert, update, delete: del };
}
