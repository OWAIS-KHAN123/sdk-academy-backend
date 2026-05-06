const nodemailer = require('nodemailer');

const buildTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('EMAIL_USER and EMAIL_PASSWORD env vars must be set');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      // Gmail App Password (16 chars). Spaces in the env value are tolerated by Gmail.
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

exports.sendOtpEmail = async (to, otp) => {
  const transporter = buildTransporter();

  const info = await transporter.sendMail({
    from: `SDK Academy <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your SDK Academy Password Reset Code',
    text: `Your SDK Academy password reset code is: ${otp}\n\nThis code expires in 10 minutes. If you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e1e8f5;border-radius:12px;">
        <h2 style="color:#0a2463;margin-bottom:8px;">Password Reset</h2>
        <p style="color:#1e4d7b;margin-bottom:24px;">Use the OTP below to reset your SDK Academy password. It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#f0f6ff;border-radius:10px;padding:24px;text-align:center;letter-spacing:12px;font-size:36px;font-weight:bold;color:#007aff;">
          ${otp}
        </div>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  return info;
};
