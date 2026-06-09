'use strict';
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOtpEmail = async (to, otp) => {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Your OTP Code',
    text:    `Your OTP is: ${otp}. It expires in 5 minutes.`,
    html:    `<p>Your OTP is: <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
  });
};

module.exports = { sendOtpEmail };
