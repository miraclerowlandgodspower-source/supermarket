import { model, models, Schema } from "mongoose";

const loginAttemptSchema = new Schema({
  key: { type: String, required: true, unique: true },
  attempts: { type: Number, default: 0, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });

export const LoginAttempt = models.LoginAttempt ?? model("LoginAttempt", loginAttemptSchema);