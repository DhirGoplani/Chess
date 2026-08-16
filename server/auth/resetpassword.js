import bcrypt from "bcrypt";
import crypto from "crypto";
import { sql } from "../utils/connectDB.js";

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const now = new Date();

    const user = await sql`
      SELECT id
      FROM users
      WHERE reset_token = ${hashedToken}
        AND (reset_token_expiry > NOW() OR reset_token_expiry > ${now})
    `;

    if (user.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired password reset link"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 9);
    await sql`
      UPDATE users
      SET
        password = ${hashedPassword},
        reset_token = NULL,
        reset_token_expiry = NULL
      WHERE id = ${user[0].id}
    `;

    res.status(200).json({
      message: "Password reset successful"
    });
  } catch (error) {
    console.error("[resetPassword error]:", error);
    res.status(500).json({
      message: "Server error resetting password"
    });
  }
};