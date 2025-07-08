import express from "express";
import {
  requestMagicLink,
  verifyMagicLink,
  verifyJWT,
  refreshTokens,
  revokeRefreshToken,
  revokeAllTokens,
} from "../controllers/authController.js";
import {
  strictRateLimit,
  moderateRateLimit,
  lenientRateLimit,
  rateLimit,
} from "../middleware/rateLimit.js";

const router = express.Router();

const magicLinkRequestLimit = rateLimit({
  keyPrefix: "magic_request",
  limit: 5,
  windowDuration: 300,
  strategy: "hybrid",
  ipLimit: 15, // Allow more requests per IP to handle offices/families
  ipWindowDuration: 300,
}); // 5 per email per 5min + 15 per IP per 5min

router.post("/magic-link/request", magicLinkRequestLimit, requestMagicLink);

router.post("/magic-link/verify", moderateRateLimit, verifyMagicLink);

router.post("/verify-token", lenientRateLimit, verifyJWT);
router.post("/refresh-token", moderateRateLimit, refreshTokens);
router.post("/revoke-token", moderateRateLimit, revokeRefreshToken);
router.post("/revoke-all-tokens", strictRateLimit, revokeAllTokens);

export default router;
