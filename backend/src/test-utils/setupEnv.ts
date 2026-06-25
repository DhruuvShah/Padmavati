// Runs before any test file is imported, so modules that read process.env at
// import time (e.g. src/lib/supabase.ts) never see undefined values in tests.
process.env.SUPABASE_URL ||= "http://localhost:54321";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
process.env.COOKIE_SECRET ||= "test-cookie-secret";
process.env.CORS_ORIGIN ||= "http://localhost:3000";
