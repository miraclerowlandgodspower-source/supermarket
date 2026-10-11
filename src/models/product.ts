import { model, models, Schema } from "mongoose";

export const PRODUCT_UNITS = ["unit", "kg", "g", "litre", "ml", "pack", "carton", "bottle", "bag", "piece", "dozen", "sachet", "box"] as const;
export const PRODUCT_STATUSES = ["active", "archived"] as const;

const productSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  sku: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 64 },
  barcode: { type: String, unique: true, sparse: true, trim: true, maxlength: 80 },
  sellingPriceKobo: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  costPriceKobo: { type: Number, min: 0, validate: Number.isSafeInteger, select: false },
  stock: { type: Number, required: true, min: 0, validate: Number.isSafeInteger, default: 0 },
  minimumStock: { type: Number, required: true, min: 0, validate: Number.isSafeInteger, default: 5 },
  unit: { type: String, enum: PRODUCT_UNITS, required: true, default: "unit" },
  imageUrl: { type: String, trim: true, maxlength: 2048, default: "" },
  unitSize: { type: Number, min: 0, default: 1 },
  unitSizeLabel: { type: String, enum: ["unit", "piece", "g", "kg", "ml", "litre", "bottle", "sachet"], default: "unit" },
  unitsPerPack: { type: Number, min: 1, validate: Number.isSafeInteger, default: 1 },
  status: { type: String, enum: PRODUCT_STATUSES, required: true, default: "active", index: true },
}, { timestamps: true });

productSchema.index({ name: "text", sku: "text", barcode: "text" });
productSchema.index({ status: 1, category: 1, name: 1 });

export const Product = models.Product ?? model("Product", productSchema);