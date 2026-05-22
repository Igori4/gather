import { Resend } from 'resend'

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  // In development, always log the URL so you can test without a real email service.
  // Check your terminal (or `docker logs gather_api`) for the reset link.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n[DEV] Password reset link for ${email}:\n      ${resetUrl}\n`)
  }

  if (process.env.NODE_ENV === 'production' && !process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required in production')
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'noreply@gather.app',
    to: email,
    subject: 'Reset your Gather password',
    html: `
      <p>You requested a password reset for your Gather account.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
  })
}
