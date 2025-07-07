import crypto from "crypto";
import { PRIVATE_KEY_ENCRYPTION_KEY } from "../config/env.js";

const ENC_KEY = Buffer.from(PRIVATE_KEY_ENCRYPTION_KEY, "base64");

const encryptPrivateKey = (privateKey) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return {
    encryptedPrivateKey: encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
};

const decryptPrivateKey = (encryptedPrivateKey, iv, tag) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    ENC_KEY,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  let decrypted = decipher.update(encryptedPrivateKey, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

export { encryptPrivateKey, decryptPrivateKey };
