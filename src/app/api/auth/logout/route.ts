import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/postgres";
import { sessions } from "@/db/schema";
import { hasTrustedOrigin } from "@/lib/permissions";
import { hashSessionToken } from "@/lib/session-token";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  const token = request.cookies.get("marketline_session")?.value;
  if (token) {
    try { await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token))); }
    catch { return NextResponse.json({ error: "Sign-out is temporarily unavailable." }, { status: 503 }); }
  }
  const response = NextResponse.redirect(new URL("/", process.env.APP_URL ?? request.url), 303);
  response.cookies.delete("marketline_session");
  return response;
}
