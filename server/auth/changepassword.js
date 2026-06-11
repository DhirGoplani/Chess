import bcrypt from "bcrypt";
import { sql } from "../utils/connectDB.js";

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await sql`
      SELECT password
      FROM users
      WHERE id = ${req.user.id}
    `;

    const valid = await bcrypt.compare(
      oldPassword,
      user[0].password
    );

    if (!valid) {
      return res.status(400).json({
        message: "Old password is incorrect"
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      9
    );

    await sql`
      UPDATE users
      SET password = ${hashedPassword}
      WHERE id = ${req.user.id}
    `;

    res.status(200).json({
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
};