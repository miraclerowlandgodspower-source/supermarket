import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not configured. Add the Neon PostgreSQL connection string.");
}

const globalForPostgres = globalThis as typeof globalThis & {
  postgresClient?: ReturnType<typeof postgres>;
};

const client = globalForPostgres.postgresClient ?? postgres(url, {
  max: 10,
  prepare: false,
  idle_timeout: 20,
});

if (process.env.NODE_ENV !== "production") globalForPostgres.postgresClient = client;

export const db = drizzle(client);
export { client as postgresClient };
