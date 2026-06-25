import { vi } from "vitest";

export interface QueryResult<T = any> {
  data: T;
  error: { message: string } | null;
}

/**
 * Builds a chainable fake Supabase query builder. Every chain method
 * (`.select()`, `.eq()`, `.single()`, ...) returns the same object, and the
 * object is "thenable" so `await` resolves with `result` no matter where in
 * the chain it's applied — matching how the real supabase-js builder works.
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

/** A `supabase`/`adminSupabase`-shaped fake client for route tests. */
export function createMockSupabaseClient() {
  return {
    from: vi.fn(() => createMockQueryBuilder({ data: null, error: null })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "not mocked" } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/file" } }),
      })),
      listBuckets: vi.fn().mockResolvedValue({ data: [{ name: "product-images" }, { name: "catalogue-pdfs" }] }),
      createBucket: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  };
}
