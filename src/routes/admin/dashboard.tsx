import { createFileRoute, redirect } from '@tanstack/react-router'
import { ADMIN_STORIES_PATH } from '../../lib/adminRoutes'

export const Route = createFileRoute('/admin/dashboard')({
  beforeLoad: () => {
    throw redirect({ to: ADMIN_STORIES_PATH })
  },
})
