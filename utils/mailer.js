const nodemailer = require("nodemailer");

// Sends mail through any SMTP account (Gmail app password, Brevo, Resend SMTP…).
// Required env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS. Optional: MAIL_FROM.
// When SMTP is not configured (local development), the email is printed to the
// server console instead, so the verification link can still be opened.
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

function appUrl() {
  const fromEnv = process.env.APP_URL || (process.env.CLIENT_URL || "").split(",")[0];
  return (fromEnv || "http://localhost:5173").trim().replace(/\/$/, "");
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[mailer] SMTP not configured — email not sent.\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return { delivered: false };
  }
  await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
  return { delivered: true };
}

async function sendVerificationEmail(user, rawToken) {
  const link = `${appUrl()}/verify-email/${rawToken}`;
  const name = user.firstName || user.username;
  return sendMail({
    to: user.email,
    subject: "Verify your CodeMentorX email",
    text: `Hi ${name},\n\nPlease confirm your email address for CodeMentorX by opening this link:\n${link}\n\nThe link expires in 24 hours. If you did not create an account, ignore this email.`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Please confirm your email address for CodeMentorX.</p><p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#6E8BF5;color:#fff;border-radius:8px;text-decoration:none">Verify my email</a></p><p>Or open this link: ${link}</p><p>The link expires in 24 hours. If you did not create an account, ignore this email.</p>`,
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

module.exports = { sendMail, sendVerificationEmail };
