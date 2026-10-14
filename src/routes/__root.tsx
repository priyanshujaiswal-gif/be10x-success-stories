import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { Layout } from '../components/Layout'
import '../index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        name: 'description',
        content:
          'Real People. Real Skills. Real Results. Explore verified be10X learner achievements.',
      },
      { name: 'theme-color', content: '#106cf7' },
      { property: 'og:title', content: 'be10X Success Stories' },
      { property: 'og:type', content: 'website' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'canonical', href: 'https://success-stories.be10x.com/' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Layout />
        </ErrorBoundary>
      </QueryClientProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <title>be10X Success Stories</title>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
