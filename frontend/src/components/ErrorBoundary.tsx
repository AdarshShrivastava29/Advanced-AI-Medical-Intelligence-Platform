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
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="glass-card max-w-md p-8 text-center">
            <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-slate-500">{this.state.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
