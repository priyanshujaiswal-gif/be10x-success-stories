import { createFileRoute } from '@tanstack/react-router'
import { StoryDetailPage } from '../../pages/StoryDetailPage'

export const Route = createFileRoute('/success-stories/$slug')({
  component: StoryDetailPage,
})
