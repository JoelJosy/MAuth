import crypto from "crypto";
import redis from "../config/redis.js";
import User from "../models/User.js";
import { BASE_URL } from "../config/env.js";
import Client from "../models/Client.js";

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

    const { userId } = JSON.parse(data);

    //  Delete the token after verification
    await redis.del(`magic_token:${token}`);

    return res.json({ message: "Magic link verified successfully", userId });
  } catch (error) {
    console.error("Error verifying magic link:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export { requestMagicLink, verifyMagicLink };
