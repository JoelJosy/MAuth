import express from "express";
import { getJWKS } from "../controllers/jwksController.js";

const router = express.Router();

// GET /.well-known/jwks.json - Get JSON Web Key Set
router.get("/.well-known/jwks.json", getJWKS);

export default router;
