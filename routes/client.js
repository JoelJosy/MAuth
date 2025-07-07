import express from "express";
import { registerClient } from "../controllers/clientController.js";

const router = express.Router();

router.post("/register", registerClient);

export default router;
