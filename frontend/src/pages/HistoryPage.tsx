import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ScanLine } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge, ClassBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { useHistory } from '@/hooks/usePredictions';
import { formatDate, percent } from '@/lib/utils';

export function HistoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useHistory(page, 12);

  return (
    <PageTransition>
      <PageHeader
        title="Prediction History"
        description="Every chest X-ray you have analysed."
        action={<Link to="/predict"><Button><ScanLine size={18} /> New</Button></Link>}
      />

      <Card>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : isError ? (
          <ErrorState title="Could not load history" description="Please try again shortly." />
        ) : data && data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-slate-200/60 dark:divide-white/10">
              {data.items.map((item, index) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                >
                  <Link to={`/history/${item.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3.5 transition hover:opacity-80">
                    <div className="flex items-center gap-3">
                      <ClassBadge label={item.predicted_class} />
                      {item.ood_flag && <Badge tone="amber">OOD</Badge>}
                      <span className="text-sm text-slate-500">{percent(item.confidence)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400">{item.model_arch}</span>
                      <span className="text-xs text-slate-400">{formatDate(item.created_at)}</span>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <span>Page {data.page} of {Math.max(data.pages, 1)} · {data.total} total</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={16} /> Prev
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title="No predictions yet"
            description="Your analysed scans will appear here."
            action={<Link to="/predict"><Button size="sm">Run a prediction</Button></Link>}
          />
        )}
      </Card>
    </PageTransition>
  );
}
