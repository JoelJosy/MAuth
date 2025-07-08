import crypto from "crypto";
import redis from "../config/redis.js";
import User from "../models/User.js";
import { BASE_URL } from "../config/env.js";
import Client from "../models/Client.js";
import { generateTokens, verifyToken } from "../utils/jwt.js";
import RefreshToken from "../models/RefreshToken.js";
import jwt from "jsonwebtoken";

const requestMagicLink = async (req, res) => {
  const { email, id } = req.body;
  if (!email || !id) {
    return res.status(400).json({ error: "Email and app ID are required" });
  }
  try {
    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ error: "Invalid app ID" });

    let user = await User.findOne({ email, clientId: client._id });
    if (!user) {
      user = await User.create({
        email,
        clientId: client._id,
        lastLogin: null,
      });
    }

    // Update lastLogin when requesting magic link
    user.lastLogin = new Date();
    await user.save();

    const token = crypto.randomBytes(32).toString("hex");

    await redis.setEx(
      `magic_token:${token}`,
      600,
      JSON.stringify({
        userId: user._id.toString(),
        clientId: client._id.toString(),
      })
    );

    const magicLink = `${BASE_URL}/auth/magic-link/verify?token=${token}`;
    return res.json({
      message: "Check your inbox for the magic link",
    });
  } catch (error) {
    console.error("Error generating magic link:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const verifyMagicLink = async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    const data = await redis.get(`magic_token:${token}`);
    if (!data)
      return res.status(400).json({ error: "Invalid or expired token" });

    const { userId, clientId } = JSON.parse(data);

    //  Delete the token after verification
    await redis.del(`magic_token:${token}`);

    const { accessToken, refreshToken } = await generateTokens({
      userId,
      clientId,
    });

    return res.json({
      message: "Magic link verified successfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Error verifying magic link:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const verifyJWT = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    const payload = await verifyToken(token);

    // Fetch user details to return additional information
    const user = await User.findById(payload.userId);

    // Get client info from the kid (Key ID) instead of clientId
    const client = await Client.findOne({ kid: payload.kid });

    return res.json({
      valid: true,
      payload: {
        userId: payload.userId,
        kid: payload.kid,
        type: payload.type,
        iss: payload.iss,
        iat: payload.iat,
        exp: payload.exp,
      },
      user: {
        email: user?.email,
        lastLogin: user?.lastLogin,
      },
      client: {
        name: client?.name,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({
      valid: false,
      error: error.message,
    });
  }
};

const refreshTokens = async (req, res) => {
  const { token } = req.body;

  if (!token)
    return res.status(400).json({ error: "Refresh token is required" });

  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded?.header?.kid) throw new Error("Invalid token");

    const existing = await RefreshToken.findOne({ token });
    if (!existing || existing.revoked) {
      return res.status(403).json({ error: "Token invalid or already used" });
    }

    if (new Date() > new Date(existing.expiresAt)) {
      return res.status(403).json({ error: "Token expired" });
    }

    // Get client public key for verification
    const client = await Client.findOne({ kid: decoded.header.kid });
    if (!client) throw new Error("Client not found");

    const payload = jwt.verify(token, client.publicKey, {
      algorithms: ["RS256"],
    });

    // Rotate and generate new tokens
    const { accessToken, refreshToken } = await generateTokens({
      userId: payload.userId,
      clientId: existing.clientId, // Get clientId from database record, not JWT payload
      prevRefreshToken: token,
    });

    return res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(401).json({ error: "Invalid refresh token" });
  }
};

export { requestMagicLink, verifyMagicLink, verifyJWT, refreshTokens };
