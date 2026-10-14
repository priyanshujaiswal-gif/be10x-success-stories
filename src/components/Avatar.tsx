type Props = {
  name: string
  photoUrl?: string | null
  /** Bust browser cache when the photo file or URL changes (e.g. story updatedAt). */
  photoVersion?: string | null
  className?: string
  /** Circular learner photo (default). */
  circular?: boolean
}

function withPhotoVersion(url: string, photoVersion?: string | null): string {
  if (!photoVersion) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${encodeURIComponent(photoVersion)}`
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const basePhoto =
  'object-cover object-center bg-brand-surface ring-2 ring-white/10 ring-offset-2 ring-offset-brand-black'

export function Avatar({
  name,
  photoUrl,
  photoVersion,
  className = '',
  circular = true,
}: Props) {
  const shape = circular ? 'rounded-full' : 'rounded-2xl'

  if (photoUrl) {
    return (
      <img
        src={withPhotoVersion(photoUrl, photoVersion)}
        alt=""
        className={`${basePhoto} ${shape} ${className}`}
        loading="lazy"
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center border border-brand-border bg-gradient-to-br from-brand-surface via-brand-black to-brand-blue/10 font-display font-semibold text-brand-blue ${shape} ${className}`}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}
