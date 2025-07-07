import express from "express";
import {
  requestMagicLink,
  verifyMagicLink,
  verifyJWT,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/magic-link/request", requestMagicLink);
router.post("/magic-link/verify", verifyMagicLink);
router.post("/verify-token", verifyJWT);

export default router;
