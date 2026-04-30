import express from "express";
import { login } from "./loginController.js";
import { register } from "./registerController.js";
import { logout } from "./logoutController.js";
import { verifyToken } from "./authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

export default router;