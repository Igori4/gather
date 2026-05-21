import { Resend } from 'resend';

const FROM = process.env.EMAIL_FROM ?? 'noreply@gather.app';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({ from: FROM, to, subject, html }).then(() => undefined);
}

export async function sendActivationEmail(
  email: string,
  token: string,
): Promise<void> {
  const url = `${FRONTEND_URL}/activate?token=${token}`;
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n[DEV] Activation link for ${email}:\n      ${url}\n`);
    return;
  }
  await sendEmail(
    email,
    'Activate your Gather account',
    `<p>Welcome! <a href="${url}">Activate your account</a>. Expires in 24 hours.</p>`,
  );
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const url = `${FRONTEND_URL}/reset-password?token=${token}`;
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n[DEV] Password reset link for ${email}:\n      ${url}\n`);
    return;
  }
  await sendEmail(
    email,
    'Reset your Gather password',
    `<p><a href="${url}">Reset your password</a>. Expires in 1 hour.</p>`,
  );
}

export async function sendEmailChangeConfirmation(
  newEmail: string,
  token: string,
): Promise<void> {
  const url = `${FRONTEND_URL}/confirm-email?token=${token}`;
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `\n[DEV] Email change confirmation for ${newEmail}:\n      ${url}\n`,
    );
    return;
  }
  await sendEmail(
    newEmail,
    'Confirm your new Gather email address',
    `<p><a href="${url}">Confirm your new email</a>. Expires in 1 hour.</p>`,
  );
}

export async function sendEmailChangeNotification(
  oldEmail: string,
): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n[DEV] Email change notification sent to ${oldEmail}\n`);
    return;
  }
  await sendEmail(
    oldEmail,
    'Your Gather email address was changed',
    `<p>Your email was changed. If this wasn't you, contact support immediately.</p>`,
  );
}
