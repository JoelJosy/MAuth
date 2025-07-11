import mongoose from "mongoose";
import crypto from "crypto";

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    publicKey: {
      type: String,
      required: true, // PEM
    },
    encryptedPrivateKey: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    tag: {
      type: String,
      required: true,
    },
    kid: {
      type: String,
      required: true,
      default: () => crypto.randomUUID(), // for JWKS
    },
    // Unique API key for each client
    apiKey: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(32).toString("hex"),
    },
    // Track API key usage for monitoring
    apiKeyLastUsed: {
      type: Date,
      default: null,
    },
    // Redirect URL for OAuth flows
    redirectUrl: {
      type: String,
      required: true,
      validate: {
        validator: function (url) {
          // Basic URL validation
          try {
            new URL(url);
            return true;
          } catch (e) {
            return false;
          }
        },
        message: "Invalid redirect URL format",
      },
    },
  },
  { timestamps: true }
);

const Client = mongoose.model("Client", clientSchema);
export default Client;
