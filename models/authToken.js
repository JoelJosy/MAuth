import mongoose from "mongoose";

const authTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true, 
    }, 
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      minlength: 5,
      maxlength: 255,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    }, 
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true
    },
    type: {
      type: String,
      enum: ['magic_link', 'otp'],
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const AuthToken = mongoose.model("Token", authTokenSchema);
export default AuthToken;
