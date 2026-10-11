import argon2 from "argon2";
import { z } from "zod";
import { connectToDatabase } from "../src/lib/db";
import { User } from "../src/models/user";

const setupSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(12).max(256),
});

async function main() {
  const setup = setupSchema.safeParse({
    email: process.env.INITIAL_OWNER_EMAIL,
    password: process.env.INITIAL_OWNER_PASSWORD,
  });
  if (!setup.success) throw new Error("Set a valid INITIAL_OWNER_EMAIL and a password of at least 12 characters in .env.local.");

  await connectToDatabase();
  if (await User.exists({ role: "owner" })) throw new Error("An owner already exists. Initial owner setup is one-time only.");
  const passwordHash = await argon2.hash(setup.data.password, { type: argon2.argon2id });
  await User.create({ name: "Store Owner", email: setup.data.email, passwordHash, role: "owner" });
  console.info(`Initial owner created for ${setup.data.email}. Remove the bootstrap password from .env.local.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Owner setup failed.");
  process.exitCode = 1;
});