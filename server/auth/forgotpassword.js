import transporter from "../confihh/nm.js";
import crypto from "crypto";
import { sql } from "../utils/connectDB.js";

export const forgotpassword = async(req, res) =>{
    try{
        const { email } = req.body;
        if(!email) return res.status(400).json({error:"Please enter email"});
        const user = await sql` select id,email from users where email = ${email} `;
        if(user.length === 0){
            return res.status(200).json({message:"If an account exists with this email, a reset link has been sent."});
        }
        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        const expiry = new Date(Date.now() + 15 * 60 * 1000);
        await sql`update users set reset_token = ${hashedToken}, reset_token_expiry = ${expiry} where id = ${user[0].id}`;
        const resetURL =`${process.env.CLIENT_URL}/reset-password/${resetToken}`;
        await transporter.sendMail({
            from: process.env.NODE_MAILER_EMAIL,
            to: email,
            subject: "Reset Password",
            html: `
            <h2>Password Reset</h2>
            <p>Click below to reset your password:</p>
            <a href="${resetURL}">Reset Password </a>
            <p>Expires in 15 minutes.</p>
            `
        });
        res.status(200).json({message: "Reset link sent"});
    }
    catch(error){
    console.error(error);
    res.status(500).json({message: "Server error"
    });
  }
};