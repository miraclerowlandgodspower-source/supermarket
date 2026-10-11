import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { checkoutSchema } from "@/lib/checkout-validation";
import { connectToDatabase } from "@/lib/db";
import { hasTrustedOrigin, requireRole, AuthorizationError } from "@/lib/permissions";
import { InventoryMovement } from "@/models/inventory-movement";
import { Product } from "@/models/product";
import { Sale } from "@/models/sale";

type SaleRecord = {
  _id: unknown;
  receiptNumber: string;
  cashierName: string;
  customer: { name?: string; email?: string; phone?: string };
  items: Array<{ name: string; sku: string; unit: string; quantity: number; unitPriceKobo: number; subtotalKobo: number }>;
  totalKobo: number;
  payments: Array<{ method: string; amountKobo: number; status: string }>;
  paymentStatus: string;
  createdAt: Date;
};

function serializeSale(sale: SaleRecord) {
  return {
    id: String(sale._id),
    receiptNumber: sale.receiptNumber,
    cashierName: sale.cashierName,
    customer: sale.customer,
    items: sale.items.map((item) => ({
      ...item,
      unitPriceNgn: item.unitPriceKobo / 100,
      subtotalNgn: item.subtotalKobo / 100,
    })),
    totalNgn: sale.totalKobo / 100,
    payments: sale.payments.map((payment) => ({ ...payment, amountNgn: payment.amountKobo / 100 })),
    paymentStatus: sale.paymentStatus,
    createdAt: sale.createdAt,
  };
}

function failure(error: unknown) {
  if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: "The sale could not be completed. No payment verification was recorded." }, { status: 500 });
}

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });

  let actor;
  try {
    actor = await requireRole(["owner", "manager", "cashier"]);
  } catch (error) {
    return failure(error);
  }

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the cart, customer, and payment details." }, { status: 400 });
  const { idempotencyKey, items, customer, paymentMethod } = parsed.data;
  const requestedIds = items.map((item) => item.productId.toLowerCase());
  if (new Set(requestedIds).size !== requestedIds.length) {
    return NextResponse.json({ error: "Each product must appear only once in the cart." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const existing = await Sale.findOne({ idempotencyKey }).lean();
    if (existing) {
      if (String(existing.cashier) !== actor.id) return NextResponse.json({ error: "This checkout key has already been used." }, { status: 409 });
      return NextResponse.json({ sale: serializeSale(existing as unknown as SaleRecord), duplicate: true });
    }

    const session = await mongoose.startSession();
    let createdSale: SaleRecord | null = null;
    try {
      await session.withTransaction(async () => {
        const productIds = items.map((item) => new mongoose.Types.ObjectId(item.productId));
        const products = await Product.find({ _id: { $in: productIds }, status: "active" }).session(session).lean();
        const byId = new Map(products.map((product) => [String(product._id), product]));
        const snapshot = items.map((item) => {
          const product = byId.get(item.productId.toLowerCase());
          if (!product) throw new Error("PRODUCT_NOT_AVAILABLE");
          if (product.stock < item.quantity) throw new Error(`INSUFFICIENT_STOCK:${product.name}`);
          const subtotalKobo = product.sellingPriceKobo * item.quantity;
          if (!Number.isSafeInteger(subtotalKobo)) throw new Error("SALE_TOTAL_INVALID");
          return {
            product: product._id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            quantity: item.quantity,
            unitPriceKobo: product.sellingPriceKobo,
            subtotalKobo,
          };
        });
        const totalKobo = snapshot.reduce((total, item) => total + item.subtotalKobo, 0);
        if (!Number.isSafeInteger(totalKobo) || totalKobo <= 0) throw new Error("SALE_TOTAL_INVALID");

        const receiptNumber = `ML-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
        const [sale] = await Sale.create([{
          receiptNumber,
          idempotencyKey,
          cashier: actor.id,
          cashierName: actor.name,
          customer,
          items: snapshot,
          totalKobo,
          payments: [{ method: paymentMethod, amountKobo: totalKobo, status: "cashier_recorded", recordedBy: actor.id }],
          paymentStatus: "cashier_recorded",
        }], { session });

        for (const item of snapshot) {
          const product = await Product.findOneAndUpdate(
            { _id: item.product, status: "active", stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { new: true, session, runValidators: true },
          );
          if (!product) throw new Error(`INSUFFICIENT_STOCK:${item.name}`);
          await InventoryMovement.create([{
            product: item.product,
            actor: actor.id,
            sale: sale._id,
            type: "sale",
            quantityDelta: -item.quantity,
            stockBefore: product.stock + item.quantity,
            stockAfter: product.stock,
            reason: `Sale ${receiptNumber}`,
          }], { session });
        }

        createdSale = sale.toObject() as unknown as SaleRecord;
      });
    } finally {
      await session.endSession();
    }

    if (!createdSale) return failure(new Error("SALE_NOT_CREATED"));
    return NextResponse.json({ sale: serializeSale(createdSale), duplicate: false }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_AVAILABLE") {
      return NextResponse.json({ error: "A product in the cart is no longer available." }, { status: 409 });
    }
    if (error instanceof Error && error.message.startsWith("INSUFFICIENT_STOCK:")) {
      return NextResponse.json({ error: `Insufficient stock for ${error.message.slice("INSUFFICIENT_STOCK:".length)}.` }, { status: 409 });
    }
    if (error instanceof Error && error.message === "SALE_TOTAL_INVALID") {
      return NextResponse.json({ error: "The sale total is outside the supported range." }, { status: 400 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      const duplicate = await Sale.findOne({ idempotencyKey }).lean().catch(() => null);
      if (duplicate && String(duplicate.cashier) === actor.id) {
        return NextResponse.json({ sale: serializeSale(duplicate as unknown as SaleRecord), duplicate: true });
      }
      return NextResponse.json({ error: "This checkout key has already been used." }, { status: 409 });
    }
    return failure(error);
  }
}