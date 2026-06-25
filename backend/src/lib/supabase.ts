import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = process.env.SUPABASE_URL!;
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Service role key bypasses RLS for trusted server-side operations
// (access request management, PDF/image storage). Falls back to the
// anon key only so local dev without the service key doesn't crash outright.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
