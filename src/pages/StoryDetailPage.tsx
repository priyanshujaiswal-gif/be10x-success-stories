import { ArrowLeft, ExternalLink, Link2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { Avatar } from '../components/Avatar'
import { fetchPublishedStory } from '../lib/api'
import { useStoryDataVersion } from '../lib/useStoryDataVersion'
import { storyDomainLabel } from '../lib/filters'
import { useEmbeddableYouTubeVideo } from '../lib/useEmbeddableYouTubeVideo'
import { privacyEmbedUrl } from '../lib/youtube'
import { BRAND_NAME } from '../components/BrandMark'
import type { PublicSuccessStory } from '../types/story'

export function StoryDetailPage() {
  const { slug } = useParams({ from: '/success-stories/$slug' })
  const [story, setStory] = useState<PublicSuccessStory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    fetchPublishedStory(slug)
      .then((s) => {
        setStory(s)
        document.title = `${s.name} | ${BRAND_NAME} Success Stories`
      })
      .catch(() => setError('Story not found'))
      .finally(() => setLoading(false))
  }, [slug])

  const refreshStory = useCallback(() => {
    if (!slug) return
    fetchPublishedStory(slug)
      .then((s) => setStory(s))
      .catch(() => {})
  }, [slug])

  useStoryDataVersion(refreshStory, Boolean(slug) && !loading && !error)

  const videoId = useEmbeddableYouTubeVideo(story?.youtubeVideoUrl, story?.auditStatus)

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-white/60">Loading story…</p>
      </div>
    )
  }

  if (error || !story) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="font-display text-xl font-semibold">{error || 'Not found'}</p>
        <Link to="/" className="mt-4 inline-block text-brand-blue hover:underline">
          Back to Success Stories
        </Link>
      </div>
    )
  }

  return (
    <article className="pb-20">
      <div className="border-b border-brand-border bg-gradient-to-b from-brand-surface/80 to-brand-black">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-brand-blue"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Success Stories
          </Link>
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
            <Avatar
              name={story.name}
              photoUrl={story.photoUrl}
              photoVersion={story.updatedAt}
              className="mx-auto h-36 w-36 shrink-0 text-4xl sm:mx-0 sm:h-40 sm:w-40"
            />
            <div className="text-center sm:text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
                {storyDomainLabel(story)}
              </span>
              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{story.name}</h1>
              {story.jobRole && <p className="mt-2 text-lg text-white/75">{story.jobRole}</p>}
              {story.achievementTitle && (
                <p className="mt-6 font-display text-xl font-semibold leading-snug text-white sm:text-2xl">
                  {story.achievementTitle}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {story.quantifiedResult && (
          <section className="rounded-2xl border border-brand-blue/30 bg-brand-blue/5 p-6 sm:p-8">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-brand-blue">
              Achievement Highlight
            </h2>
            <p className="mt-4 font-display text-xl font-medium leading-relaxed sm:text-2xl">
              {story.quantifiedResult}
            </p>
          </section>
        )}

        {story.storySummary && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-bold">Their Story</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/80">{story.storySummary}</p>
          </section>
        )}

        {story.testimonialQuote && (
          <section className="mt-12 border-l-4 border-brand-blue pl-6">
            <h2 className="font-display text-2xl font-bold">Learner Quote</h2>
            <blockquote className="mt-4 text-xl italic leading-relaxed text-white/90">
              &ldquo;{story.testimonialQuote}&rdquo;
            </blockquote>
          </section>
        )}

        {videoId && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-bold">Watch Their Story</h2>
            <div className="mt-6 aspect-video overflow-hidden rounded-2xl border border-brand-border bg-black">
              <iframe
                title={`${story.name} success story video`}
                src={privacyEmbedUrl(videoId)}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </section>
        )}

        {story.linkedInUrl && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-bold">LinkedIn</h2>
            <a
              href={story.linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 font-medium text-brand-blue hover:underline"
            >
              <Link2 className="h-5 w-5" aria-hidden />
              View profile
              <ExternalLink className="h-4 w-4 opacity-60" aria-hidden />
            </a>
          </section>
        )}
      </div>
    </article>
  )
}
