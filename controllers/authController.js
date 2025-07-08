import crypto from "crypto";
import jwt from "jsonwebtoken";
import redis from "../config/redis.js";
import { BASE_URL } from "../config/env.js";
import User from "../models/User.js";
import Client from "../models/Client.js";
import RefreshToken from "../models/RefreshToken.js";
import { generateTokens, verifyToken } from "../utils/jwt.js";

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
        redirectUrl: client.redirectUrl,
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

    // Delete the magic token after use
    await redis.del(`magic_token:${token}`);

    const { accessToken, refreshToken } = await generateTokens({
      userId,
      clientId,
    });

    // Set tokens as HTTP-only cookies
    // Adjust 'secure' to true if using HTTPS in production
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // or "strict" or "none" with secure=true
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: "/", // cookie valid for entire domain
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Optionally redirect to client app or send success message
    return res.json({
      message: "Magic link verified successfully, tokens set in cookies",
    });

    // Or redirect example:
    // return res.redirect(`${client.redirectUrl}?status=success`);
  } catch (error) {
    console.error("Error verifying magic link:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const verifyJWT = async (req, res) => {
  // Try Authorization header first, then fall back to cookie
  const token =
    req.headers.authorization?.split(" ")[1] || req.cookies?.accessToken;

  if (!token) {
    return res.status(400).json({ error: "Access token is required" });
  }

  try {
    const payload = await verifyToken(token);

    const user = await User.findById(payload.userId);
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
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(400).json({ error: "Refresh token is missing" });
  }

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

    const client = await Client.findOne({ kid: decoded.header.kid });
    if (!client) throw new Error("Client not found");

    const payload = jwt.verify(token, client.publicKey, {
      algorithms: ["RS256"],
    });

    const { accessToken, refreshToken } = await generateTokens({
      userId: payload.userId,
      clientId: existing.clientId,
      prevRefreshToken: token,
    });

    // Set cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ message: "Tokens refreshed successfully" });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(401).json({ error: "Invalid refresh token" });
  }
};

const revokeRefreshToken = async (req, res) => {
  const { revokeAll = false } = req.body;
  const token = req.cookies?.refreshToken;

  if (!revokeAll && !token) {
    return res.status(400).json({
      error: "Refresh token is required unless revoking all tokens",
    });
  }

  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded?.header?.kid) {
      return res.status(400).json({ error: "Invalid token format" });
    }

    const client = await Client.findOne({ kid: decoded.header.kid });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const payload = jwt.verify(token, client.publicKey, {
      algorithms: ["RS256"],
    });

    if (revokeAll) {
      const result = await RefreshToken.updateMany(
        {
          userId: payload.userId,
          clientId: client._id,
          revoked: false,
        },
        {
          revoked: true,
          replacedBy: "revoked_all_tokens",
        }
      );

      // Clear cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      return res.json({
        message: "All refresh tokens revoked successfully",
        tokensRevoked: result.modifiedCount,
      });
    } else {
      const existing = await RefreshToken.findOne({ token });
      if (!existing) {
        return res.status(404).json({ error: "Token not found" });
      }

      if (existing.revoked) {
        return res.status(400).json({ error: "Token already revoked" });
      }

      jwt.verify(token, client.publicKey, {
        algorithms: ["RS256"],
      });

      existing.revoked = true;
      existing.replacedBy = "manually_revoked";
      await existing.save();

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      return res.json({ message: "Refresh token revoked successfully" });
    }
  } catch (error) {
    console.error("Error revoking refresh token:", error);
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

const revokeAllTokens = async (req, res) => {
  req.body.revokeAll = true;
  revokeRefreshToken(req, res);
};

export {
  requestMagicLink,
  verifyMagicLink,
  verifyJWT,
  refreshTokens,
  revokeRefreshToken,
  revokeAllTokens,
};
