import { model, models, Schema } from "mongoose";

export const USER_ROLES = ["owner", "manager", "cashier"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export type ProductManagerRole = Extract<UserRole, "owner" | "manager">;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: USER_ROLES, required: true, default: "cashier" },
  active: { type: Boolean, default: true, required: true },
}, { timestamps: true });

export const User = models.User ?? model("User", userSchema);