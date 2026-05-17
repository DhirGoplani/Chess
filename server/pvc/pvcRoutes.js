import express from "express";
import { createGame, makeMove, resignGame } from "./pvcController.js";
import { verifyToken } from "../auth/authMiddleware.js";
const router = express.Router();
router.use(verifyToken);

router.post("/create", createGame);
router.post("/move",   makeMove);
router.post("/resign", resignGame);

export default router;