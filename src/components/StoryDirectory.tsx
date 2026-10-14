import { RotateCcw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { PublicSuccessStory } from '../types/story'
import { defaultFilters, filterStories, uniqueValues, type StoryFilters } from '../lib/filters'
import { StoryCard } from './StoryCard'

type Props = {
  stories: PublicSuccessStory[]
}

const focusRing =
  'focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue'

export function StoryDirectory({ stories }: Props) {
  const [filters, setFilters] = useState<StoryFilters>(defaultFilters)

  const domains = useMemo(() => uniqueValues(stories, 'domain'), [stories])
  const achievementTypes = useMemo(() => uniqueValues(stories, 'achievementType'), [stories])
  const hasDates = useMemo(() => stories.some((s) => s.sourceDate), [stories])

  const filtered = useMemo(() => filterStories(stories, filters), [stories, filters])

  const reset = () => setFilters(defaultFilters)

  return (
    <section id="directory" className="scroll-mt-24 border-t border-brand-border bg-brand-black">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Stories Worth Celebrating</h2>
        <p className="mt-2 text-white/60">Search and filter learner achievements.</p>

        <div className="mt-6 space-y-4 rounded-2xl border border-brand-border bg-brand-surface/40 p-4 sm:p-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
              placeholder="Search by name, job role, domain or achievement..."
              className={`w-full rounded-xl border border-brand-border bg-brand-black py-3 pl-12 pr-4 text-white placeholder:text-white/40 ${focusRing}`}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={filters.domain}
              onChange={(e) => setFilters((f) => ({ ...f, domain: e.target.value }))}
              className={`rounded-xl border border-brand-border bg-brand-black px-3 py-2.5 text-sm ${focusRing}`}
              aria-label="Filter by domain"
            >
              <option value="">All domains</option>
              {domains.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={filters.achievementType}
              onChange={(e) => setFilters((f) => ({ ...f, achievementType: e.target.value }))}
              className={`rounded-xl border border-brand-border bg-brand-black px-3 py-2.5 text-sm ${focusRing}`}
              aria-label="Filter by achievement type"
            >
              <option value="">All achievement types</option>
              {achievementTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              type="search"
              value={filters.jobRole}
              onChange={(e) => setFilters((f) => ({ ...f, jobRole: e.target.value }))}
              placeholder="Job role..."
              className={`rounded-xl border border-brand-border bg-brand-black px-3 py-2.5 text-sm ${focusRing}`}
              aria-label="Filter by job role"
            />
            <select
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as StoryFilters['sort'] }))}
              className={`rounded-xl border border-brand-border bg-brand-black px-3 py-2.5 text-sm ${focusRing}`}
              aria-label="Sort stories"
            >
              <option value="featured">Featured First</option>
              <option value="alphabetical">Alphabetical</option>
              {hasDates && <option value="recent">Most Recent</option>}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-sm text-white/50">
              {filtered.length} of {stories.length} stories
            </p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-blue hover:underline"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-brand-border p-10 text-center">
            <p className="font-display text-lg font-semibold">No matches</p>
            <p className="mt-1 text-sm text-white/50">Try resetting filters.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
