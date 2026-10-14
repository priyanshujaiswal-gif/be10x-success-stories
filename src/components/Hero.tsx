import { ChevronDown } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-brand-border">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(16,108,247,0.25), transparent), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(16,108,247,0.1), transparent)',
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
          Real learners. Real achievements.
        </p>
        <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
          Where Learners Turn{' '}
          <span className="text-gradient-brand">Skills Into Wins.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-white/70 sm:text-lg">
          Measurable career and productivity outcomes from be10X learners.
        </p>
        <a
          href="#directory"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-blue px-6 py-3 font-display text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Explore Success Stories
          <ChevronDown className="h-5 w-5" aria-hidden />
        </a>
      </div>
    </section>
  )
}
