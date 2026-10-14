type Props = {
  className?: string
  suffix?: string
}

/** Official wordmark: be10X (capital X). */
export function BrandMark({ className = '', suffix }: Props) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      be<span className="text-brand-blue">10</span>X{suffix}
    </span>
  )
}

export const BRAND_NAME = 'be10X'
