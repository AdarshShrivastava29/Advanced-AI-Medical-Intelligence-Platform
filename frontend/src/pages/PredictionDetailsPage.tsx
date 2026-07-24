import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { PredictionResult } from '@/components/prediction/PredictionResult';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageTransition } from '@/components/ui/PageTransition';
import { usePrediction, useRegenerateReport } from '@/hooks/usePredictions';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/store/toastStore';

export function PredictionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { data, isLoading, isError, refetch } = usePrediction(id);
  const regenerate = useRegenerateReport(id ?? '');

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Archived study"
        title={data ? `Study ${data.id.slice(0, 8).toUpperCase()}` : 'Study record'}
        description={
          data
            ? `Analysed ${formatDate(data.created_at)} · ${data.model_arch} ${data.model_version}`
            : 'Retrieving the archived analysis for this radiograph.'
        }
        breadcrumbs={[{ label: 'Study history', to: '/history' }, { label: 'Record' }]}
        action={
          <Link to="/history">
            <Button variant="secondary" leadingIcon={<ArrowLeft size={16} />}>
              Back to history
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="space-y-5">
          <Skeleton className="h-56 rounded-2xl" />
          <div className="grid gap-5 xl:grid-cols-5">
            <Skeleton className="h-[30rem] rounded-2xl xl:col-span-3" />
            <Skeleton className="h-[30rem] rounded-2xl xl:col-span-2" />
          </div>
        </div>
      ) : isError || !data ? (
        <Card>
          <ErrorState
            title="Study not found"
            description="This record may have been removed, or it belongs to another clinician's worklist."
            detail={id ? `Study ID: ${id}` : undefined}
            action={
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                  Try again
                </Button>
                <Link to="/history">
                  <Button size="sm">Back to history</Button>
                </Link>
              </div>
            }
          />
        </Card>
      ) : (
        <PredictionResult
          prediction={data}
          onRegenerateReport={async () => {
            try {
              await regenerate.mutateAsync();
              toast.success('Report regenerated');
            } catch {
              toast.error('Could not regenerate the report');
            }
          }}
          regenerating={regenerate.isPending}
        />
      )}
    </PageTransition>
  );
}
