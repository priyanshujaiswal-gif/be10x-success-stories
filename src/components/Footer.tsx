import { BRAND_NAME } from './BrandMark'
import { SiteLogo } from './SiteLogo'

export function Footer() {
  return (
    <footer className="border-t border-brand-border bg-brand-black">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <SiteLogo showTagline />
          <p className="mt-2 text-sm text-brand-muted">Real outcomes from {BRAND_NAME} learners.</p>
        </div>
        <div className="flex flex-col gap-1 text-sm text-brand-muted sm:text-right">
          <a href="https://be10x.com/" className="transition-colors hover:text-white" target="_blank" rel="noreferrer">
            be10x.com
          </a>
          <a
            href="https://www.linkedin.com/company/be10x/"
            className="transition-colors hover:text-white"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </a>
          <p>© {new Date().getFullYear()} be10X. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
