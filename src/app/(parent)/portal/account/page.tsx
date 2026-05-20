import AccountProfileForm from '@/components/admin/AccountProfileForm'

export default function ParentAccountPage() {
  return (
    <div>
      <div className="mb-7">
        <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Account</p>
        <h1 className="h1 mt-2" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>My account.</h1>
        <p className="mt-1.5" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
          Update your name and contact details.
        </p>
      </div>
      <AccountProfileForm />
    </div>
  )
}
