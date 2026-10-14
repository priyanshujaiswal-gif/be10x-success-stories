import { useCallback, useEffect, useState } from 'react'
import { Hero } from '../components/Hero'
import { StoryDirectory } from '../components/StoryDirectory'
import { fetchPublishedStories } from '../lib/api'
import { useStoryDataVersion } from '../lib/useStoryDataVersion'
import type { PublicSuccessStory } from '../types/story'

export function HomePage() {
  const [stories, setStories] = useState<PublicSuccessStory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStories = () => {
    fetchPublishedStories()
      .then(setStories)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load stories'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadStories()
  }, [])

  const refreshStories = useCallback(() => {
    fetchPublishedStories()
      .then(setStories)
      .catch(() => {})
  }, [])

  useStoryDataVersion(refreshStories, !loading && !error)

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-white/60">Loading success stories…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-brand-blue">{error}</p>
        <p className="mt-2 text-sm text-white/60">
          Ensure the API server is running (<code className="text-white/80">npm run dev:all</code>).
        </p>
      </div>
    )
  }

  return (
    <>
      <Hero />
      <StoryDirectory stories={stories} />
    </>
  )
}
