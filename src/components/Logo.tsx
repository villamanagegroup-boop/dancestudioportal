type Props = {
  /** Pixel size of the (square) mark. */
  size?: number
  className?: string
  /** Corner radius in px. */
  rounded?: number
}

/** The Capital Core Dance Studio shield logo. Served from /public/logo.png. */
export default function Logo({ size = 38, className = '', rounded = 10 }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Capital Core Dance Studio"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain', borderRadius: rounded, flexShrink: 0 }}
    />
  )
}
