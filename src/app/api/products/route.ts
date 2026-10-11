import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { hasTrustedOrigin, requireRole, AuthorizationError } from "@/lib/permissions";
import { createProductSchema } from "@/lib/product-validation";
import { Category } from "@/models/category";
import { InventoryMovement } from "@/models/inventory-movement";
import { Product } from "@/models/product";

const querySchema = z.object({
  q: z.string().trim().max(120).default(""),
  category: z.string().regex(/^[a-z0-9-]{1,80}$/i).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(["name", "price", "stock", "updatedAt"]).default("name"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

function authResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "The product request could not be completed." }, { status: 500 });
}

type ProductReadRecord = {
  _id: unknown;
  name: string;
  category: { name: string; slug: string } | null;
  description: string;
  sku: string;
  barcode?: string;
  sellingPriceKobo: number;
  costPriceKobo?: number;
  stock: number;
  minimumStock: number;
  unit: string;
  imageUrl: string;
  status: string;
  updatedAt: Date;
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["owner", "manager", "cashier"]);
    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return NextResponse.json({ error: "Invalid product filters." }, { status: 400 });

    await connectToDatabase();
    const { q, category, page, limit, sort, direction } = parsed.data;
    const filter: Record<string, unknown> = { status: "active" };
    if (category) {
      const categoryRecord = await Category.findOne({ slug: category, active: true }).select("_id").lean();
      if (!categoryRecord) return NextResponse.json({ items: [], total: 0, page, pages: 0 });
      filter.category = categoryRecord._id;
    }
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { sku: { $regex: escaped, $options: "i" } },
        { barcode: { $regex: escaped, $options: "i" } },
      ];
    }

    const sortField = sort === "price" ? "sellingPriceKobo" : sort;
    const projection = user.role === "cashier" ? "-costPriceKobo" : "+costPriceKobo";
    const [productResult, total] = await Promise.all([
      Product.find(filter).select(projection).populate<{ category: { name: string; slug: string } }>("category", "name slug")
        .sort({ [sortField]: direction === "asc" ? 1 : -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    const products = productResult as unknown as ProductReadRecord[];

    const items = products.map((product) => ({
      id: String(product._id),
      name: product.name,
      category: product.category?.name ?? "Uncategorised",
      categorySlug: product.category?.slug ?? "",
      description: product.description,
      sku: product.sku,
      barcode: product.barcode ?? "",
      sellingPriceNgn: product.sellingPriceKobo / 100,
      ...(user.role === "cashier" ? {} : { costPriceNgn: (product.costPriceKobo ?? 0) / 100 }),
      stock: product.stock,
      minimumStock: product.minimumStock,
      unit: product.unit,
      imageUrl: product.imageUrl,
      status: product.status,
      updatedAt: product.updatedAt,
    }));
    return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return authResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  try {
    const actor = await requireRole(["owner", "manager"]);
    const parsed = createProductSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Check the product details and try again." }, { status: 400 });

    await connectToDatabase();
    const { category, sellingPriceNgn, costPriceNgn, barcode, ...details } = parsed.data;
    const slug = category.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const categoryRecord = await Category.findOneAndUpdate(
      { slug },
      { $setOnInsert: { slug, name: category } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    const session = await mongoose.startSession();
    let productId = "";
    try {
      await session.withTransaction(async () => {
        const [product] = await Product.create([{
          ...details,
          category: categoryRecord._id,
          barcode: barcode || undefined,
          sellingPriceKobo: Math.round(sellingPriceNgn * 100),
          ...(costPriceNgn === undefined ? {} : { costPriceKobo: Math.round(costPriceNgn * 100) }),
        }], { session });
        productId = String(product._id);
        if (product.stock > 0) {
          await InventoryMovement.create([{
            product: product._id,
            actor: actor.id,
            type: "restock",
            quantityDelta: product.stock,
            stockBefore: 0,
            stockAfter: product.stock,
            reason: "Opening stock",
          }], { session });
        }
      });
    } finally {
      await session.endSession();
    }
    return NextResponse.json({ id: productId }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) return authResponse(error);
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "That SKU or barcode is already in use." }, { status: 409 });
    }
    return authResponse(error);
  }
}