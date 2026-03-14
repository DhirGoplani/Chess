import express from "express";
import { login } from "./loginController.js";
import { register } from "./registerController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

export default router;