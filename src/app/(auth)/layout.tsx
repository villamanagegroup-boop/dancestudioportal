import Logo from '@/components/Logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size={96} rounded={20} className="mx-auto" />
          <h1 className="h1 mt-4 grad-text">Capital Core Dance Studio</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
