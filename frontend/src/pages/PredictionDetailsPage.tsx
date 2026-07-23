import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { PredictionResult } from '@/components/prediction/PredictionResult';
import { Button } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageTransition } from '@/components/ui/PageTransition';
import { usePrediction, useRegenerateReport } from '@/hooks/usePredictions';
import { useToast } from '@/store/toastStore';

export function PredictionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { data, isLoading, isError } = usePrediction(id);
  const regenerate = useRegenerateReport(id ?? '');

  return (
    <PageTransition>
      <div className="mb-6">
        <Link to="/history">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /> Back to history</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-28 rounded-2xl" />
          <div className="grid gap-6 lg:grid-cols-5">
            <Skeleton className="h-80 rounded-2xl lg:col-span-3" />
            <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          </div>
        </div>
      ) : isError || !data ? (
        <ErrorState
          title="Prediction not found"
          description="It may have been removed or you may not have access."
          action={<Link to="/history"><Button size="sm">Back to history</Button></Link>}
        />
      ) : (
        <PredictionResult
          prediction={data}
          onRegenerateReport={async () => {
            try {
              await regenerate.mutateAsync();
              toast.success('Report regenerated');
            } catch {
              toast.error('Could not regenerate report');
            }
          }}
          regenerating={regenerate.isPending}
        />
      )}
    </PageTransition>
  );
}
