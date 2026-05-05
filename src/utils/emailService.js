const { Resend } = require('resend');

exports.sendOtpEmail = async (to, otp) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY env var is not set');
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: 'SDK Academy <onboarding@resend.dev>',
    to,
    subject: 'Your Password Reset OTP',
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
  if (result?.error) {
    throw new Error(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
  }
  return result;
};
