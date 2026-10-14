import type { PublicSuccessStory, StorySort } from '../types/story'

export type StoryFilters = {
  query: string
  domain: string
  achievementType: string
  jobRole: string
  sort: StorySort
}

export const defaultFilters: StoryFilters = {
  query: '',
  domain: '',
  achievementType: '',
  jobRole: '',
  sort: 'featured',
}

function haystack(story: PublicSuccessStory): string {
  return [
    story.name,
    story.jobRole,
    story.domain,
    story.domainCategory,
    story.achievementType,
    story.achievementTitle,
    story.quantifiedResult,
    story.shortSummary,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function filterStories(
  stories: PublicSuccessStory[],
  filters: StoryFilters,
): PublicSuccessStory[] {
  let result = stories.filter((s) => {
    const q = filters.query.trim().toLowerCase()
    if (q && !haystack(s).includes(q)) return false
    if (filters.domain && storyDomainLabel(s) !== filters.domain) return false
    if (filters.achievementType && (s.achievementType || '') !== filters.achievementType)
      return false
    if (filters.jobRole) {
      const jr = (s.jobRole || '').toLowerCase()
      if (!jr.includes(filters.jobRole.toLowerCase())) return false
    }
    return true
  })

  result = [...result].sort((a, b) => compareStories(a, b, filters.sort))
  return result
}

function compareStories(a: PublicSuccessStory, b: PublicSuccessStory, sort: StorySort): number {
  if (sort === 'alphabetical') {
    return a.name.localeCompare(b.name)
  }
  if (sort === 'recent') {
    const da = a.sourceDate || ''
    const db = b.sourceDate || ''
    if (da && db) return db.localeCompare(da)
    if (da) return -1
    if (db) return 1
    return a.name.localeCompare(b.name)
  }
  const oa = a.displayOrder ?? 9999
  const ob = b.displayOrder ?? 9999
  if (oa !== ob) return oa - ob
  if (a.featured !== b.featured) return a.featured ? -1 : 1
  return a.name.localeCompare(b.name)
}

export function storyDomainLabel(s: PublicSuccessStory): string {
  return s.domainCategory || s.domain || 'General'
}

export function uniqueValues(stories: PublicSuccessStory[], key: 'domain' | 'achievementType') {
  const set = new Set<string>()
  for (const s of stories) {
    if (key === 'domain') {
      set.add(storyDomainLabel(s))
    } else if (s.achievementType) {
      set.add(s.achievementType)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}
