import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
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
    isVerified: { 
      type: Boolean, default: false 
    },
    loginAttempts: { 
      type: Number, default: 0 
    },
    lockoutUntil: {
      Date: Date, default: null
    },
    lastLogin: {
      Date: Date, default: null
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
