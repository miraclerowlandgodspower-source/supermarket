import { model, models, Schema } from "mongoose";

const saleItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true, immutable: true },
  name: { type: String, required: true, immutable: true },
  sku: { type: String, required: true, immutable: true },
  unit: { type: String, required: true, immutable: true },
  quantity: { type: Number, required: true, min: 1, validate: Number.isSafeInteger, immutable: true },
  unitPriceKobo: { type: Number, required: true, min: 1, validate: Number.isSafeInteger, immutable: true },
  subtotalKobo: { type: Number, required: true, min: 1, validate: Number.isSafeInteger, immutable: true },
}, { _id: false });

const paymentSchema = new Schema({
  method: { type: String, enum: ["cash", "bank_transfer", "pos_terminal", "other"], required: true, immutable: true },
  amountKobo: { type: Number, required: true, min: 1, validate: Number.isSafeInteger, immutable: true },
  status: { type: String, enum: ["cashier_recorded", "provider_verified"], required: true, default: "cashier_recorded", immutable: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
}, { _id: false });

const saleSchema = new Schema({
  receiptNumber: { type: String, required: true, unique: true, immutable: true },
  idempotencyKey: { type: String, required: true, unique: true, immutable: true },
  cashier: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  cashierName: { type: String, required: true, immutable: true },
  customer: {
    name: { type: String, trim: true, maxlength: 120, immutable: true },
    email: { type: String, lowercase: true, trim: true, maxlength: 254, immutable: true },
    phone: { type: String, trim: true, maxlength: 24, immutable: true },
  },
  items: { type: [saleItemSchema], required: true, immutable: true },
  totalKobo: { type: Number, required: true, min: 1, validate: Number.isSafeInteger, immutable: true },
  payments: { type: [paymentSchema], required: true, immutable: true },
  paymentStatus: { type: String, enum: ["cashier_recorded", "provider_verified"], required: true, default: "cashier_recorded", immutable: true },
}, { timestamps: true });

saleSchema.index({ createdAt: -1 });
saleSchema.index({ cashier: 1, createdAt: -1 });

export const Sale = models.Sale ?? model("Sale", saleSchema);