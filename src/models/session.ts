import { model, models, Schema } from "mongoose";

const sessionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });

export const Session = models.Session ?? model("Session", sessionSchema);