import PaymentMethodsManager from '@/components/portal/PaymentMethodsManager'

export default function ParentPaymentMethodsPage() {
  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Billing</p>
        <h1 className="h1 mt-2" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>Payment methods.</h1>
        <p className="mt-1.5" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
          Save a card for faster checkout on future invoices.
        </p>
      </div>
      <PaymentMethodsManager />
    </div>
  )
}
