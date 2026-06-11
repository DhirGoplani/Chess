import bcrypt from "bcrypt";
import crypto from "crypto";
import { sql } from "../utils/connectDB.js";

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await sql`
      SELECT id
      FROM users
      WHERE reset_token = ${hashedToken}
      AND reset_token_expiry > NOW()
    `;

    if (user.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired token"
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
  }
  catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
};