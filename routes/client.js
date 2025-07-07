import express from "express";
import {
  registerClient,
  rotateClientKeys,
} from "../controllers/clientController.js";

const router = express.Router();

router.post("/register", registerClient);
router.post("/:id/rotate-keys", rotateClientKeys);

export default router;
