import { Link } from 'react-router-dom';

// 404 route (see docs/21_UI_UX_Guidelines.md).
export function NotFoundPage() {
  return (
    <div className="glass-card mx-auto max-w-md p-10 text-center">
      <p className="text-5xl font-bold text-brand-500">404</p>
      <h1 className="mt-2 text-lg font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500">
        The page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="mt-5 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
      >
        Back to status
      </Link>
    </div>
  );
}
