import mongoose from "mongoose";

const authTokenSchema = new mongoose.Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true },
    type: { type: String, enum: ["magic_link", "otp"], required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const AuthToken = mongoose.model("Token", authTokenSchema);
export default AuthToken;
