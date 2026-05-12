import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.ts";
import { relations } from "./schema/relations.ts";

let cachedClient: ReturnType<typeof createDb> | null = null;

function readDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in.",
    );
  }
  return url;
}

export function createDb(databaseUrl: string = readDatabaseUrl()) {
  const client = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  return drizzle({ client, relations });
}

export function getDb() {
  if (!cachedClient) {
    cachedClient = createDb();
  }
  return cachedClient;
}

export type Db = ReturnType<typeof createDb>;
export { schema };
