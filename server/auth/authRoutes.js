import express from "express";
import { login } from "./loginController.js";
import { register } from "./registerController.js";
import { logout } from "./logoutController.js";
import { forgotpassword } from "./forgotpassword.js";
import { resetPassword } from "./resetpassword.js";
import { changePassword } from "./changepassword.js";
import { verifyToken } from "./authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", verifyToken, logout);
router.post("/forgotpassword", forgotpassword);
router.post("/resetpassword", resetPassword);
router.patch("/changepassword", verifyToken, changePassword);

export default router;