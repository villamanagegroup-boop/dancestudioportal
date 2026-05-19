import { Resend } from 'resend'

let _resend: Resend | null = null

function getResend(): Resend | null {
  if (_resend) return _resend
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  _resend = new Resend(key)
  return _resend
}

async function send(payload: { from: string; to: string; subject: string; html: string }) {
  const client = getResend()
  if (!client) {
    console.warn('[resend] RESEND_API_KEY not set — skipping email', { to: payload.to, subject: payload.subject })
    return
  }
  if (!payload.from) {
    console.warn('[resend] RESEND_FROM_EMAIL not set — skipping email', { to: payload.to, subject: payload.subject })
    return
  }
  await client.emails.send(payload)
}

const FROM = () => process.env.RESEND_FROM_EMAIL ?? ''

export async function sendEnrollmentConfirmation({
  to, guardianName, studentName, className, startDate, tuition,
}: {
  to: string; guardianName: string; studentName: string
  className: string; startDate: string; tuition: number
}) {
  await send({
    from: FROM(),
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
  await send({
    from: FROM(),
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
  await send({
    from: FROM(),
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
  await send({
    from: FROM(),
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
  await send({
    from: FROM(),
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
