import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { hashSessionToken } from "@/lib/session-token";
import { Session } from "@/models/session";
import { User, type UserRole } from "@/models/user";

const SESSION_COOKIE = "marketline_session";
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

export async function createSession(userId: string) {
  await connectToDatabase();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  await Session.create({ user: userId, tokenHash, expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS) });
  return token;
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await connectToDatabase();

  const tokenHash = hashSessionToken(token);
  const session = await Session.findOne({ tokenHash, expiresAt: { $gt: new Date() } }).select("user").lean();
  if (!session) return null;
  const user = await User.findOne({ _id: session.user, active: true }).select("name email role").lean();
  if (!user) return null;
  return { id: String(user._id), name: user.name, email: user.email, role: user.role as UserRole };
}