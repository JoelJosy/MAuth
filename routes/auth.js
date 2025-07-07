import express from "express";
import { requestMagicLink } from "../controllers/authController.js";

const router = express.Router();

router.post("/magic-link/request", requestMagicLink);

export default router;
