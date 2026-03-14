import bcrypt from "bcrypt";
import { sql } from "../utils/connectDB.js";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = await sql`
      SELECT id, name, username, email, password, 
             bullet_rating, blitz_rating, rapid_rating, created_at
      FROM users
      WHERE email = ${email}
    `;
    if(user.length === 0){
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const existingUser = user[0];
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if(!isMatch){
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign(
      { id: existingUser.id },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );
    delete existingUser.password;
    res.status(200).json({
      message: "Login successful",
      token,
      user: existingUser
    });
  }
  catch(error){
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};