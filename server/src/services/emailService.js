import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(to, resetLink) {
  // No credentials configured: fall back to logging the link so the reset
  // flow still works end-to-end in an environment that hasn't set up email.
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[email] EMAIL_USER/EMAIL_PASS not set — logging the reset link instead of sending it.');
    console.log(`[email] Password reset link for ${to}: ${resetLink}`);
    return;
  }

  await getTransporter().sendMail({
    from: `"SUH Event Control Room" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your Event Control Room password',
    html: `
      <p>Someone requested a password reset for your Event Control Room admin account.</p>
      <p><a href="${resetLink}">Click here to reset your password</a>. This link expires in 30 minutes.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
