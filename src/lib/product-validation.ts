import { z } from "zod";
import { PRODUCT_UNITS } from "@/models/product";

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000).default(""),
  sku: z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9._-]+$/).transform((value) => value.toUpperCase()),
  barcode: z.string().trim().max(80).regex(/^[a-zA-Z0-9._-]*$/).optional().default(""),
  sellingPriceNgn: z.number().finite().positive().max(100_000_000),
  costPriceNgn: z.number().finite().nonnegative().max(100_000_000).optional(),
  stock: z.number().int().nonnegative().max(1_000_000),
  minimumStock: z.number().int().nonnegative().max(1_000_000).default(5),
  unit: z.enum(PRODUCT_UNITS).default("unit"),
  unitSize: z.number().finite().positive().max(1000000).optional().default(1),
  unitSizeLabel: z.enum(["unit","piece","g","kg","ml","litre","bottle","sachet"]).optional().default("unit"),
  unitsPerPack: z.number().int().positive().max(1000000).optional().default(1),
  imageUrl: z.union([z.literal(""), z.url({ protocol: /^https$/ })]).optional().default(""),
});

export const inventoryAdjustmentSchema = z.object({
  productId: z.string().regex(/^[\da-f]{24}$/i),
  quantityDelta: z.number().int().refine((value) => value !== 0).min(-1_000_000).max(1_000_000),
  reason: z.string().trim().min(3).max(300),
});