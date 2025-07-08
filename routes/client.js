import express from "express";
import {
  registerClient,
  rotateClientKeys,
  getClientInfo,
} from "../controllers/clientController.js";
import {
  strictRateLimit,
  moderateRateLimit,
  lenientRateLimit,
} from "../middleware/rateLimit.js";
import { requireClientApiKey } from "../middleware/clientApiKey.js";

const router = express.Router();

router.post("/register", strictRateLimit, registerClient);

router.get("/info", lenientRateLimit, requireClientApiKey, getClientInfo);

router.post(
  "/:id/rotate-keys",
  moderateRateLimit,
  requireClientApiKey,
  rotateClientKeys
);

export default router;
