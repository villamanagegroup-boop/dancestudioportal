import AccountProfileForm from '@/components/admin/AccountProfileForm'

export default function PartnerAccountPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Account</p>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>My account</h1>
        <p style={{ fontSize: 14, color: '#666', marginTop: 4 }}>Update your contact details.</p>
      </div>
      <AccountProfileForm />
    </div>
  )
}
