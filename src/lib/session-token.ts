import "server-only";
import { createHmac } from "node:crypto";

export function hashSessionToken(token: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return createHmac("sha256", secret).update(token).digest("hex");
}