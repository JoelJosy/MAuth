import crypto from "crypto";
import Client from "../models/Client.js";

const getJWKS = async (req, res) => {
  try {
    // Fetch all clients to get their public keys
    const clients = await Client.find({}, "publicKey kid");

    const keys = clients.map((client) => {
      // Parse the PEM public key to extract the key components
      const publicKey = crypto.createPublicKey(client.publicKey);
      const keyDetails = publicKey.export({ format: "jwk" });

      return {
        kty: keyDetails.kty, // Key Type (RSA)
        use: "sig", // Key Use (signature)
        kid: client.kid, // Key ID
        alg: "RS256", // Algorithm
        n: keyDetails.n, // RSA modulus
        e: keyDetails.e, // RSA exponent
      };
    });

    res.json({
      keys: keys,
    });
  } catch (error) {
    console.error("Error fetching JWKS:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export { getJWKS };
