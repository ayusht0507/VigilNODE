const nodemailer = require("nodemailer");

// ==========================================
// CREATE EMAIL TRANSPORTER
// ==========================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ==========================================
// VERIFY EMAIL CONNECTION
// ==========================================

async function verifyEmailConnection() {
  await transporter.verify();

  console.log("Email service connected successfully.");
}

// ==========================================
// SEND OTP EMAIL
// ==========================================

async function sendOtpEmail(email, otp, type = "signup") {
  const sender = `"VigilNODE" <${process.env.SMTP_FROM}>`;
  const isLogin = type === "login";
  const title = isLogin ? "Login Verification Code" : "Signup Email Verification";
  const purposeText = isLogin
    ? "to authenticate your VigilNODE session"
    : "to complete your VigilNODE account registration";

  await transporter.sendMail({
    from: sender,
    to: email,
    subject: "Your VigilNODE verification OTP",

    text: `Your VigilNODE verification code is: ${otp}

This code will expire in 10 minutes.

Use this code ${purposeText}. If you did not request this, you can ignore this email.`,

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 500px;
        margin: auto;
        padding: 24px;
        border: 1px solid #e2e5e9;
        border-radius: 12px;
        background: #ffffff;
      ">
        <h2 style="margin-top: 0; color: #111318;">${title}</h2>

        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
          Use the following 6-digit verification code ${purposeText}:
        </p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          padding: 16px 20px;
          background: #f4f5f7;
          text-align: center;
          margin: 20px 0;
          border-radius: 8px;
          color: #111318;
        ">
          ${otp}
        </div>

        <p style="color: #6b7280; font-size: 13px;">
          This code will expire in <strong>10 minutes</strong>.
        </p>

        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  console.log(`OTP email sent to: ${email}`);
}

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  verifyEmailConnection,
  sendOtpEmail,
};