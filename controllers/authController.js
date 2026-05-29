import crypto from "crypto";
import jwt from "jsonwebtoken";
import redis from "../config/redis.js";
import { BASE_URL } from "../config/env.js";
import User from "../models/User.js";
import Client from "../models/Client.js";
import RefreshToken from "../models/RefreshToken.js";
import { generateTokens, verifyToken } from "../utils/jwt.js";
import { sendEmail } from "../utils/sendEmail.js";
import { generateEmailTemplate } from "../utils/emailTemplate.js";

const AUTH_CODE_TTL_SECONDS = 5 * 60;

const buildRedirectUrl = (redirectUrl, params = {}) => {
  const url = new URL(redirectUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
};

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
        lastLogin: null, // Don't set lastLogin on registration
      });
    }

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

    // Generate and send email
    try {
      const emailTemplate = generateEmailTemplate(
        magicLink,
        client.name,
        email
      );

      await sendEmail({
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      console.log(
        `Magic link email sent to ${email} for client ${client.name}`
      );
    } catch (emailError) {
      console.error("Failed to send magic link email:", emailError);
      // Clean up the Redis token since email failed
      await redis.del(`magic_token:${token}`);
      return res.status(500).json({
        error: "Failed to send email. Please try again later.",
      });
    }

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

    // Update lastLogin on successful verification
    await User.findByIdAndUpdate(userId, { lastLogin: new Date() });

    const authCode = crypto.randomBytes(32).toString("hex");

    await redis.setEx(
      `auth_code:${authCode}`,
      AUTH_CODE_TTL_SECONDS,
      JSON.stringify({
        userId: userId.toString(),
        clientId: clientId.toString(),
        redirectUrl: JSON.parse(data).redirectUrl,
      })
    );

    return res.redirect(
      buildRedirectUrl(JSON.parse(data).redirectUrl, {
        code: authCode,
        token_type: "authorization_code",
        expires_in: String(AUTH_CODE_TTL_SECONDS),
      })
    );
  } catch (error) {
    console.error("Error verifying magic link:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const exchangeAuthorizationCode = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code is required" });
  }

  try {
    const storedCode = await redis.get(`auth_code:${code}`);
    if (!storedCode) {
      return res.status(400).json({ error: "Invalid or expired authorization code" });
    }

    const { userId, clientId, redirectUrl } = JSON.parse(storedCode);

    if (req.client._id.toString() !== clientId) {
      return res.status(403).json({ error: "Authorization code does not belong to this client" });
    }

    await redis.del(`auth_code:${code}`);

    const { accessToken, refreshToken } = await generateTokens({
      userId,
      clientId,
    });

    const user = await User.findById(userId);

    return res.json({
      message: "Authorization code exchanged successfully",
      tokenType: "Bearer",
      expiresIn: 15 * 60,
      accessToken,
      refreshToken,
      user: user
        ? {
            email: user.email,
            lastLogin: user.lastLogin,
          }
        : null,
      client: {
        id: req.client._id,
        name: req.client.name,
        redirectUrl,
      },
    });
  } catch (error) {
    console.error("Error exchanging authorization code:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const verifyJWT = async (req, res) => {
  // Try Authorization header first, then fall back to cookie
  const token =
    req.body?.token ||
    req.headers.authorization?.split(" ")[1] ||
    req.cookies?.accessToken;

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
  const token =
    req.body?.refreshToken ||
    req.headers.authorization?.split(" ")[1] ||
    req.cookies?.refreshToken;

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

    return res.json({
      message: "Tokens refreshed successfully",
      tokenType: "Bearer",
      expiresIn: 15 * 60,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(401).json({ error: "Invalid refresh token" });
  }
};

const revokeRefreshToken = async (req, res) => {
  const { revokeAll = false } = req.body;
  const token =
    req.body?.refreshToken ||
    req.headers.authorization?.split(" ")[1] ||
    req.cookies?.refreshToken;

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
  req.body = { ...(req.body || {}), revokeAll: true };
  return revokeRefreshToken(req, res);
};

export {
  requestMagicLink,
  verifyMagicLink,
  exchangeAuthorizationCode,
  verifyJWT,
  refreshTokens,
  revokeRefreshToken,
  revokeAllTokens,
};
