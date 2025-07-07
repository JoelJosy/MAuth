import {
  generateKeyPairSync,
  privateDecrypt,
  publicEncrypt,
  randomUUID,
} from "crypto";
import { encryptPrivateKey } from "../utils/encryptKeys.js";
import Client from "../models/Client.js";
import { pem2jwk } from "pem-jwk";

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
      id: client._id,
      publicKey: client.publicKey,
    });
  } catch (error) {
    console.error("Error registering client:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const rotateClientKeys = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the client
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Generate new key pair
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

    // Encrypt the new private key
    const { encryptedPrivateKey, iv, tag } = encryptPrivateKey(privateKey);

    // Update client with new keys
    client.publicKey = publicKey;
    client.encryptedPrivateKey = encryptedPrivateKey;
    client.iv = iv;
    client.tag = tag;
    client.kid = randomUUID();

    await client.save();

    res.status(200).json({
      message: "Client keys rotated successfully",
      name: client.name,
      publicKey: client.publicKey,
    });
  } catch (error) {
    console.error("Error rotating client keys:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getJWK = async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch the client by id
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }
    // Convert the public key to JWK format
    const jwk = pem2jwk(client.publicKey);
    jwk.use = "sig";
    jwk.alg = "RS256";
    jwk.kid = client.kid;
    res.status(200).json(jwk);
  } catch (error) {
    console.error("Error fetching JWKS:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export { registerClient, rotateClientKeys, getJWK };
