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

export async function sendAccountInvite({
  to, firstName, role, inviterName, acceptUrl,
}: {
  to: string; firstName: string; role: 'parent' | 'instructor' | 'partner'
  inviterName: string; acceptUrl: string
}) {
  const subject = role === 'instructor'
    ? `You're invited to the Capital Core Dance Studio staff portal`
    : role === 'partner'
      ? `${inviterName} invited your business to partner with Capital Core Dance Studio`
      : `${inviterName} invited your family to Capital Core Dance Studio`
  const intro = role === 'instructor'
    ? `${inviterName} has invited you to join the Capital Core Dance Studio staff portal as an instructor.`
    : role === 'partner'
      ? `${inviterName} has invited your business to partner with Capital Core Dance Studio. Accept the invite to set up your partner portal — where you'll see bookings, events, and stay coordinated with the studio.`
      : `${inviterName} has invited your family to the Capital Core Dance Studio parent portal — where you'll enroll your dancer, manage billing, and stay in the loop on studio news.`
  await send({
    from: FROM(),
    to,
    subject,
    html: `
      <h2>You're invited, ${firstName}!</h2>
      <p>${intro}</p>
      <p>
        <a href="${acceptUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">
          Accept invitation →
        </a>
      </p>
      <p style="color:#666;font-size:13px;">This link expires in 7 days. If the button doesn't work, paste this into your browser: ${acceptUrl}</p>
      <p>— Capital Core Dance Studio</p>
    `,
  })
}

export async function sendTuitionPayLink({
  to, guardianName, amount, items, payUrl, studioName, periodLabel,
}: {
  to: string; guardianName: string; amount: number
  items: { label: string; amount: number }[]
  payUrl: string; studioName: string; periodLabel: string
}) {
  const rows = items.map(it =>
    `<tr><td style="padding:6px 0;color:#374151;">${it.label}</td>
     <td style="padding:6px 0;text-align:right;color:#111;">$${Number(it.amount).toFixed(2)}</td></tr>`
  ).join('')
  await send({
    from: FROM(),
    to,
    subject: `${periodLabel} tuition — ${studioName}`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;">
        <h2 style="color:#111;">${periodLabel} Tuition</h2>
        <p>Hi ${guardianName},</p>
        <p>Here is your tuition balance for ${periodLabel}. You can pay securely online using the button below.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;">
          ${rows}
          <tr><td style="padding:10px 0 0;border-top:1px solid #e5e7eb;font-weight:700;color:#111;">Total due</td>
              <td style="padding:10px 0 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:700;color:#111;">$${amount.toFixed(2)}</td></tr>
        </table>
        <p style="margin:20px 0;">
          <a href="${payUrl}" style="display:inline-block;background:#2dd4bf;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;">
            Pay $${amount.toFixed(2)} →
          </a>
        </p>
        <p style="color:#666;font-size:12px;">If the button doesn't work, paste this link into your browser:<br>${payUrl}</p>
        <p>Thank you,<br>${studioName}</p>
      </div>
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
