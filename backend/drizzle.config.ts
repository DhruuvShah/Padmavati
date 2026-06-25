import { defineConfig } from "drizzle-kit";

// Discrete fields instead of a single connection-string URL — the Supabase
// pooler password contains characters (#, @) that are genuinely ambiguous
// to parse back out of a bare postgresql:// URL, so this sidesteps that
// entirely. No percent-encoding needed; paste the raw password as-is.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./supabase/migrations",
  dbCredentials: {
    host: process.env.PGHOST || "",
    port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
    user: process.env.PGUSER || "",
    password: process.env.PGPASSWORD || "",
    database: process.env.PGDATABASE || "postgres",
    ssl: "require",
  },
});
