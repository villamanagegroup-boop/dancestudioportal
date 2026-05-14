export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="brand-mark mx-auto" style={{ width: 64, height: 64, borderRadius: 18 }}>
            <span className="text-white text-2xl font-bold">CC</span>
          </div>
          <h1 className="h1 mt-4 grad-text">Capital Core Dance Studio</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
