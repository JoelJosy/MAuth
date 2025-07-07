import express from "express";
import {
  requestMagicLink,
  verifyMagicLink,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/magic-link/request", requestMagicLink);
router.post("/magic-link/verify", verifyMagicLink);

export default router;
