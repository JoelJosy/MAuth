import express from "express";
import {
  getJWK,
  registerClient,
  rotateClientKeys,
} from "../controllers/clientController.js";

const router = express.Router();

router.post("/register", registerClient);
router.post("/:id/rotate-keys", rotateClientKeys);
router.get("/:id/get-jwk", getJWK);

export default router;
