import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';

/** 404 route. */
export function NotFoundPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return (
    <div className="app-gradient grid min-h-screen place-items-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card max-w-md p-10 text-center"
      >
        <p className="bg-gradient-to-r from-brand-500 to-teal-500 bg-clip-text text-6xl font-bold text-transparent">
          404
        </p>
        <h1 className="mt-3 text-lg font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-slate-500">
          The page you are looking for does not exist or has moved.
        </p>
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="mt-6 inline-block">
          <Button>
            <Home size={16} /> Back to {isAuthenticated ? 'dashboard' : 'home'}
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
