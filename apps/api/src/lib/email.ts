import { Resend } from 'resend'

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
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
