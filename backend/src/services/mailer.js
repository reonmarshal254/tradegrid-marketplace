'use strict';
const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

function isConfigured() {
  return Boolean(env.brevoApiKey || (env.smtp.host && env.smtp.user));
}

function frontendUrl() {
  return env.frontendUrl;
}

async function sendMail({ to, subject, html, text }) {
  if (!isConfigured()) {
    console.warn('[mailer] not configured, skipping send to', to);
    return { skipped: true };
  }

  // Brevo API (sends to any email, 300/day free)
  if (env.brevoApiKey) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.brevoApiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'TRADEGRID', email: env.brevoSender || 'oyoookoth42@gmail.com' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brevo API error ${res.status}: ${body}`);
    }
    return res.json();
  }

  // Fallback: SMTP via Nodemailer
  const info = await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html,
  });
  return info;
}

async function sendVerificationEmail(user, token) {
  const link = `${frontendUrl()}/verify-email?token=${token}`;
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
    <h2 style="color:#111827">Welcome to TRADEGRID!</h2>
    <p style="color:#374151">Hi ${user.name}, please confirm your email address to start buying and selling pre-owned items.</p>
    <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Verify my email</a>
    <p style="color:#9ca3af;font-size:12px">This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
  </div>`;
  return sendMail({ to: user.email, subject: 'Verify your email - TRADEGRID', html });
}

async function sendVerificationOTP(user, otp) {
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
    <h2 style="color:#111827">Verify your email</h2>
    <p style="color:#374151">Hi ${user.name}, enter the code below to verify your TRADEGRID account.</p>
    <div style="background:#f3f4f6;padding:20px;border-radius:8px;text-align:center;margin:20px 0">
      <p style="color:#6b7280;font-size:14px;margin:0 0 8px 0">Your verification code is:</p>
      <div style="font-size:32px;font-weight:bold;color:#4f46e5;letter-spacing:8px;font-family:monospace">${otp}</div>
    </div>
    <p style="color:#9ca3af;font-size:12px">This code expires in 15 minutes. If you did not create an account, you can safely ignore this email.</p>
  </div>`;
  return sendMail({ to: user.email, subject: 'Verify your email - TRADEGRID', html });
}

async function sendPasswordResetOTP(user, otp) {
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
    <h2 style="color:#111827">Reset your password</h2>
    <p style="color:#374151">Hi ${user.name}, we received a request to reset your password.</p>
    <div style="background:#f3f4f6;padding:20px;border-radius:8px;text-align:center;margin:20px 0">
      <p style="color:#6b7280;font-size:14px;margin:0 0 8px 0">Your password reset code is:</p>
      <div style="font-size:32px;font-weight:bold;color:#4f46e5;letter-spacing:8px;font-family:monospace">${otp}</div>
    </div>
    <p style="color:#374151">Enter this code on the password reset page to continue.</p>
    <p style="color:#9ca3af;font-size:12px">This code expires in 1 hour. If you did not request this, you can safely ignore it.</p>
  </div>`;
  return sendMail({ to: user.email, subject: 'Your password reset code - TRADEGRID', html });
}

async function sendWelcomeEmail(user) {
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
    <h2 style="color:#111827">Welcome to TRADEGRID!</h2>
    <p style="color:#374151">Your account has been verified, ${user.name}. Post your first item and start selling today.</p>
  </div>`;
  return sendMail({ to: user.email, subject: 'Your account is verified - TRADEGRID', html });
}

async function sendEmailChangeEmail(user, newEmail, token) {
  const link = `${frontendUrl()}/settings?email-change=${token}`;
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
    <h2 style="color:#111827">Confirm your new email</h2>
    <p style="color:#374151">Hi ${user.name}, click below to confirm that <strong>${newEmail}</strong> becomes your new TRADEGRID account email.</p>
    <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Confirm new email</a>
    <p style="color:#9ca3af;font-size:12px">This link expires in 1 hour. If you did not request this change, you can safely ignore it.</p>
  </div>`;
  return sendMail({ to: newEmail, subject: 'Confirm your new email - TRADEGRID', html });
}

async function send(to, subject, html, text) {
  return sendMail({ to, subject, html, text });
}

module.exports = {
  isConfigured,
  sendVerificationEmail,
  sendVerificationOTP,
  sendPasswordResetOTP,
  sendWelcomeEmail,
  sendEmailChangeEmail,
  send,
  sendMail,
};
