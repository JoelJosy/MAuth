import express from "express";
import {
  requestMagicLink,
  verifyMagicLink,
  verifyJWT,
  refreshTokens,
  revokeRefreshToken,
  revokeAllTokens,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/magic-link/request", requestMagicLink);
router.post("/magic-link/verify", verifyMagicLink);

// for testing purposes only
router.post("/verify-token", verifyJWT);

router.post("/refresh-token", refreshTokens);
router.post("/revoke-token", revokeRefreshToken);
router.post("/revoke-all-tokens", revokeAllTokens);

export default router;
