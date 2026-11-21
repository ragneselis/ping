/**
 * Creates the subscription tables if they are missing. Safe to run any time.
 * npm run db:setup (reads DATABASE_URL from .env.local)
 */
import { SCHEMA, sql } from "@/lib/server/db";

async function main() {
  const db = sql();
  for (const statement of SCHEMA) await db.query(statement);
  const rows = (await db`select table_name from information_schema.tables where table_schema = 'public' order by 1`) as { table_name: string }[];
  console.log(`Tables: ${rows.map((r) => r.table_name).join(", ")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
