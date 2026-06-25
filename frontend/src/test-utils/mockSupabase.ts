import { vi } from "vitest";

export interface QueryResult<T = any> {
  data: T;
  error: { message: string } | null;
  count?: number | null;
}

/**
 * Builds a chainable fake Supabase query builder. Every chain method
 * returns the same object, and the object is "thenable" so `await` resolves
 * with `result` no matter where in the chain it's applied.
 */
export function createMockQueryBuilder<T = any>(result: QueryResult<T>) {
  const chainMethods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "order", "limit", "single", "maybeSingle",
  ] as const;

  const builder: any = {};
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (onFulfilled: (r: QueryResult<T>) => unknown) => Promise.resolve(onFulfilled(result));

  return builder;
}
