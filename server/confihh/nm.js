import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// fix: the "service: gmail" shorthand lets nodemailer pick smtp.gmail.com's
// resolved address itself, and on hosts with no IPv6 egress (e.g. Render's
// free tier) that can resolve to an IPv6 (AAAA) address, causing every send
// to fail immediately with "connect ENETUNREACH ...:465 - Local (:::0)"
// before credentials are ever checked. Spelling out host/port/secure lets us
// pin `family: 4` so the underlying socket only ever connects over IPv4.
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    family: 4,
    auth:{
        user: process.env.NODE_MAILER_EMAIL,
        pass: process.env.NODE_MAILER_PASSWORD,
    },
});

export default transporter;