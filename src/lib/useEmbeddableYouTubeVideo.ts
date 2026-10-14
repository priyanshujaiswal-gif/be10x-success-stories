import { useEffect, useState } from 'react'
import {
  checkYouTubeThumbnailAvailable,
  extractYouTubeId,
  hasEmbeddableYouTubeVideo,
} from './youtube'

type ThumbResult = { id: string; ok: boolean }

/**
 * Sync URL/audit checks first; then verifies the video has a real YouTube thumbnail
 * (private/missing videos get a 120×90 placeholder). Section stays hidden until confirmed.
 */
export function useEmbeddableYouTubeVideo(
  youtubeVideoUrl: string | null | undefined,
  auditStatus?: string | null,
): string | null {
  const candidate = hasEmbeddableYouTubeVideo(youtubeVideoUrl, auditStatus)
    ? extractYouTubeId(youtubeVideoUrl)
    : null

  const [thumbResult, setThumbResult] = useState<ThumbResult | null>(null)

  useEffect(() => {
    if (!candidate) return

    let cancelled = false
    checkYouTubeThumbnailAvailable(candidate).then((ok) => {
      if (!cancelled) setThumbResult({ id: candidate, ok })
    })

    return () => {
      cancelled = true
    }
  }, [candidate])

  if (!candidate) return null
  if (!thumbResult || thumbResult.id !== candidate) return null
  return thumbResult.ok ? candidate : null
}
