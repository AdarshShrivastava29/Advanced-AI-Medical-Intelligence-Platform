import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

// Top-level error boundary so a render error shows a recoverable UI rather than a
// blank screen (see docs/08_Frontend_Architecture.md, docs/21_UI_UX_Guidelines.md).
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // In production this would forward to an observability sink.
    console.error('Unhandled UI error', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="app-gradient flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-[28px] border border-line bg-surface p-8 text-center elevation-4 sm:p-10">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-danger-500/10 text-danger-600 ring-1 ring-inset ring-danger-500/20 dark:text-danger-400">
              <TriangleAlert size={28} aria-hidden />
            </span>

            <p className="medical-label mt-6">Application error</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-fg">Something went wrong</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-fg-muted">
              The interface hit an unexpected error and stopped rendering. Your data is unaffected —
              reloading usually clears it.
            </p>

            {this.state.message && (
              <p className="mx-auto mt-4 max-w-sm break-words rounded-lg bg-surface-sunken px-3 py-2 font-mono text-[11px] text-fg-subtle">
                {this.state.message}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-800"
              >
                <RefreshCw size={16} aria-hidden /> Reload the application
              </button>
              <a
                href="/"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-fg transition hover:bg-surface-muted"
              >
                Return home
              </a>
            </div>

            <p className="mt-6 border-t border-line pt-6 text-xs text-fg-subtle">
              If this keeps happening, report it to your platform administrator with the message
              above.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
