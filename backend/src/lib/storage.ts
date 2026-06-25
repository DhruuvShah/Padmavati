import { adminSupabase } from "./supabase";

/**
 * Ensures a Storage bucket exists and is public, fixing it if it already
 * exists but isn't — we've been bitten once by a bucket that pre-existed
 * as private, silently breaking every public URL pointing at it.
 */
export async function ensurePublicBucket(name: string): Promise<void> {
  const { data: buckets } = await adminSupabase.storage.listBuckets();
  const existing = buckets?.find((b) => b.name === name);
  if (!existing) {
    await adminSupabase.storage.createBucket(name, { public: true });
  } else if (!existing.public) {
    await adminSupabase.storage.updateBucket(name, { public: true });
  }
}
