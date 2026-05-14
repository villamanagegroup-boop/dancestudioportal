import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEnrollmentConfirmation, sendInvoiceReminder } from '@/lib/resend'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  const { type, ...data } = body

  try {
    switch (type) {
      case 'enrollment_confirmation': {
        const { data: enrollment } = await supabase
          .from('enrollments').select(`
            *, student:students(first_name, last_name),
            class:classes(name, monthly_tuition, season:seasons(start_date))
          `).eq('id', data.enrollmentId).single()

        const { data: guardian } = await supabase
          .from('profiles').select('email, first_name, last_name').eq('id', data.guardianId).single()

        if (enrollment && guardian) {
          const cls = enrollment.class as any
          const student = enrollment.student as any
          await sendEnrollmentConfirmation({
            to: guardian.email,
            guardianName: `${guardian.first_name} ${guardian.last_name}`,
            studentName: `${student.first_name} ${student.last_name}`,
            className: cls.name,
            startDate: cls.season?.start_date ?? 'TBD',
            tuition: cls.monthly_tuition,
          })
        }
        break
      }

      case 'invoice_reminder': {
        const { data: invoice } = await supabase
          .from('invoices').select('*, guardian:profiles(email, first_name, last_name)')
          .eq('id', data.invoiceId).single()

        if (invoice?.guardian) {
          const g = invoice.guardian as any
          await sendInvoiceReminder({
            to: g.email,
            guardianName: `${g.first_name} ${g.last_name}`,
            amount: invoice.amount,
            dueDate: invoice.due_date ?? 'soon',
            invoiceId: invoice.id,
          })
        }
        break
      }

      case 'announcement': {
        // Store in communications table and send
        await supabase.from('communications').insert({
          body: data.body,
          subject: data.subject,
          comm_type: data.comm_type ?? 'email',
          target_all: data.target_all ?? true,
          target_class_id: data.target_class_id || null,
          sent_at: data.scheduled_for ? null : new Date().toISOString(),
          scheduled_for: data.scheduled_for || null,
        })
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
