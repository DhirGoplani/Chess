import transporter from "../confihh/nm.js";
import crypto from "crypto";
import { sql } from "../utils/connectDB.js";

export const forgotpassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await sql`
      SELECT id, email, username 
      FROM users 
      WHERE LOWER(email) = ${cleanEmail}
    `;

    if (user.length === 0) {
      return res.status(404).json({
        message: "No account found with this email address. Please check your email or register."
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await sql`
      UPDATE users 
      SET reset_token = ${hashedToken}, reset_token_expiry = ${expiry} 
      WHERE id = ${user[0].id}
    `;

    const resetURL = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password/${resetToken}`;

    console.log(`\n==================================================`);
    console.log(`🔑 PASSWORD RESET LINK GENERATED for [${cleanEmail}]:`);
    console.log(`👉 ${resetURL}`);
    console.log(`==================================================\n`);

    const mailOptions = {
      from: `"ChessMate Support" <${process.env.NODE_MAILER_EMAIL}>`,
      to: cleanEmail,
      subject: "ChessMate - Reset Your Password",
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #1a0e07; color: #f0e6d3; padding: 40px 20px; border-radius: 8px; max-width: 500px; margin: 0 auto; border: 1px solid #c4a35a;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-family: Georgia, serif; color: #81b64c; margin: 0; font-size: 28px;">♞ ChessMate</h1>
            <p style="color: #c4a882; font-size: 14px; margin-top: 4px;">Password Reset Request</p>
          </div>
          
          <div style="background-color: #2c1a0e; padding: 24px; border-radius: 6px; border: 1px solid rgba(196,163,90,0.2);">
            <p style="font-size: 16px; margin-top: 0;">Hello <strong>${user[0].username || "Player"}</strong>,</p>
            <p style="color: #c4a882; font-size: 14px; line-height: 1.6;">
              We received a request to reset the password for your ChessMate account. Click the button below to set a new password:
            </p>
            
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetURL}" style="background-color: #81b64c; color: #0d1f05; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 15px; display: inline-block; letter-spacing: 0.05em;">
                Reset Password →
              </a>
            </div>

            <p style="color: #8a7055; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
              This link is valid for <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
            </p>
          </div>

          <div style="text-align: center; margin-top: 24px; color: #8a7055; font-size: 12px;">
            <p style="margin: 0;">Or copy & paste this link into your browser:</p>
            <p style="word-break: break-all; color: #c4a35a; margin-top: 4px;">${resetURL}</p>
          </div>
        </div>
      `,
    };

    // 🚀 Respond IMMEDIATELY to user (<50ms response time!)
    res.status(200).json({ message: "Reset link sent successfully. Please check your email inbox." });

    // 🚀 Dispatch email asynchronously in background so client never waits on Gmail SMTP latency
    transporter.sendMail(mailOptions).catch((mailErr) => {
      console.error("[forgotpassword async mail dispatch error]:", mailErr);
    });
  } catch (error) {
    console.error("[forgotpassword error]:", error);
    res.status(500).json({ message: "Failed to process reset request. Please try again." });
  }
};