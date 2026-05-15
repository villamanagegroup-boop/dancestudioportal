import Link from 'next/link'

interface Props {
  label: string
  href?: string
  action?: string
  right?: React.ReactNode
}

export default function SectionHead({ label, href, action, right }: Props) {
  return (
    <div className="eyebrow-row">
      <span className="eyebrow">{label}</span>
      {right ?? (href && (
        <Link href={href} className="eyebrow-action">{action ?? 'View all →'}</Link>
      ))}
    </div>
  )
}
