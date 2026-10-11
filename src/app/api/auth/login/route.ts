import { NextResponse, type NextRequest } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { and, eq, gt, sql } from "drizzle-orm";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/postgres";
import { users, loginAttempts } from "@/db/schema";
import { hasTrustedOrigin } from "@/lib/permissions";
import { hashSessionToken } from "@/lib/session-token";

const credentialsSchema = z.object({
  email: z.email().max(254).transform(v => v.trim().toLowerCase()),
  password: z.string().min(1).max(256),
});

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "PostgreSQL is not configured." }, { status: 503 });

  try {
    const attemptKey = hashSessionToken(`login:${parsed.data.email}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const [attempt] = await db.insert(loginAttempts).values({ key: attemptKey, attempts: 1, expiresAt })
      .onConflictDoUpdate({
        target: loginAttempts.key,
        set: {
          attempts: sql`case when ${loginAttempts.expiresAt} < now() then 1 else ${loginAttempts.attempts} + 1 end`,
          expiresAt: sql`case when ${loginAttempts.expiresAt} < now() then ${expiresAt} else ${loginAttempts.expiresAt} end`,
        },
      }).returning({ attempts: loginAttempts.attempts });
    if (attempt.attempts > 10) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });

    const [user] = await db.select().from(users).where(and(eq(users.email, parsed.data.email), eq(users.active, true))).limit(1);
    const passwordMatches = user ? await argon2.verify(user.passwordHash, parsed.data.password).catch(() => false) : false;
    if (!user || !passwordMatches) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });

    await db.delete(loginAttempts).where(eq(loginAttempts.key, attemptKey));
    const sessionToken = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set("marketline_session", sessionToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "strict", path: "/", maxAge: 60 * 60 * 8,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Sign-in is unavailable. Check the database configuration." }, { status: 503 });
  }
}
