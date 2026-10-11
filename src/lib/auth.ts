import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/postgres";
import { sessions, users } from "@/db/schema";
import { hashSessionToken } from "@/lib/session-token";
import type { UserRole } from "@/models/user";

const SESSION_COOKIE = "marketline_session";
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({
    userId, tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
  });
  return token;
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db.select({
    id: users.id, name: users.name, email: users.email, role: users.role,
  }).from(sessions).innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date()), eq(users.active, true)))
    .limit(1);
  const user = rows[0];
  return user ? { ...user, role: user.role as UserRole } : null;
}
