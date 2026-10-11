import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { hasTrustedOrigin, requireRole, AuthorizationError } from "@/lib/permissions";
import { inventoryAdjustmentSchema } from "@/lib/product-validation";
import { InventoryMovement } from "@/models/inventory-movement";
import { Product } from "@/models/product";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  try {
    const actor = await requireRole(["owner", "manager"]);
    const parsed = inventoryAdjustmentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Check the stock adjustment details." }, { status: 400 });

    await connectToDatabase();
    const session = await mongoose.startSession();
    let updatedStock: number | null = null;
    try {
      await session.withTransaction(async () => {
        const { productId, quantityDelta, reason } = parsed.data;
        const product = await Product.findOneAndUpdate(
          {
            _id: productId,
            status: "active",
            ...(quantityDelta < 0 ? { stock: { $gte: Math.abs(quantityDelta) } } : {}),
          },
          { $inc: { stock: quantityDelta } },
          { new: true, session, runValidators: true },
        );
        if (!product) throw new Error("PRODUCT_OR_STOCK_NOT_AVAILABLE");

        const stockBefore = product.stock - quantityDelta;
        await InventoryMovement.create([{
          product: product._id,
          actor: actor.id,
          type: quantityDelta > 0 ? "restock" : "adjustment",
          quantityDelta,
          stockBefore,
          stockAfter: product.stock,
          reason,
        }], { session });
        updatedStock = product.stock;
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ stock: updatedStock });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === "PRODUCT_OR_STOCK_NOT_AVAILABLE") {
      return NextResponse.json({ error: "Product not found or stock cannot be reduced below zero." }, { status: 409 });
    }
    return NextResponse.json({ error: "The stock adjustment could not be completed." }, { status: 500 });
  }
}