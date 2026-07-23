import { Copy, Download, RefreshCw } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { RiskBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { copyText, downloadText } from '@/lib/download';
import { useToast } from '@/store/toastStore';
import type { ReportResponse } from '@/types/api';

interface ReportViewProps {
  report: ReportResponse;
  onRegenerate?: () => void;
  regenerating?: boolean;
}

/** Rendered Markdown medical report with copy/download/regenerate actions. */
export function ReportView({ report, onRegenerate, regenerating }: ReportViewProps) {
  const toast = useToast();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RiskBadge level={report.risk_level} />
          <span className="text-xs text-slate-500">via {report.llm_provider}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              const ok = await copyText(report.content_markdown);
              if (ok) toast.success('Report copied');
              else toast.error('Copy failed');
            }}
          >
            <Copy size={14} /> Copy
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadText(`report-${report.prediction_id}.md`, report.content_markdown)}
          >
            <Download size={14} /> Download
          </Button>
          {onRegenerate && (
            <Button variant="ghost" size="sm" onClick={onRegenerate} loading={regenerating}>
              <RefreshCw size={14} /> Regenerate
            </Button>
          )}
        </div>
      </div>
      <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-brand-600 dark:prose-headings:text-brand-300">
        <Markdown remarkPlugins={[remarkGfm]}>{report.content_markdown}</Markdown>
      </article>
    </div>
  );
}
