// Real email delivery via Gmail SMTP. Reads credentials from the environment
// (backend/.env, see .env.example) — until GMAIL_USER/GMAIL_APP_PASSWORD are
// set this just logs and skips, so the rest of the app works fine without
// them. Drop the two vars in and emails start going out with no code change.
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

async function sendMail(to, subject, text, html) {
  if (!to) return;
  const t = getTransporter();
  if (!t) {
    console.log(`[mailer] GMAIL_USER/GMAIL_APP_PASSWORD not set — skipping email to ${to}: "${subject}"`);
    return;
  }
  try {
    await t.sendMail({ from: process.env.GMAIL_USER, to, subject, text, html });
    console.log(`[mailer] Sent "${subject}" to ${to}.`);
  } catch (err) {
    console.warn(`[mailer] Failed to send "${subject}" to ${to}:`, err.message);
  }
}

module.exports = { sendMail };
