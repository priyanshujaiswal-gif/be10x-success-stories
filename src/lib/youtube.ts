const YOUTUBE_URL_PLACEHOLDERS = new Set([
  'n/a',
  'na',
  'none',
  '-',
  'tbd',
  'pending',
  'no video',
  'no link',
  'not available',
  'unavailable',
  'private',
])

/** True when the story has a public, embeddable YouTube URL (hide section otherwise). */
export function hasEmbeddableYouTubeVideo(
  youtubeVideoUrl: string | null | undefined,
  auditStatus?: string | null,
): boolean {
  if (!youtubeVideoUrl) return false
  const trimmed = youtubeVideoUrl.trim()
  if (!trimmed) return false

  const lower = trimmed.toLowerCase()
  if (YOUTUBE_URL_PLACEHOLDERS.has(lower)) return false
  if (lower.includes('private') || lower.includes('unlisted')) return false

  if (auditStatus) {
    const audit = auditStatus.trim().toLowerCase()
    if (audit === 'private' || audit.includes('video private') || audit.includes('private video')) {
      return false
    }
  }

  return extractYouTubeId(trimmed) !== null
}

export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null

  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function privacyEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`
}

/** YouTube serves a generic gray placeholder at 120×90 for missing/private/unavailable videos. */
const YOUTUBE_PLACEHOLDER_THUMB_WIDTH = 120
const YOUTUBE_PLACEHOLDER_THUMB_HEIGHT = 90

export function youtubeHqThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

export function isYouTubePlaceholderThumbnail(width: number, height: number): boolean {
  return width <= YOUTUBE_PLACEHOLDER_THUMB_WIDTH && height <= YOUTUBE_PLACEHOLDER_THUMB_HEIGHT
}

const THUMBNAIL_CHECK_TIMEOUT_MS = 10_000

/** Resolves true when hqdefault.jpg loads and is not YouTube's missing-video placeholder. */
export function checkYouTubeThumbnailAvailable(videoId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    let settled = false

    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(ok)
    }

    const timer = setTimeout(() => finish(false), THUMBNAIL_CHECK_TIMEOUT_MS)

    img.onload = () => {
      finish(!isYouTubePlaceholderThumbnail(img.naturalWidth, img.naturalHeight))
    }
    img.onerror = () => finish(false)
    img.src = youtubeHqThumbnailUrl(videoId)
  })
}
