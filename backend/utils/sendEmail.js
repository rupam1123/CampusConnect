// backend/utils/sendEmail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // or configure custom SMTP
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail(to, subject, htmlOrText) {
  const msg = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text: htmlOrText
  };
  // you can set html: "<b>...</b>" instead of text
  return transporter.sendMail(msg);
}

module.exports = sendEmail;