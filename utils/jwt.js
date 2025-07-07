import jwt from "jsonwebtoken";
import { decryptPrivateKey } from "./encryptKeys.js";
import Client from "../models/Client.js";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

const generateTokens = async ({ userId, clientId }) => {
  // Fetch client to get encrypted private key
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error("Client not found");
  }

  // Decrypt the private key
  const privateKey = decryptPrivateKey(
    client.encryptedPrivateKey,
    client.iv,
    client.tag
  );

  const payload = { userId, clientId, kid: client.kid };

  const accessToken = jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    expiresIn: ACCESS_TOKEN_EXPIRY,
    keyid: client.kid,
  });

  const refreshToken = jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    expiresIn: REFRESH_TOKEN_EXPIRY,
    keyid: client.kid,
  });

  return { accessToken, refreshToken };
};

export { generateTokens };
