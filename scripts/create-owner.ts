import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { z } from "zod";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { users } from "../src/db/schema";

const setupSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(12).max(256),
});

async function main() {
  const setup = setupSchema.safeParse({
    email: process.env.INITIAL_OWNER_EMAIL,
    password: process.env.INITIAL_OWNER_PASSWORD,
  });
  if (!setup.success) throw new Error("Set INITIAL_OWNER_EMAIL and INITIAL_OWNER_PASSWORD (at least 12 characters) in .env.local.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  try {
    const db = drizzle(client);
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.role, "owner")).limit(1);
    if (existing.length) throw new Error("An owner already exists. Initial owner setup is one-time only.");
    const passwordHash = await argon2.hash(setup.data.password, { type: argon2.argon2id });
    await db.insert(users).values({ name: "Store Owner", email: setup.data.email, passwordHash, role: "owner" });
    console.info("Initial owner created. Remove INITIAL_OWNER_PASSWORD from .env.local.");
  } finally { await client.end(); }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Owner setup failed.");
  process.exitCode = 1;
});
