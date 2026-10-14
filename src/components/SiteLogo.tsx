import { Link } from '@tanstack/react-router'

const LOGO_SRC = '/be10x-logo.svg'
/** Official mark from https://be10x.com/ (Layer_1.svg) */
const LOGO_ASPECT = 63 / 36

type Props = {
  className?: string
  showTagline?: boolean
  logoHeightClass?: string
}

export function SiteLogo({
  className = '',
  showTagline = true,
  logoHeightClass = 'h-8 sm:h-9',
}: Props) {
  return (
    <Link to="/" className={`group inline-flex items-center gap-3 ${className}`}>
      <img
        src={LOGO_SRC}
        alt="be10X"
        width={Math.round(36 * LOGO_ASPECT)}
        height={36}
        className={`${logoHeightClass} w-auto shrink-0 transition-opacity group-hover:opacity-90`}
      />
      {showTagline && (
        <span className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
          Success Stories
        </span>
      )}
    </Link>
  )
}
