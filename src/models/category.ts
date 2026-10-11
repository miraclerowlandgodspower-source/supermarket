import { model, models, Schema } from "mongoose";

const categorySchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  active: { type: Boolean, default: true, required: true },
}, { timestamps: true });

export const Category = models.Category ?? model("Category", categorySchema);