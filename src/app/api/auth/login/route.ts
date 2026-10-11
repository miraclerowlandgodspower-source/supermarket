import { NextResponse, type NextRequest } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { hasTrustedOrigin } from "@/lib/permissions";
import { hashSessionToken } from "@/lib/session-token";
import { LoginAttempt } from "@/models/login-attempt";
import { User } from "@/models/user";

const credentialsSchema = z.object({
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(256),
});

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  }

  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  if (!process.env.MONGODB_URI?.trim()) {
    return NextResponse.json({ error: "MongoDB is not configured. Add MONGODB_URI to .env.local and restart the app." }, { status: 503 });
  }

  try {
    await connectToDatabase();
    const attemptKey = hashSessionToken(`login:${parsed.data.email}`);
    const attempt = await LoginAttempt.findOneAndUpdate(
      { key: attemptKey },
      { $inc: { attempts: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 10 * 60 * 1000) } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if (attempt && attempt.attempts > 10) {
      return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
    }

    const user = await User.findOne({ email: parsed.data.email, active: true }).select("+passwordHash");
    const passwordMatches = user
      ? await argon2.verify(user.passwordHash, parsed.data.password).catch(() => false)
      : false;
    if (!user || !passwordMatches) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    await LoginAttempt.deleteOne({ key: attemptKey });
    const sessionToken = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set("marketline_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Sign-in is unavailable. Check the database configuration." }, { status: 503 });
  }
}