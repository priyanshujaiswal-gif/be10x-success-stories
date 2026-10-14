import { createFileRoute, redirect } from '@tanstack/react-router'
import { ADMIN_SIGN_IN_PATH } from '../../lib/adminRoutes'

export const Route = createFileRoute('/admin/')({
  beforeLoad: () => {
    throw redirect({ to: ADMIN_SIGN_IN_PATH })
  },
})
