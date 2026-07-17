import bcrypt from "bcrypt";
import { sql } from "../utils/connectDB.js";
import jwt from "jsonwebtoken";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 1 * 24 * 60 * 60 * 1000,
};

export const register = async (req, res) => {
  try{
    const {name, username, email, password} = req.body;
    if(!name || !username || !email || !password){
      return res.status(400).json({ message: "All fields are required" });
    }
    if(!/^[a-z0-9_.]+$/.test(username)){
      return res.status(400).json({ message: "Username can only contain lowercase letters, numbers, underscores, and periods" });
    }
    const existingUser = await sql`
      SELECT id FROM users
      WHERE email = ${email} OR username = ${username}
    `;
    if(existingUser.length > 0){
      return res.status(409).json({ message: "Email or username already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 9);
    const newUser = await sql`
      INSERT INTO users (name, username, email, password)
      VALUES (${name}, ${username}, ${email}, ${hashedPassword})
      RETURNING id, name, username, email, bullet_rating, blitz_rating, rapid_rating, created_at
    `;
const token = jwt.sign(
  { 
    id:            newUser[0].id,
    username:      newUser[0].username,
    bullet_rating: newUser[0].bullet_rating,
    blitz_rating:  newUser[0].blitz_rating,
    rapid_rating:  newUser[0].rapid_rating
  },
  process.env.JWT_SECRET,
  { expiresIn: "2d" }
);
    res.cookie("authToken", token, COOKIE_OPTIONS);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: newUser[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};