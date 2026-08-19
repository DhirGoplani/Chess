import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Enable socket pooling so nodemailer maintains a warm persistent TLS socket connection to Gmail SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  family: 4,
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateLimit: 14, // Max 14 emails per sec
  auth: {
    user: process.env.NODE_MAILER_EMAIL,
    pass: process.env.NODE_MAILER_PASSWORD,
  },
});

export default transporter;