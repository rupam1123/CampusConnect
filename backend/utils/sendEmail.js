// backend/utils/sendEmail.js
const nodemailer = require("nodemailer");

async function sendEmail(to, subject, htmlOrText) {
  // The Sites deployment does not import this optional standalone transport.
  // An inherited .env must never silently enable another person's mailbox.
  if (process.env.ENABLE_EMAIL_DELIVERY !== 'true') throw new Error('Standalone email delivery is disabled. Configure your own sender and explicitly enable it.');
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const sender = process.env.EMAIL_USER?.trim().toLowerCase();
  if (!owner || sender !== owner || !process.env.EMAIL_PASS) throw new Error('EMAIL_USER must match your configured OWNER_EMAIL and use your own app password.');
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: sender, pass: process.env.EMAIL_PASS }, disableFileAccess: true, disableUrlAccess: true });
  const msg = {
    from: sender,
    to,
    subject,
    text: htmlOrText
  };
  // you can set html: "<b>...</b>" instead of text
  return transporter.sendMail(msg);
}

module.exports = sendEmail;
