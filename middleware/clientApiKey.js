import Client from "../models/Client.js";

// Middleware to validate client-specific API keys
const requireClientApiKey = async (req, res, next) => {
  try {
    const clientApiKey = req.headers["x-client-api-key"];

    if (!clientApiKey) {
      return res.status(401).json({
        error: "Client API key required",
        message:
          "Please provide your client API key in the X-Client-API-Key header",
      });
    }

    // Find client by API key
    const client = await Client.findOne({ apiKey: clientApiKey });
    if (!client) {
      return res.status(401).json({
        error: "Invalid client API key",
        message: "The provided API key is not valid",
      });
    }

    // For key rotation, verify the client owns the resource
    if (req.params.id && req.params.id !== client._id.toString()) {
      return res.status(403).json({
        error: "Access denied",
        message: "You can only modify your own client keys",
      });
    }

    // Update last used timestamp for monitoring
    client.apiKeyLastUsed = new Date();
    await client.save();

    // Attach client to request for use in controller
    req.client = client;

    next();
  } catch (error) {
    console.error("Client API key validation error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
};

export { requireClientApiKey };
