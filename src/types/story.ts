export type PublicationStatus = 'published' | 'draft'

export type PublicSuccessStory = {
  id: string
  slug: string
  name: string
  photoUrl: string | null
  linkedInUrl: string | null
  domain: string | null
  domainCategory: string | null
  jobRole: string | null
  achievementType: string | null
  achievementTitle: string | null
  quantifiedResult: string | null
  storySummary: string | null
  shortSummary: string | null
  testimonialQuote: string | null
  youtubeVideoUrl: string | null
  sourceSheet: string
  sourceRow: number
  sourceDate: string | null
  auditStatus: string | null
  publicationStatus: PublicationStatus
  featured: boolean
  displayOrder: number | null
  updatedAt?: string
  email?: string
}

export type PrivateSuccessStory = PublicSuccessStory & {
  email: string | null
  emailPublishAllowed: boolean
}

export type StorySort = 'featured' | 'alphabetical' | 'recent'
