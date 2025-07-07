import { generateKeyPairSync, privateDecrypt, publicEncrypt } from "crypto";
import { encryptPrivateKey } from "../utils/encryptKeys.js";
import Client from "../models/Client.js";

const registerClient = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    // check if client already exists
    const existingClient = await Client.findOne({ name });
    if (existingClient) {
      return res
        .status(400)
        .json({ error: "Client with this name already exists" });
    }

    // Generate key pair
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    // Encrypt the private key
    const { encryptedPrivateKey, iv, tag } = encryptPrivateKey(privateKey);

    // Save client
    const client = await Client.create({
      name,
      publicKey,
      encryptedPrivateKey,
      iv,
      tag,
    });

    res.status(201).json({
      message: "Client registered successfully",
      name: client.name,
      publicKey: client.publicKey,
    });
  } catch (error) {
    console.error("Error registering client:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export { registerClient };
