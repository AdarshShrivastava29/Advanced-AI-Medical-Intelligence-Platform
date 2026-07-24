import { Copy, Download, Printer, RefreshCw, Sparkles, Stethoscope } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { BrandMark } from '@/components/layout/Brand';
import { Badge, RiskBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { copyText, downloadText } from '@/lib/download';
import { CLINICAL_DISCLAIMER, ORG_NAME, ORG_UNIT } from '@/lib/platform';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/store/toastStore';
import type { ReportResponse } from '@/types/api';

interface ReportViewProps {
  report: ReportResponse;
  onRegenerate?: () => void;
  regenerating?: boolean;
  /** Study identifier printed in the document header. */
  studyId?: string;
  /** Model architecture/version printed in the document header. */
  modelLabel?: string;
}

/**
 * Renders the generated report as a hospital document: letterhead, study
 * metadata table, structured findings and a signature block. The `print-sheet`
 * class strips chrome for the browser print dialog (see styles/index.css).
 */
export function ReportView({
  report,
  onRegenerate,
  regenerating,
  studyId,
  modelLabel,
}: ReportViewProps) {
  const toast = useToast();

  const metadata: { label: string; value: string }[] = [
    { label: 'Study ID', value: (studyId ?? report.prediction_id).slice(0, 12).toUpperCase() },
    { label: 'Study date', value: formatDate(report.created_at) },
    { label: 'Modality', value: 'Chest radiograph (CXR)' },
    { label: 'Analysis model', value: modelLabel ?? '—' },
    { label: 'Report engine', value: `${report.llm_provider} · ${report.llm_model}` },
    { label: 'Patient', value: 'De-identified · not linked to PHI' },
  ];

  return (
    <div className="space-y-6">
      {/* ---- Action bar (never printed) ---- */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <RiskBadge level={report.risk_level} />
          <Badge tone="brand" size="sm">
            <Sparkles size={12} aria-hidden /> AI-drafted
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Copy size={14} />}
            onClick={async () => {
              const ok = await copyText(report.content_markdown);
              if (ok) toast.success('Report copied to clipboard');
              else toast.error('Copy failed');
            }}
          >
            Copy
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Download size={14} />}
            onClick={() => downloadText(`report-${report.prediction_id}.md`, report.content_markdown)}
          >
            Download
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Printer size={14} />}
            onClick={() => window.print()}
          >
            Print
          </Button>
          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              loading={regenerating}
              leadingIcon={<RefreshCw size={14} />}
            >
              Regenerate
            </Button>
          )}
        </div>
      </div>

      {/* ---- Document ---- */}
      <article className="print-sheet rounded-2xl border border-line bg-surface p-6 sm:p-8">
        {/* Letterhead */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-brand-700 pb-6 dark:border-accent-400">
          <div className="flex items-center gap-3">
            <BrandMark size="lg" />
            <div>
              <p className="font-display text-lg font-bold leading-tight text-fg">{ORG_NAME}</p>
              <p className="text-xs text-fg-muted">{ORG_UNIT}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="medical-label">Diagnostic imaging report</p>
            <p className="mt-1 font-display text-sm font-semibold text-fg">
              AI-Assisted Chest Radiograph Analysis
            </p>
            <p className="mt-0.5 text-xs text-fg-subtle">{formatDate(report.created_at)}</p>
          </div>
        </header>

        {/* Study metadata */}
        <dl className="grid gap-x-8 gap-y-3 border-b border-line py-6 sm:grid-cols-2 lg:grid-cols-3">
          {metadata.map((entry) => (
            <div key={entry.label}>
              <dt className="medical-label">{entry.label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-fg">{entry.value}</dd>
            </div>
          ))}
        </dl>

        {/* Risk banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
          <div className="flex items-center gap-3">
            <Stethoscope size={18} className="text-fg-subtle" aria-hidden />
            <span className="text-sm font-medium text-fg-muted">Assessed risk level</span>
          </div>
          <RiskBadge level={report.risk_level} />
        </div>

        {/* Findings */}
        <div className="py-6">
          <p className="medical-label mb-3">Clinical findings &amp; assessment</p>
          <div
            className="prose prose-sm max-w-none text-fg
              prose-headings:font-display prose-headings:text-fg prose-headings:tracking-tight
              prose-h1:text-lg prose-h2:mt-6 prose-h2:text-base prose-h2:border-b prose-h2:border-line prose-h2:pb-1.5
              prose-h3:text-sm prose-h3:uppercase prose-h3:tracking-wider prose-h3:text-fg-muted
              prose-p:leading-relaxed prose-p:text-fg-muted
              prose-strong:text-fg
              prose-li:text-fg-muted prose-li:marker:text-brand-700
              prose-table:text-sm prose-th:text-fg prose-td:text-fg-muted
              dark:prose-invert dark:prose-li:marker:text-accent-400"
          >
            <Markdown remarkPlugins={[remarkGfm]}>{report.content_markdown}</Markdown>
          </div>
        </div>

        {/* Signature / review block */}
        <footer className="space-y-4 border-t border-line pt-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="medical-label">Prepared by</p>
              <p className="mt-2 text-sm font-medium text-fg">
                AIMIP automated analysis ({report.llm_provider})
              </p>
              <p className="text-xs text-fg-subtle">Generated {formatDate(report.created_at)}</p>
            </div>
            <div>
              <p className="medical-label">Reviewed by</p>
              <div className="mt-4 border-b border-dashed border-line-strong" />
              <p className="mt-2 text-xs text-fg-subtle">
                Reporting clinician — signature &amp; date
              </p>
            </div>
          </div>

          <p className="rounded-lg bg-surface-muted p-3 text-[11px] leading-relaxed text-fg-subtle">
            <strong className="font-semibold text-fg-muted">Disclaimer.</strong> {CLINICAL_DISCLAIMER}{' '}
            This document is unsigned until countersigned by the reporting clinician above.
          </p>
        </footer>
      </article>
    </div>
  );
}
