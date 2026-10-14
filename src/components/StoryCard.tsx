import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { PublicSuccessStory } from '../types/story'
import { storyDomainLabel } from '../lib/filters'
import { Avatar } from './Avatar'

type Props = {
  story: PublicSuccessStory
  className?: string
}

export function StoryCard({ story, className = '' }: Props) {
  const storyLink = {
    to: '/success-stories/$slug' as const,
    params: { slug: story.slug },
  }
  const title = story.achievementTitle || 'View achievement'

  return (
    <article
      className={`group flex h-full flex-col rounded-2xl border border-brand-border bg-brand-surface/50 p-5 pt-6 transition-all duration-300 hover:border-brand-blue/35 hover:shadow-lg hover:shadow-brand-blue/10 ${className}`}
    >
      <div className="flex flex-col items-center text-center">
        <Link {...storyLink} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue rounded-full">
          <Avatar
            name={story.name}
            photoUrl={story.photoUrl}
            photoVersion={story.updatedAt}
            className="h-28 w-28 text-3xl sm:h-32 sm:w-32"
          />
        </Link>

        <Link
          {...storyLink}
          className="mt-4 font-display text-xl font-bold leading-tight transition-colors hover:text-brand-blue"
        >
          {story.name}
        </Link>

        {story.jobRole && (
          <p className="mt-1 line-clamp-2 text-sm text-white/60">{story.jobRole}</p>
        )}

        <span className="mt-2 text-xs font-medium uppercase tracking-wide text-brand-blue">
          {storyDomainLabel(story)}
        </span>
      </div>

      <div className="mt-5 flex flex-1 flex-col">
        <Link
          {...storyLink}
          className="line-clamp-3 text-center font-display text-base font-semibold leading-snug text-white/90 transition-colors group-hover:text-brand-blue"
        >
          {title}
        </Link>

        <Link
          {...storyLink}
          className="mt-5 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-blue transition-all group-hover:gap-2.5"
        >
          Read their full story
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      </div>
    </article>
  )
}
