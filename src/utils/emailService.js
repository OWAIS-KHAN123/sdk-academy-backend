// Email service — uses Brevo's transactional HTTPS API.
// HTTPS works on Render free tier (port 443), unlike SMTP which is blocked.
// No extra npm package required: Node 18+ has native fetch.

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

exports.sendOtpEmail = async (to, otp) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY env var is not set');
  }
  if (!process.env.EMAIL_USER) {
    throw new Error('EMAIL_USER env var must be set (the verified Brevo sender email)');
  }

  const payload = {
    sender: { name: 'Sadiq Digital Academy', email: process.env.EMAIL_USER },
    to: [{ email: to }],
    subject: 'Your Sadiq Digital Academy Password Reset Code',
    textContent:
      `Your Sadiq Digital Academy password reset code is: ${otp}\n\n` +
      `This code expires in 10 minutes. If you didn't request this, ` +
      `you can safely ignore this email.`,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e1e8f5;border-radius:12px;">
        <h2 style="color:#0a2463;margin-bottom:8px;">Password Reset</h2>
        <p style="color:#1e4d7b;margin-bottom:24px;">Use the OTP below to reset your Sadiq Digital Academy password. It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#f0f6ff;border-radius:10px;padding:24px;text-align:center;letter-spacing:12px;font-size:36px;font-weight:bold;color:#007aff;">
          ${otp}
        </div>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  const response = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Brevo API ${response.status}: ${errorBody || response.statusText}`);
  }

  // Brevo returns { messageId: '<...@brevo.com>' }
  return await response.json();
};
