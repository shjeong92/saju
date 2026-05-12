import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as drizzleOrm from "drizzle-orm";
import * as schema from "../schema/index.ts";
import { relations } from "../schema/relations.ts";

const expr = process.argv[2];
if (!expr) {
  console.error("Usage: bun db:q '<TS expression returning Promise>'");
  console.error("");
  console.error("Examples:");
  console.error(`  bun db:q "db.query.users.findFirst({ where: { id: '...' } })"`);
  console.error(`  bun db:q "db.query.users.findFirst({ where: { id: '...' }, with: { profile: true, sajuChart: true } })"`);
  console.error(`  bun db:q "db.select().from(users).limit(3)"`);
  console.error("");
  console.error("Available globals: db, schema, all tables, all drizzle-orm helpers");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set.");
  process.exit(1);
}

const client = new pg.Pool({ connectionString: url, max: 2 });
const db = drizzle({ client, relations, logger: true });

const ctx = {
  db,
  schema,
  ...schema,
  ...drizzleOrm,
};

console.log("--- SQL log ---");
try {
  const fn = new Function(
    ...Object.keys(ctx),
    `return (async () => { return await (${expr}); })();`,
  );
  const result = await fn(...Object.values(ctx));
  console.log("--- Result ---");
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error("--- Error ---");
  console.error(err);
  process.exit(1);
} finally {
  await client.end();
}
