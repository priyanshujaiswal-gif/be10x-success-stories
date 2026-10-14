import { useEffect, useRef } from 'react'
import { fetchStoriesDataVersion } from './api'

const POLL_MS = 60_000

/** Refetch when SQLite/JSON data version changes (e.g. after sheet import). */
export function useStoryDataVersion(onChange: () => void, enabled = true) {
  const versionRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    const tick = async () => {
      try {
        const { version } = await fetchStoriesDataVersion()
        if (cancelled) return
        if (versionRef.current !== null && version !== versionRef.current) {
          onChange()
        }
        versionRef.current = version
      } catch {
        // API may be down during import; ignore until next poll
      }
    }

    void tick()
    const id = window.setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, onChange])
}
