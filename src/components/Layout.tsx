import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { BRAND_NAME } from './BrandMark'
import { Footer } from './Footer'
import { ADMIN_SIGN_IN_PATH } from '../lib/adminRoutes'
import { SiteLogo } from './SiteLogo'

const navLinkClass = (isActive: boolean) =>
  `text-sm font-medium transition-colors hover:text-brand-blue ${
    isActive ? 'text-brand-blue' : 'text-white/80'
  }`

export function Layout() {
  const [scrolled, setScrolled] = useState(false)
  const location = useRouterState({ select: (s) => s.location })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.title =
      location.pathname.startsWith('/success-stories/')
        ? `Success Story | ${BRAND_NAME}`
        : location.pathname.startsWith('/admin')
          ? `Admin | ${BRAND_NAME} Success Stories`
          : `${BRAND_NAME} Success Stories`
  }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? 'border-brand-border bg-brand-black/85 backdrop-blur-md'
            : 'border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <SiteLogo />
          <nav className="flex items-center gap-6 sm:gap-8" aria-label="Main">
            <Link
              to="/"
              className={navLinkClass(location.pathname === '/')}
            >
              Success Stories
            </Link>
            <a href="#directory" className="text-sm font-medium text-white/80 transition-colors hover:text-brand-blue">
              Explore Achievements
            </a>
            <Link
              to={ADMIN_SIGN_IN_PATH}
              className={navLinkClass(location.pathname.startsWith('/admin'))}
            >
              Admin sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
