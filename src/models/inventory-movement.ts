import { model, models, Schema } from "mongoose";

const inventoryMovementSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["restock", "adjustment", "sale", "return"], required: true },
  quantityDelta: { type: Number, required: true, validate: Number.isSafeInteger },
  stockBefore: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  stockAfter: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  reason: { type: String, trim: true, maxlength: 300, default: "" },
  sale: { type: Schema.Types.ObjectId, ref: "Sale" },
}, { timestamps: true });

inventoryMovementSchema.index({ createdAt: -1 });

export const InventoryMovement = models.InventoryMovement ?? model("InventoryMovement", inventoryMovementSchema);