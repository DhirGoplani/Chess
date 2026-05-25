import bcrypt from "bcrypt";
import { sql } from "../utils/connectDB.js";
import jwt from "jsonwebtoken";

const COOKIE_OPTIONS = {
  httpOnly: true,          
  secure: process.env.NODE_ENV === "production",  
  sameSite: "strict",     
  maxAge: 1 * 24 * 60 * 60 * 1000,  
};

export const login = async (req, res) => {
  try{
    const { email, username, password } = req.body;
    if((!email && !username) || !password) {
      return res.status(400).json({ message: "Email/username and password are required" });
    }
    let user;
    if(email){
      user = await sql`
        SELECT id, name, username, email, password,
               bullet_rating, blitz_rating, rapid_rating, created_at
        FROM users
        WHERE email = ${email}
      `;
    }
    else {
      user = await sql`
        SELECT id, name, username, email, password,
               bullet_rating, blitz_rating, rapid_rating, created_at
        FROM users
        WHERE username = ${username}
      `;
    }
    if (user.length === 0) return res.status(401).json({ message: "Invalid email or password" });
    const existingUser = user[0];
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
const token = jwt.sign(
  { 
    id:            existingUser.id,
    username:      existingUser.username,
    bullet_rating: existingUser.bullet_rating,
    blitz_rating:  existingUser.blitz_rating,
    rapid_rating:  existingUser.rapid_rating
  },
  process.env.JWT_SECRET,
  { expiresIn: "2d" }
);
    res.cookie("authToken", token, COOKIE_OPTIONS);
    delete existingUser.password;
    res.status(200).json({
      message: "Login successful",
      token,         
      user: existingUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};