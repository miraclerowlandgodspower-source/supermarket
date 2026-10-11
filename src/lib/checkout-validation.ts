import { z } from "zod";

export const checkoutSchema = z.object({
  idempotencyKey: z.uuid(),
  items: z.array(z.object({
    productId: z.string().regex(/^[\da-f]{24}$/i),
    quantity: z.number().int().min(1).max(1000),
  })).min(1).max(100),
  customer: z.object({
    name: z.string().trim().max(120).default(""),
    email: z.union([z.literal(""), z.email().max(254)]).default(""),
    phone: z.string().trim().max(24).default(""),
  }).default({ name: "", email: "", phone: "" }),
  paymentMethod: z.enum(["cash", "bank_transfer", "pos_terminal", "other"]),
});