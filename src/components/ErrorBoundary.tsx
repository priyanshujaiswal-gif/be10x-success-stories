import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-white/70">Please refresh the page or try again later.</p>
        </div>
      )
    }
    return this.props.children
  }
}
