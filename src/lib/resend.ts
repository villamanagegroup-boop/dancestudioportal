import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEnrollmentConfirmation({
  to, guardianName, studentName, className, startDate, tuition,
}: {
  to: string; guardianName: string; studentName: string
  className: string; startDate: string; tuition: number
}) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Enrollment Confirmed — ${studentName} in ${className}`,
    html: `
      <h2>Enrollment Confirmed!</h2>
      <p>Hi ${guardianName},</p>
      <p>${studentName} has been successfully enrolled in <strong>${className}</strong>.</p>
      <p><strong>Start date:</strong> ${startDate}</p>
      <p><strong>Monthly tuition:</strong> $${tuition}</p>
      <p>Log in to your parent portal to manage enrollments and billing.</p>
      <p>— Capital Core Dance Studio</p>
    `,
  })
}

export async function sendInvoiceReminder({
  to, guardianName, amount, dueDate, invoiceId,
}: {
  to: string; guardianName: string; amount: number
  dueDate: string; invoiceId: string
}) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Payment Due — Capital Core Dance Studio`,
    html: `
      <h2>Payment Reminder</h2>
      <p>Hi ${guardianName},</p>
      <p>You have a payment of <strong>$${amount}</strong> due on <strong>${dueDate}</strong>.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/portal/billing?invoice=${invoiceId}">Pay Now →</a></p>
      <p>— Capital Core Dance Studio</p>
    `,
  })
}

export async function sendClassAnnouncement({
  to, subject, body, className,
}: {
  to: string; subject: string; body: string; className: string
}) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject,
    html: `
      <h2>${subject}</h2>
      <p style="color:#666;font-size:13px;">Regarding <strong>${className}</strong></p>
      <div>${body.replace(/\n/g, '<br>')}</div>
      <p>— Capital Core Dance Studio</p>
    `,
  })
}

export async function sendStudioAnnouncement({
  to, subject, body,
}: {
  to: string; subject: string; body: string
}) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject,
    html: `
      <h2>${subject}</h2>
      <div>${body.replace(/\n/g, '<br>')}</div>
      <p>— Capital Core Dance Studio</p>
    `,
  })
}

export async function sendPaymentFailedEmail({
  to, guardianName, amount,
}: {
  to: string; guardianName: string; amount: number
}) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Payment Failed — Capital Core Dance Studio`,
    html: `
      <h2>Payment Failed</h2>
      <p>Hi ${guardianName},</p>
      <p>We were unable to process your payment of <strong>$${amount}</strong>.</p>
      <p>Please <a href="${process.env.NEXT_PUBLIC_APP_URL}/portal/billing">update your payment method</a>.</p>
      <p>— Capital Core Dance Studio</p>
    `,
  })
}
