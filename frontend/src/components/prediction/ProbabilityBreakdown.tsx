import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter';

interface ProbabilityBreakdownProps {
  probabilities: Record<string, number>;
  predictedClass: string;
}

/** Per-class probability meters, highlighting the predicted class. */
export function ProbabilityBreakdown({ probabilities, predictedClass }: ProbabilityBreakdownProps) {
  const entries = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-4">
      {entries.map(([label, value]) => (
        <ConfidenceMeter
          key={label}
          label={label}
          value={value}
          tone={
            label === predictedClass
              ? label.toUpperCase() === 'PNEUMONIA'
                ? 'red'
                : 'green'
              : 'brand'
          }
        />
      ))}
    </div>
  );
}
